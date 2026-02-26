# backend/app/schemas/company.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.user import UserResponse
from pydantic import BaseModel, EmailStr

class CompanyBase(BaseModel):
    name: str
    industry: Optional[str] = None
    size: Optional[str] = None
    timezone: str = "UTC"
    currency: str = "USD"

class CompanyCreate(CompanyBase):
    pass

class CompanyResponse(CompanyBase):
    id: int
    company_code: str
    founder_id: int
    is_active: bool
    created_at: datetime
    employees: Optional[List[UserResponse]] = None
    
    class Config:
        from_attributes = True

class JoinCompany(BaseModel):
    company_code: str
    email: EmailStr
    full_name: str
    password: str