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
from app.utils.auth import get_current_active_user, require_role

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
    leave.employee_name = current_user.full_name
    
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
        leave.employee_name = current_user.full_name
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
        leave.employee_name = employee.full_name if employee is not None else "Unknown"
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
        leave.employee_name = employee.full_name if employee is not None else "Unknown"
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
        leave.status = LeaveStatus.APPROVED
    elif update_data.status == "rejected":
        leave.status = LeaveStatus.REJECTED
    else:
        raise HTTPException(status_code=400, detail="Invalid status. Use 'approved' or 'rejected'")
    
    leave.reviewed_by = current_user.id
    leave.reviewed_at = datetime.now()
    
    # If approved, auto-remove shifts during leave period
    if leave.status == LeaveStatus.APPROVED:
        shifts = db.query(Shift).filter(
            Shift.employee_id == leave.employee_id,
            Shift.start_time >= datetime.combine(leave.start_date, datetime.min.time()),
            Shift.end_time <= datetime.combine(leave.end_date, datetime.max.time()),
            Shift.status == ShiftStatus.SCHEDULED
        ).all()
        
        for shift in shifts:
            shift.status = ShiftStatus.CANCELLED
            shift.notes = f"Cancelled due to leave (approved on {datetime.now().date()})"
    
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
    
    leave.status = LeaveStatus.CANCELLED
    
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