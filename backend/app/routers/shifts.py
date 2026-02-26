from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import List, Optional
from datetime import datetime, timedelta, date
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.shift import Shift, ShiftStatus
from app.schemas.shift import ShiftCreate, ShiftResponse, ShiftUpdate, ClockInOut
from app.utils.auth import get_current_active_user, require_role
import pandas as pd
from io import BytesIO
from fastapi.responses import StreamingResponse
import openpyxl
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

router = APIRouter(prefix="/shifts", tags=["Shifts"])

# ============================================
# 1️⃣ CREATE SHIFT (Admin/Manager only)
# ============================================
@router.post("/", response_model=ShiftResponse)
async def create_shift(
    shift_data: ShiftCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Create a new shift (Admin/Manager only)"""
    
    # Verify employee belongs to same company
    employee = db.query(User).filter(
        User.id == shift_data.employee_id,
        User.company_id == current_user.company_id
    ).first()
    
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found in your company")
    
    # Check for overlapping shifts
    overlapping = db.query(Shift).filter(
        Shift.employee_id == shift_data.employee_id,
        Shift.status != ShiftStatus.CANCELLED,
        Shift.start_time < shift_data.end_time,
        Shift.end_time > shift_data.start_time
    ).first()
    
    if overlapping is not None:
        raise HTTPException(status_code=400, detail="Employee already has a shift during this time")
    
    # Create shift
    db_shift = Shift(
        **shift_data.model_dump(),
        company_id=current_user.company_id,
        created_by=current_user.id,
        status=ShiftStatus.SCHEDULED
    )
    
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    
    return db_shift

# ============================================
# 2️⃣ GET WEEKLY SCHEDULE (with employee details)
# ============================================
@router.get("/weekly", response_model=dict)
async def get_weekly_schedule(
    week_start: Optional[str] = None,
    department: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get weekly schedule - accessible by all users in company"""
    
    # Calculate week dates
    if week_start is not None:
        start_date = datetime.fromisoformat(week_start)
    else:
        # Get current week (Monday)
        today = datetime.now().date()
        start_date = datetime.combine(today - timedelta(days=today.weekday()), datetime.min.time())
    
    end_date = start_date + timedelta(days=6, hours=23, minutes=59)
    
    # Get all employees in company
    employees_query = db.query(User).filter(
        User.company_id == current_user.company_id,
        User.role == UserRole.EMPLOYEE,
        User.is_active == True
    )
    
    if department is not None:
        employees_query = employees_query.filter(User.department == department)
    
    employees = employees_query.all()
    
    # Get shifts for the week
    shifts_query = db.query(Shift).filter(
        Shift.company_id == current_user.company_id,
        Shift.start_time >= start_date,
        Shift.start_time <= end_date
    ).options(joinedload(Shift.employee))
    
    shifts = shifts_query.all()
    
    # Group shifts by employee
    schedule = []
    
    for employee in employees:
        employee_shifts = [s for s in shifts if s.employee_id == employee.id]
        
        # Format shifts by day (Mon-Sun)
        shifts_by_day = {}
        
        for i in range(7):
            day_date = start_date + timedelta(days=i)
            date_str = day_date.strftime("%Y-%m-%d")
            
            day_shifts = []
            for s in employee_shifts:
                if s.start_time.date() == day_date.date():
                    day_shifts.append({
                        "id": s.id,
                        "title": s.title,
                        "start": s.start_time.strftime("%H:%M"),
                        "end": s.end_time.strftime("%H:%M"),
                        "status": s.status.value if s.status is not None else None,
                        "is_late": s.is_late,
                        "location": s.location
                    })
            
            shifts_by_day[date_str] = day_shifts
        
        # Determine employee status using actual values, not SQLAlchemy columns
        is_on_shift = False
        for date_key, day_shifts in shifts_by_day.items():
            for shift_dict in day_shifts:
                if shift_dict.get("status") == ShiftStatus.IN_PROGRESS.value:
                    is_on_shift = True
                    break
            if is_on_shift:
                break
        
        schedule.append({
            "employee_id": employee.id,
            "employee_name": employee.full_name,
            "position": getattr(employee, 'position', 'Employee'),
            "status": "On shift" if is_on_shift else "Off",
            "department": getattr(employee, "department", ""),
            "shifts": shifts_by_day
        })
    
    return {
        "week_start": start_date.isoformat(),
        "week_end": end_date.isoformat(),
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "schedule": schedule,
        "total_employees": len(employees)
    }

# ============================================
# 3️⃣ GET MY SHIFTS (Employee view)
# ============================================
@router.get("/my-shifts", response_model=List[ShiftResponse])
async def get_my_shifts(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's shifts"""
    
    query = db.query(Shift).filter(Shift.employee_id == current_user.id)
    
    if start_date is not None:
        query = query.filter(Shift.start_time >= datetime.fromisoformat(start_date))
    if end_date is not None:
        query = query.filter(Shift.end_time <= datetime.fromisoformat(end_date))
    
    shifts = query.order_by(Shift.start_time).all()
    
    # Add employee name
    for shift in shifts:
        shift.employee_name = current_user.full_name
    
    return shifts

# ============================================
# 4️⃣ CLOCK IN/OUT
# ============================================
@router.post("/clock")
async def clock_in_out(
    clock_data: ClockInOut,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Clock in or out from a shift"""
    
    shift = db.query(Shift).filter(
        Shift.id == clock_data.shift_id,
        Shift.employee_id == current_user.id
    ).first()
    
    if shift is None:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    now = clock_data.time or datetime.now()
    
    if clock_data.action == "clock_in":
        # Check if already clocked in
        if shift.clock_in_time is not None:
            raise HTTPException(status_code=400, detail="Already clocked in")
        
        # Update using SQLAlchemy model attributes
        setattr(shift, "clock_in_time", now)
        setattr(shift, "status", ShiftStatus.IN_PROGRESS)
        setattr(shift, "clock_in_method", "manual")
        
        # Check if late
        scheduled_start = shift.start_time
        if now > scheduled_start:
            late_minutes = int((now - scheduled_start).total_seconds() / 60)
            setattr(shift, "is_late", True)
            setattr(shift, "late_minutes", late_minutes)
    
    elif clock_data.action == "clock_out":
        # Check conditions
        if shift.clock_in_time is None:
            raise HTTPException(status_code=400, detail="Not clocked in yet")
        if shift.clock_out_time is not None:
            raise HTTPException(status_code=400, detail="Already clocked out")
        
        setattr(shift, "clock_out_time", now)
        setattr(shift, "status", ShiftStatus.COMPLETED)
        
        # Calculate actual hours
        if shift.clock_in_time is not None:
            hours = (now - shift.clock_in_time).total_seconds() / 3600
            setattr(shift, "actual_hours", round(hours, 2))
    
    db.commit()
    db.refresh(shift)
    
    return {"message": f"{clock_data.action} successful", "time": now}

# ============================================
# 5️⃣ UPDATE SHIFT (Admin only)
# ============================================
@router.put("/{shift_id}", response_model=ShiftResponse)
async def update_shift(
    shift_id: int,
    shift_data: ShiftUpdate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Update shift details"""
    
    shift = db.query(Shift).filter(
        Shift.id == shift_id,
        Shift.company_id == current_user.company_id
    ).first()
    
    if shift is None:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    for key, value in shift_data.model_dump(exclude_unset=True).items():
        setattr(shift, key, value)
    
    db.commit()
    db.refresh(shift)
    
    return shift

# ============================================
# 6️⃣ DELETE SHIFT (Admin only)
# ============================================
@router.delete("/{shift_id}")
async def delete_shift(
    shift_id: int,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Delete a shift (soft delete)"""
    
    shift = db.query(Shift).filter(
        Shift.id == shift_id,
        Shift.company_id == current_user.company_id
    ).first()
    
    if shift is None:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    setattr(shift, "status", ShiftStatus.CANCELLED)
    db.commit()
    
    return {"message": "Shift cancelled successfully"}

# ============================================
# 7️⃣ BULK CREATE SHIFTS
# ============================================
@router.post("/bulk")
async def create_bulk_shifts(
    shifts: List[ShiftCreate],
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Create multiple shifts at once"""
    
    created = []
    errors = []
    
    for shift_data in shifts:
        try:
            # Verify employee
            employee = db.query(User).filter(
                User.id == shift_data.employee_id,
                User.company_id == current_user.company_id
            ).first()
            
            if employee is None:
                errors.append(f"Employee {shift_data.employee_id} not found")
                continue
            
            # Check for overlapping shifts
            overlapping = db.query(Shift).filter(
                Shift.employee_id == shift_data.employee_id,
                Shift.status != ShiftStatus.CANCELLED,
                Shift.start_time < shift_data.end_time,
                Shift.end_time > shift_data.start_time
            ).first()
            
            if overlapping is not None:
                errors.append(f"Overlapping shift for employee {shift_data.employee_id}")
                continue
            
            db_shift = Shift(
                **shift_data.model_dump(),
                company_id=current_user.company_id,
                created_by=current_user.id,
                status=ShiftStatus.SCHEDULED
            )
            db.add(db_shift)
            created.append(shift_data.employee_id)
            
        except Exception as e:
            errors.append(str(e))
    
    db.commit()
    
    return {
        "message": f"Created {len(created)} shifts",
        "created": created,
        "errors": errors
    }

# ============================================
# 8️⃣ ATTENDANCE SUMMARY DASHBOARD
# ============================================
@router.get("/attendance-summary")
async def get_attendance_summary(
    period: str = Query("week", enum=["week", "month"]),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get attendance summary for dashboard"""
    
    # Calculate date range
    today = datetime.now().date()
    
    if period == "week":
        start_date = datetime.combine(today - timedelta(days=today.weekday()), datetime.min.time())
        end_date = start_date + timedelta(days=6, hours=23, minutes=59)
    else:  # month
        start_date = datetime.combine(today.replace(day=1), datetime.min.time())
        next_month = today.replace(day=28) + timedelta(days=4)
        end_date = datetime.combine(next_month - timedelta(days=next_month.day), datetime.max.time())
    
    # Get all completed shifts in period
    shifts = db.query(Shift).filter(
        Shift.company_id == current_user.company_id,
        Shift.start_time >= start_date,
        Shift.end_time <= end_date,
        Shift.status == ShiftStatus.COMPLETED
    ).all()
    
    total_hours = 0.0
    late_count = 0
    overtime_count = 0
    absent_count = 0
    
    # Get all employees count
    employees = db.query(User).filter(
        User.company_id == current_user.company_id,
        User.role == UserRole.EMPLOYEE,
        User.is_active == True
    ).count()
    
    for shift in shifts:
        # Calculate actual hours worked
        if shift.clock_in_time is not None and shift.clock_out_time is not None:
            hours = (shift.clock_out_time - shift.clock_in_time).total_seconds() / 3600
            total_hours += hours
        
        # Count late arrivals
        if shift.is_late:
            late_count += 1
        
        # Count overtime (worked more than scheduled)
        if shift.clock_out_time is not None and shift.end_time is not None:
            if shift.clock_out_time > shift.end_time:
                overtime_count += 1
    
    # Calculate absent employees (have shifts but didn't clock in)
    scheduled_shifts = db.query(Shift).filter(
        Shift.company_id == current_user.company_id,
        Shift.start_time >= start_date,
        Shift.end_time <= end_date,
        Shift.status == ShiftStatus.SCHEDULED
    ).all()
    
    for shift in scheduled_shifts:
        if shift.clock_in_time is None:
            absent_count += 1
    
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "metrics": {
            "total_hours": round(total_hours, 1),
            "total_employees": employees,
            "late_arrivals": late_count,
            "overtime": overtime_count,
            "absences": absent_count
        }
    }

# ============================================
# 9️⃣ EXPORT SCHEDULE TO EXCEL/PDF
# ============================================
# ============================================
# 9️⃣ EXPORT SCHEDULE TO EXCEL/PDF - FIXED
# ============================================
@router.get("/export")
async def export_schedule(
    week_start: Optional[str] = None,
    export_format: str = Query("excel", enum=["excel", "pdf"]),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export weekly schedule to Excel or PDF"""
    
    try:
        # Get schedule data
        if week_start is not None:
            start_date = datetime.fromisoformat(week_start)
        else:
            today = datetime.now().date()
            start_date = datetime.combine(today - timedelta(days=today.weekday()), datetime.min.time())
        
        end_date = start_date + timedelta(days=6, hours=23, minutes=59)
        
        # Get employees and shifts
        employees = db.query(User).filter(
            User.company_id == current_user.company_id,
            User.role == UserRole.EMPLOYEE
        ).all()
        
        shifts = db.query(Shift).filter(
            Shift.company_id == current_user.company_id,
            Shift.start_time >= start_date,
            Shift.start_time <= end_date
        ).all()
        
        # Prepare data for export
        data = []
        headers = ["Employee", "Department", "Date", "Shift", "Start", "End", "Status", "Late", "Hours"]
        data.append(headers)
        
        for employee in employees:
            employee_shifts = [s for s in shifts if s.employee_id == employee.id]
            
            if not employee_shifts:
                # Add empty row
                data.append([
                    employee.full_name,
                    getattr(employee, "department", "") or "",
                    "No shifts",
                    "",
                    "",
                    "",
                    "",
                    "",
                    ""
                ])
            else:
                for shift in employee_shifts:
                    # Calculate hours worked
                    hours_worked = ""
                    if shift.clock_in_time is not None and shift.clock_out_time is not None:
                        hours = (shift.clock_out_time - shift.clock_in_time).total_seconds() / 3600
                        hours_worked = f"{round(hours, 1)}h"
                    
                    data.append([
                        employee.full_name,
                        getattr(employee, "department", "") or "",
                        shift.start_time.strftime("%Y-%m-%d"),
                        shift.title,
                        shift.start_time.strftime("%H:%M"),
                        shift.end_time.strftime("%H:%M"),
                        shift.status.value if shift.status is not None else "",
                        "Yes" if shift.is_late else "No",
                        hours_worked
                    ])
        
        if export_format == "excel":
            # Create Excel file
            df = pd.DataFrame(data[1:], columns=data[0])
            output = BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Schedule', index=False)
            
            output.seek(0)
            
            return StreamingResponse(
                output,
                media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                headers={
                    'Content-Disposition': f'attachment; filename="schedule_{start_date.strftime("%Y%m%d")}.xlsx"',
                    'Access-Control-Expose-Headers': 'Content-Disposition'
                }
            )
        
        else:  # PDF
            # Create PDF
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
            elements = []
            
            # Add title
            styles = getSampleStyleSheet()
            title = f"Schedule {start_date.strftime('%b %d')} - {end_date.strftime('%b %d, %Y')}"
            elements.append(Paragraph(title, styles['Title']))
            
            # Create table
            table = Table(data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            elements.append(table)
            doc.build(elements)
            
            buffer.seek(0)
            
            return StreamingResponse(
                buffer,
                media_type='application/pdf',
                headers={
                    'Content-Disposition': f'attachment; filename="schedule_{start_date.strftime("%Y%m%d")}.pdf"',
                    'Access-Control-Expose-Headers': 'Content-Disposition'
                }
            )
    except Exception as e:
        print(f"❌ Export error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")