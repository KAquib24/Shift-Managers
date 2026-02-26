from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import List, Optional
from datetime import datetime, timedelta, date
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.shift import Shift, ShiftStatus
from app.models.leave import LeaveRequest, LeaveStatus
from app.schemas.leave import LeaveCreate, LeaveResponse, LeaveUpdate, LeaveListResponse
from app.schemas.report import (
    EmployeeMonthlyReport, 
    EmployeeReportResponse
)
from app.utils.auth import get_current_active_user, require_role
import calendar

router = APIRouter(prefix="/leave", tags=["Leave"])

# ============================================
# 1️⃣ REQUEST LEAVE (Employee)
# ============================================
@router.post("/request", response_model=LeaveResponse)
async def request_leave(
    leave_data: LeaveCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Employee requests leave"""
    
    # Validate dates
    if leave_data.start_date > leave_data.end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date")
    
    if leave_data.start_date < datetime.now().date():
        raise HTTPException(status_code=400, detail="Cannot request leave for past dates")
    
    # Check if already has leave in this period
    existing = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == current_user.id,
        LeaveRequest.start_date <= leave_data.end_date,
        LeaveRequest.end_date >= leave_data.start_date,
        LeaveRequest.status.in_([LeaveStatus.PENDING, LeaveStatus.APPROVED])
    ).first()
    
    if existing is not None:
        raise HTTPException(
            status_code=400, 
            detail="You already have a pending or approved leave request in this period"
        )
    
    # Create leave request
    leave = LeaveRequest(
        employee_id=current_user.id,
        company_id=current_user.company_id,
        start_date=leave_data.start_date,
        end_date=leave_data.end_date,
        reason=leave_data.reason,
        status=LeaveStatus.PENDING
    )
    
    db.add(leave)
    db.commit()
    db.refresh(leave)
    
    # Add employee name
    setattr(leave, "employee_name", current_user.full_name)
    
    return leave

# ============================================
# 2️⃣ GET MY LEAVE REQUESTS (Employee)
# ============================================
@router.get("/my-requests", response_model=List[LeaveResponse])
async def get_my_leave_requests(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's leave requests"""
    
    query = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == current_user.id
    )
    
    if status is not None:
        query = query.filter(LeaveRequest.status == status)
    
    leaves = query.order_by(LeaveRequest.created_at.desc()).all()
    
    # Add employee name
    result = []
    for leave in leaves:
        setattr(leave, "employee_name", current_user.full_name)
        result.append(leave)
    
    return result

# ============================================
# 3️⃣ GET PENDING LEAVES (Admin)
# ============================================
@router.get("/pending", response_model=List[LeaveResponse])
async def get_pending_leaves(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Admin views pending leave requests"""
    
    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.company_id == current_user.company_id,
        LeaveRequest.status == LeaveStatus.PENDING
    ).order_by(LeaveRequest.created_at.asc()).all()
    
    # Add employee names
    result = []
    for leave in leaves:
        employee = db.query(User).filter(User.id == leave.employee_id).first()
        employee_name = employee.full_name if employee is not None else "Unknown"
        setattr(leave, "employee_name", employee_name)
        result.append(leave)
    
    return result

# ============================================
# 4️⃣ GET ALL LEAVE REQUESTS (Admin with filters)
# ============================================
@router.get("/all", response_model=LeaveListResponse)
async def get_all_leaves(
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    employee_id: Optional[int] = None,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Admin views all leave requests with filters"""
    
    query = db.query(LeaveRequest).filter(
        LeaveRequest.company_id == current_user.company_id
    )
    
    if status is not None:
        query = query.filter(LeaveRequest.status == status)
    
    if start_date is not None:
        query = query.filter(LeaveRequest.start_date >= start_date)
    
    if end_date is not None:
        query = query.filter(LeaveRequest.end_date <= end_date)
    
    if employee_id is not None:
        query = query.filter(LeaveRequest.employee_id == employee_id)
    
    leaves = query.order_by(LeaveRequest.created_at.desc()).all()
    
    # Add employee names and count stats
    result = []
    for leave in leaves:
        employee = db.query(User).filter(User.id == leave.employee_id).first()
        employee_name = employee.full_name if employee is not None else "Unknown"
        setattr(leave, "employee_name", employee_name)
        result.append(leave)
    
    # Calculate stats
    total = len(result)
    pending = 0
    approved = 0
    rejected = 0
    
    for leave in result:
        if leave.status == LeaveStatus.PENDING:
            pending += 1
        elif leave.status == LeaveStatus.APPROVED:
            approved += 1
        elif leave.status == LeaveStatus.REJECTED:
            rejected += 1
    
    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "leaves": result
    }

