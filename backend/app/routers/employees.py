from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserResponse
from app.utils.auth import get_current_active_user, require_role, get_password_hash

router = APIRouter(prefix="/employees", tags=["Employees"])

@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def get_employees(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all employees in company"""
    
    employees = db.query(User).filter(
        User.company_id == current_user.company_id,
        User.role == UserRole.EMPLOYEE,
        User.is_active == True
    ).all()
    
    return [
        {
            "id": emp.id,
            "name": emp.full_name,
            "position": getattr(emp, 'position', 'Employee'),
            "status": "Active",
            "email": emp.email,
            "phone": getattr(emp, 'phone', None)
        }
        for emp in employees
    ]

@router.post("/")
async def add_employee(
    employee_data: dict,
    current_user: User = Depends(require_role(UserRole.ADMIN)),  # FIXED: Use enum
    db: Session = Depends(get_db)
):
    """Add new employee"""
    
    # Check if email exists
    existing = db.query(User).filter(User.email == employee_data["email"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create employee
    new_employee = User(
        email=employee_data["email"],
        password_hash=get_password_hash(employee_data.get("password", "Welcome123!")),
        full_name=employee_data["full_name"],
        role=UserRole.EMPLOYEE,
        company_id=current_user.company_id,
        is_active=True,
        phone=employee_data.get("phone"),
        created_at=datetime.utcnow()
    )
    
    # Add custom fields if needed
    if "position" in employee_data:
        new_employee.position = employee_data["position"]
    
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)
    
    return {"message": "Employee added", "id": new_employee.id}