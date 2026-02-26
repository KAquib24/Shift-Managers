from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional, List

class LeaveBase(BaseModel):
    start_date: date
    end_date: date
    reason: Optional[str] = None

class LeaveCreate(LeaveBase):
    pass

class LeaveUpdate(BaseModel):
    status: str  # "approved" or "rejected"

class LeaveResponse(LeaveBase):
    id: int
    employee_id: int
    company_id: int
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    employee_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class LeaveListResponse(BaseModel):
    total: int
    pending: int
    approved: int
    rejected: int
    leaves: List[LeaveResponse]