# ============================================
# 5️⃣ APPROVE/REJECT LEAVE (Admin)
# ============================================
@router.patch("/{leave_id}")
async def update_leave_status(
    leave_id: int,
    update_data: LeaveUpdate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Admin approves or rejects leave"""
    
    leave = db.query(LeaveRequest).filter(
        LeaveRequest.id == leave_id,
        LeaveRequest.company_id == current_user.company_id
    ).first()
    
    if leave is None:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if leave.status != LeaveStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Leave already {leave.status.value}")
    
    # Update status
    if update_data.status == "approved":
        setattr(leave, "status", LeaveStatus.APPROVED)
    elif update_data.status == "rejected":
        setattr(leave, "status", LeaveStatus.REJECTED)
    else:
        raise HTTPException(status_code=400, detail="Invalid status. Use 'approved' or 'rejected'")
    
    setattr(leave, "reviewed_by", current_user.id)
    setattr(leave, "reviewed_at", datetime.now())
    
    # If approved, auto-remove shifts during leave period
    if leave.status == LeaveStatus.APPROVED:
        shifts = db.query(Shift).filter(
            Shift.employee_id == leave.employee_id,
            Shift.start_time >= datetime.combine(leave.start_date, datetime.min.time()),
            Shift.end_time <= datetime.combine(leave.end_date, datetime.max.time()),
            Shift.status == ShiftStatus.SCHEDULED
        ).all()
        
        for shift in shifts:
            setattr(shift, "status", ShiftStatus.CANCELLED)
            setattr(shift, "notes", f"Cancelled due to leave (approved on {datetime.now().date()})")
    
    db.commit()
    
    return {
        "message": f"Leave {leave.status.value} successfully",
        "leave_id": leave.id,
        "status": leave.status.value
    }

# ============================================
# 6️⃣ CANCEL LEAVE REQUEST (Employee)
# ============================================
@router.post("/{leave_id}/cancel")
async def cancel_leave_request(
    leave_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Employee cancels their pending leave request"""
    
    leave = db.query(LeaveRequest).filter(
        LeaveRequest.id == leave_id,
        LeaveRequest.employee_id == current_user.id
    ).first()
    
    if leave is None:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if leave.status != LeaveStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot cancel {leave.status.value} leave")
    
    setattr(leave, "status", LeaveStatus.CANCELLED)
    
    db.commit()
    
    return {"message": "Leave request cancelled successfully"}

# ============================================
# 7️⃣ GET LEAVE SUMMARY (Dashboard)
# ============================================
@router.get("/summary")
async def get_leave_summary(
    year: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get leave summary for dashboard"""
    
    if year is None:
        year = datetime.now().year
    
    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)
    
    # Get all leaves for the company
    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.company_id == current_user.company_id,
        LeaveRequest.start_date >= start_date,
        LeaveRequest.end_date <= end_date
    ).all()
    
    # Calculate stats
    total_requests = len(leaves)
    approved = 0
    pending = 0
    rejected = 0
    total_days = 0
    
    for leave in leaves:
        if leave.status == LeaveStatus.APPROVED:
            approved += 1
            days = (leave.end_date - leave.start_date).days + 1
            total_days += days
        elif leave.status == LeaveStatus.PENDING:
            pending += 1
        elif leave.status == LeaveStatus.REJECTED:
            rejected += 1
    
    return {
        "year": year,
        "total_requests": total_requests,
        "approved": approved,
        "pending": pending,
        "rejected": rejected,
        "total_days": total_days
    }

# ============================================
# 8️⃣ EMPLOYEE MONTHLY REPORT (INDIVIDUAL)
# ============================================
@router.get("/employee-report/{employee_id}", response_model=EmployeeReportResponse)
async def get_employee_monthly_report(
    employee_id: int,
    month: Optional[int] = Query(None, description="Month (1-12)"),
    year: Optional[int] = Query(None, description="Year (e.g., 2026)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed monthly report for a specific employee
    """
    
    # Check if user has permission (admin or the employee themselves)
    if current_user.role != UserRole.ADMIN and current_user.id != employee_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this report")
    
    # Get employee details
    employee = db.query(User).filter(
        User.id == employee_id,
        User.company_id == current_user.company_id
    ).first()
    
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Set default month/year to current if not provided
    if month is None:
        month = datetime.now().month
    if year is None:
        year = datetime.now().year
    
    # Calculate date range for the month
    start_date = datetime(year, month, 1, 0, 0, 0)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, 23, 59, 59) - timedelta(days=1)
    else:
        end_date = datetime(year, month + 1, 1, 23, 59, 59) - timedelta(days=1)
    
    # Get all shifts for the employee in this month
    shifts = db.query(Shift).filter(
        Shift.employee_id == employee_id,
        Shift.start_time >= start_date,
        Shift.end_time <= end_date,
        Shift.status.in_([ShiftStatus.COMPLETED, ShiftStatus.IN_PROGRESS])
    ).order_by(Shift.start_time).all()
    
    # Get all leave requests for the employee in this month
    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == employee_id,
        LeaveRequest.start_date >= start_date.date(),
        LeaveRequest.end_date <= end_date.date(),
        LeaveRequest.status == LeaveStatus.APPROVED
    ).all()
    
    # Calculate statistics
    total_seconds = 0
    total_late_minutes = 0
    late_days = 0
    overtime_days = 0
    attendance_days = set()
    
    daily_breakdown = []
    
    # Process each day of the month
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        day_shifts = [s for s in shifts if s.start_time.date() == current_date.date()]
        
        if day_shifts:
            # Calculate daily hours
            daily_seconds = 0
            daily_late = False
            daily_overtime = False
            
            for shift in day_shifts:
                if shift.clock_in_time is not None and shift.clock_out_time is not None:
                    seconds = (shift.clock_out_time - shift.clock_in_time).total_seconds()
                    daily_seconds += seconds
                    
                    if shift.is_late:
                        daily_late = True
                        total_late_minutes += shift.late_minutes or 0
                    
                    if shift.clock_out_time > shift.end_time:
                        daily_overtime = True
            
            if daily_seconds > 0:
                attendance_days.add(date_str)
                total_seconds += daily_seconds
                
                if daily_late:
                    late_days += 1
                if daily_overtime:
                    overtime_days += 1
                
                daily_breakdown.append({
                    "date": date_str,
                    "day_name": current_date.strftime("%A"),
                    "hours": round(daily_seconds / 3600, 2),
                    "minutes": int(daily_seconds / 60),
                    "shifts": len(day_shifts),
                    "late": daily_late,
                    "overtime": daily_overtime
                })
        
        current_date += timedelta(days=1)
    
    # Calculate leave days in this month
    leave_days = 0
    for leave in leaves:
        start = max(leave.start_date, start_date.date())
        end = min(leave.end_date, end_date.date())
        days = (end - start).days + 1
        leave_days += days
    
    total_hours = total_seconds / 3600
    total_minutes = int(total_seconds / 60)
    
    return {
        "employee": {
            "id": employee.id,
            "name": employee.full_name,
            "department": getattr(employee, "department", None),
            "position": getattr(employee, "position", ""),
        },
        "period": {
            "month": month,
            "year": year,
            "month_name": calendar.month_name[month],
            "start_date": start_date.date().isoformat(),
            "end_date": end_date.date().isoformat()
        },
        "summary": {
            "total_days_in_month": (end_date - start_date).days + 1,
            "attendance_days": len(attendance_days),
            "leave_days": leave_days,
            "absent_days": (end_date - start_date).days + 1 - len(attendance_days) - leave_days,
            "total_hours": round(total_hours, 2),
            "total_minutes": total_minutes,
            "average_hours_per_day": round(total_hours / len(attendance_days), 2) if attendance_days else 0,
            "late_arrivals": late_days,
            "overtime_days": overtime_days,
            "total_late_minutes": total_late_minutes
        },
        "daily_breakdown": daily_breakdown
    }

