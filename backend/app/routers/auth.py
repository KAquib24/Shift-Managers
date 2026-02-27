from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import get_settings
from app.models.user import User, UserRole
from app.models.company import Company
from app.schemas.user import UserCreate, UserResponse, UserLogin
from app.schemas.company import CompanyCreate, JoinCompany
from app.schemas.token import Token
from app.utils.auth import (
    authenticate_user, create_access_token, get_password_hash,
    get_current_user, require_role, decode_token
)
import random
import string

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()

# ============================================
# 1️⃣ REGISTER FOUNDER + AUTO LOGIN (ONE STEP)
# ============================================
@router.post("/register/founder", response_model=Token)
async def register_founder(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register as a founder AND get token immediately!
    No separate login needed.
    """
    print(f"📝 Registering founder: {user_data.email}")
    
    # Check if email exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user with founder role
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        full_name=user_data.full_name,
        phone=user_data.phone,
        role=UserRole.FOUNDER,
        is_active=True  # Founder auto-activated
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    print(f"✅ Founder created: {db_user.id} with role: {db_user.role.value}")
    
    # AUTO-LOGIN: Generate token immediately
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": db_user.email,
            "user_id": db_user.id,
            "role": db_user.role.value,
            "company_id": db_user.company_id
        },
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": db_user.role.value,
        "company_id": db_user.company_id,
        "user_id": db_user.id,
        "message": "Registration successful! You're now logged in."
    }

# ============================================
# 2️⃣ REGISTER EMPLOYEE (Pending Approval) 
# ============================================
@router.post("/register/employee", response_model=dict)
async def register_employee(
    join_data: JoinCompany, 
    db: Session = Depends(get_db)
):
    """
    Register as employee with company code.
    Returns pending status.
    """
    print(f"📝 Registering employee: {join_data.email}")
    
    # Check if company exists
    company = db.query(Company).filter(Company.company_code == join_data.company_code).first()
    if not company:
        raise HTTPException(status_code=400, detail="❌ Invalid company code")
    
    print(f"✅ Company found: {company.name}")
    
    # Check if email exists
    if db.query(User).filter(User.email == join_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user as employee (pending approval)
    hashed_password = get_password_hash(join_data.password)
    db_user = User(
        email=join_data.email,
        password_hash=hashed_password,
        full_name=join_data.full_name,
        role=UserRole.EMPLOYEE,
        company_code=join_data.company_code,
        company_id=company.id,
        is_active=False  # Pending approval
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    print(f"✅ Employee registered: {db_user.id} (pending approval)")
    
    return {
        "message": "✅ Registration successful! Awaiting admin approval.",
        "status": "pending",
        "user_id": db_user.id,
        "email": db_user.email,
        "company_name": company.name
    }

# ============================================
# 3️⃣ CREATE COMPANY (Founder only)
# ============================================
@router.post("/company", response_model=dict)
async def create_company(
    company_data: CompanyCreate,
    current_user: User = Depends(require_role(UserRole.FOUNDER)),
    db: Session = Depends(get_db)
):
    """Create company (founder only) - Returns company code"""
    
    print(f"🏢 Creating company for founder: {current_user.email}")
    
    # Check if founder already has company
    if current_user.company_id:
        raise HTTPException(status_code=400, detail="You already have a company")
    
    # Generate unique company code
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not db.query(Company).filter(Company.company_code == code).first():
            break
    
    # Create company
    db_company = Company(
        name=company_data.name,
        company_code=code,
        industry=company_data.industry,
        size=company_data.size,
        timezone=company_data.timezone,
        currency=company_data.currency,
        founder_id=current_user.id
    )
    
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    
    # PROMOTE FOUNDER TO ADMIN
    current_user.role = UserRole.ADMIN  # Founder becomes admin
    current_user.company_id = db_company.id
    db.commit()
    
    print(f"✅ Company created and founder promoted to admin: {db_company.name} (Code: {code})")
    print(f"✅ User {current_user.email} new role: {current_user.role.value}")
    
    return {
        "message": "✅ Company created successfully. You are now an admin!",
        "company_code": code,
        "company_id": db_company.id,
        "company_name": db_company.name
    }

# ============================================
# 4️⃣ LOGIN (Works for approved users)
# ============================================
@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Login and get access token"""
    
    print(f"🔐 Login attempt: {login_data.email}")
    
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        print("❌ Invalid credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="❌ Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Better message for pending users
    if not user.is_active:
        print(f"❌ User {user.email} is inactive")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="⏳ Account pending approval. Please wait for admin to approve your request.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user.email,
            "user_id": user.id,
            "role": user.role.value,
            "company_id": user.company_id
        },
        expires_delta=access_token_expires
    )
    
    print(f"✅ Login successful: {user.email} ({user.role.value})")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
        "company_id": user.company_id,
        "user_id": user.id
    }

# ============================================
# 5️⃣ GET PENDING EMPLOYEES (Admin only)
# ============================================
@router.get("/pending-employees")
async def get_pending_employees(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Get all pending employee registrations (Admin only)"""
    
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No company found")
    
    pending = db.query(User).filter(
        User.company_id == current_user.company_id,
        User.role == UserRole.EMPLOYEE,
        User.is_active == False
    ).all()
    
    return {
        "pending_count": len(pending),
        "employees": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "registered_at": u.created_at.isoformat() if u.created_at else None
            }
            for u in pending
        ]
    }

# ============================================
# 6️⃣ APPROVE EMPLOYEE (Admin only)
# ============================================
@router.post("/approve-employee/{employee_id}")
async def approve_employee(
    employee_id: int,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Approve pending employee"""
    
    employee = db.query(User).filter(User.id == employee_id).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if employee.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Not your company")
    
    # Approve employee
    employee.is_active = True
    employee.approved_by = current_user.id
    employee.approved_at = datetime.utcnow()
    
    db.commit()
    
    print(f"✅ Employee {employee.full_name} approved by {current_user.email}")
    
    return {
        "message": f"✅ Employee {employee.full_name} approved successfully",
        "employee": {
            "id": employee.id,
            "email": employee.email,
            "full_name": employee.full_name,
            "is_active": employee.is_active
        }
    }

# ============================================
# 7️⃣ GET CURRENT USER
# ============================================
@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current logged-in user info"""
    return current_user

# ============================================
# 9️⃣ GET COMPANY DETAILS (Admin only)
# ============================================
@router.get("/company/details")
async def get_company_details(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Get current user's company details (Admin only)"""
    
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="No company associated with this user")
    
    company = db.query(Company).filter(
        Company.id == current_user.company_id
    ).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return {
        "id": company.id,
        "name": company.name,
        "company_code": company.company_code,
        "industry": company.industry,
        "size": company.size,
        "timezone": company.timezone,
        "currency": company.currency,
        "created_at": company.created_at.isoformat() if company.created_at else None
    }

# ============================================
# 8️⃣ TEST ENDPOINT (No auth required)
# ============================================
@router.get("/test")
async def test():
    return {
        "message": "Auth API is working!",
        "endpoints": [
            "POST /register/founder - Register founder + auto login",
            "POST /register/employee - Register employee (needs approval)",
            "POST /company - Create company (founder only)",
            "POST /login - Login (approved users only)",
            "GET /pending-employees - View pending (admin only)",
            "POST /approve-employee/1 - Approve employee (admin only)",
            "GET /me - Get current user"
        ]
    }