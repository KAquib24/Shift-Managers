# backend/app/schemas/shift.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.shift import ShiftStatus

class ShiftBase(BaseModel):
    employee_id: int
    title: str
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None
    department: Optional[str] = None
    notes: Optional[str] = None

class ShiftCreate(ShiftBase):
    pass

class ShiftUpdate(BaseModel):
    title: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[ShiftStatus] = None
    location: Optional[str] = None

class ShiftResponse(ShiftBase):
    id: int
    company_id: int
    status: ShiftStatus
    clock_in_time: Optional[datetime] = None
    clock_out_time: Optional[datetime] = None
    actual_hours: Optional[int] = None
    is_late: bool
    late_minutes: int
    created_at: datetime
    employee_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class ClockInOut(BaseModel):
    shift_id: int
    action: str  # "clock_in" or "clock_out"
    time: Optional[datetime] = None

class WeeklySchedule(BaseModel):
    week_start: str  # ISO date
    shifts: List[ShiftResponse]