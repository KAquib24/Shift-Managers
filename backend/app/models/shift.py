# backend/app/models/shift.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class ShiftStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    LATE = "late"
    ABSENT = "absent"

class Shift(Base):
    __tablename__ = "shifts"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Shift details
    title = Column(String(255), nullable=False)  # e.g., "Management", "Floor Staff"
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    
    # Status tracking
    status = Column(Enum(ShiftStatus), default=ShiftStatus.SCHEDULED)
    notes = Column(Text, nullable=True)
    
    # Location/Department
    location = Column(String(255), nullable=True)
    department = Column(String(100), nullable=True)
    
    # Attendance tracking
    clock_in_time = Column(DateTime, nullable=True)
    clock_out_time = Column(DateTime, nullable=True)
    actual_hours = Column(Integer, nullable=True)  # in minutes
    
    # Late tracking
    is_late = Column(Boolean, default=False)
    late_minutes = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    employee = relationship("User", foreign_keys=[employee_id])
    creator = relationship("User", foreign_keys=[created_by])
    company = relationship("Company")

class ShiftTemplate(Base):
    """For recurring shifts"""
    __tablename__ = "shift_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    title = Column(String(255))
    start_time = Column(String(50))  # "09:00"
    end_time = Column(String(50))    # "17:00"
    days_of_week = Column(String(50))  # "1,2,3,4,5" (Mon-Fri)
    department = Column(String(100))
    is_active = Column(Boolean, default=True)