# ============================================
# 9️⃣ GET ALL EMPLOYEES REPORT (Admin only)
# ============================================
@router.get("/all-employees-report")
async def get_all_employees_monthly_report(
    month: Optional[int] = Query(None, description="Month (1-12)"),
    year: Optional[int] = Query(None, description="Year (e.g., 2026)"),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Get monthly reports for all employees (Admin only)"""
    
    # Set default month/year to current if not provided
    if month is None:
        month = datetime.now().month
    if year is None:
        year = datetime.now().year
    
    # Get all employees in company
    employees = db.query(User).filter(
        User.company_id == current_user.company_id,
        User.role == UserRole.EMPLOYEE,
        User.is_active == True
    ).all()
    
    reports = []
    
    for employee in employees:
        # Get report for each employee using the existing function
        report = await get_employee_monthly_report(
            employee_id=employee.id,
            month=month,
            year=year,
            current_user=current_user,
            db=db
        )
        reports.append(report)
    
    # Calculate company totals
    total_hours = sum(r["summary"]["total_hours"] for r in reports)
    total_minutes = sum(r["summary"]["total_minutes"] for r in reports)
    total_late = sum(r["summary"]["late_arrivals"] for r in reports)
    total_overtime = sum(r["summary"]["overtime_days"] for r in reports)
    total_leave_days = sum(r["summary"]["leave_days"] for r in reports)
    
    return {
        "period": {
            "month": month,
            "year": year,
            "month_name": calendar.month_name[month]
        },
        "total_employees": len(employees),
        "company_totals": {
            "total_hours": round(total_hours, 2),
            "total_minutes": total_minutes,
            "total_late_arrivals": total_late,
            "total_overtime_days": total_overtime,
            "total_leave_days": total_leave_days
        },
        "employees": reports
    }

# ============================================
# 🔟 EXPORT EMPLOYEE REPORT TO EXCEL
# ============================================
@router.get("/export-employee-report/{employee_id}")
async def export_employee_report_excel(
    employee_id: int,
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export employee monthly report to Excel"""
    
    # Get the report data
    report = await get_employee_monthly_report(
        employee_id=employee_id,
        month=month,
        year=year,
        current_user=current_user,
        db=db
    )
    
    # Create Excel file
    import pandas as pd
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    
    # Create DataFrames
    summary_data = {
        "Metric": [
            "Employee Name",
            "Department",
            "Month",
            "Year",
            "Total Days in Month",
            "Attendance Days",
            "Leave Days",
            "Absent Days",
            "Total Hours Worked",
            "Total Minutes Worked",
            "Average Hours/Day",
            "Late Arrivals",
            "Overtime Days",
            "Total Late Minutes"
        ],
        "Value": [
            report["employee"]["name"],
            report["employee"]["department"] or "N/A",
            report["period"]["month_name"],
            str(report["period"]["year"]),
            str(report["summary"]["total_days_in_month"]),
            str(report["summary"]["attendance_days"]),
            str(report["summary"]["leave_days"]),
            str(report["summary"]["absent_days"]),
            f"{report['summary']['total_hours']} hrs",
            f"{report['summary']['total_minutes']} mins",
            f"{report['summary']['average_hours_per_day']} hrs",
            str(report["summary"]["late_arrivals"]),
            str(report["summary"]["overtime_days"]),
            f"{report['summary']['total_late_minutes']} mins"
        ]
    }
    
    daily_data = []
    for day in report["daily_breakdown"]:
        daily_data.append({
            "Date": day["date"],
            "Day": day["day_name"],
            "Hours": day["hours"],
            "Minutes": day["minutes"],
            "Shifts": day["shifts"],
            "Late": "Yes" if day["late"] else "No",
            "Overtime": "Yes" if day["overtime"] else "No"
        })
    
    # Create Excel file
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        pd.DataFrame(summary_data).to_excel(writer, sheet_name='Summary', index=False)
        pd.DataFrame(daily_data).to_excel(writer, sheet_name='Daily Breakdown', index=False)
    
    output.seek(0)
    
    filename = f"{report['employee']['name']}_{report['period']['month_name']}_{report['period']['year']}_report.xlsx"
    filename = filename.replace(" ", "_")
    
    return StreamingResponse(
        output,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )