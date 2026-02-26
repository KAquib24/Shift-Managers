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
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found in your company")
    
    # Check for overlapping shifts
    overlapping = db.query(Shift).filter(
        Shift.employee_id == shift_data.employee_id,
        Shift.status != ShiftStatus.CANCELLED,
        Shift.start_time < shift_data.end_time,
        Shift.end_time > shift_data.start_time
    ).first()
    
    if overlapping:
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
    if week_start:
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
    
    if department:
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
            date_str = day_date.strftime("%Y-%m-%d")  # Use date string instead of day name
            day_name = day_date.strftime("%a")
            
            day_shifts = [
                {
                    "id": s.id,
                    "title": s.title,
                    "start": s.start_time.strftime("%H:%M"),
                    "end": s.end_time.strftime("%H:%M"),
                    "status": s.status.value if s.status else None,
                    "is_late": s.is_late,
                    "location": s.location
                }
                for s in employee_shifts
                if s.start_time.date() == day_date.date()
            ]
            
            # Store by date string for easier frontend matching
            shifts_by_day[date_str] = day_shifts
        
        # Determine employee status
        is_on_shift = any(
            shift.get("status") == ShiftStatus.IN_PROGRESS.value
            for shifts in shifts_by_day.values()
            for shift in shifts
        )
        
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
    
    if start_date:
        query = query.filter(Shift.start_time >= datetime.fromisoformat(start_date))
    if end_date:
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
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    now = clock_data.time or datetime.now()
    
    if clock_data.action == "clock_in":
        # Check if already clocked in using SQLAlchemy column
        if shift.clock_in_time is not None:
            raise HTTPException(status_code=400, detail="Already clocked in")
        
        # Update using SQLAlchemy model attributes
        shift.clock_in_time = now
        shift.status = ShiftStatus.IN_PROGRESS
        shift.clock_in_method = "manual"
        
        # Check if late
        scheduled_start = shift.start_time
        if now > scheduled_start:
            late_minutes = int((now - scheduled_start).total_seconds() / 60)
            shift.is_late = True
            shift.late_minutes = late_minutes
    
    elif clock_data.action == "clock_out":
        # Check conditions using SQLAlchemy column
        if shift.clock_in_time is None:
            raise HTTPException(status_code=400, detail="Not clocked in yet")
        if shift.clock_out_time is not None:
            raise HTTPException(status_code=400, detail="Already clocked out")
        
        shift.clock_out_time = now
        shift.status = ShiftStatus.COMPLETED
        
        # Calculate actual hours
        if shift.clock_in_time is not None:
            hours = (now - shift.clock_in_time).total_seconds() / 3600
            shift.actual_hours = round(hours, 2)
    
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
    
    if not shift:
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
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    shift.status = ShiftStatus.CANCELLED
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
            
            if not employee:
                errors.append(f"Employee {shift_data.employee_id} not found")
                continue
            
            # Check for overlapping shifts
            overlapping = db.query(Shift).filter(
                Shift.employee_id == shift_data.employee_id,
                Shift.status != ShiftStatus.CANCELLED,
                Shift.start_time < shift_data.end_time,
                Shift.end_time > shift_data.start_time
            ).first()
            
            if overlapping:
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