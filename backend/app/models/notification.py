# backend/app/models/notification.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class NotificationType(str, enum.Enum):
    SHIFT_ASSIGNED = "shift_assigned"
    SHIFT_UPDATED = "shift_updated"
    SHIFT_CANCELLED = "shift_cancelled"
    SHIFT_SWAP_REQUESTED = "shift_swap_requested"
    SHIFT_SWAP_APPROVED = "shift_swap_approved"
    SHIFT_SWAP_REJECTED = "shift_swap_rejected"
    LEAVE_REQUESTED = "leave_requested"
    LEAVE_APPROVED = "leave_approved"
    LEAVE_REJECTED = "leave_rejected"
    CLOCK_IN_REMINDER = "clock_in_reminder"
    CLOCK_OUT_REMINDER = "clock_out_reminder"

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    user_id = Column(Integer, ForeignKey("users.id"))  # Recipient
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Who triggered
    
    type = Column(Enum(NotificationType))
    title = Column(String(255))
    message = Column(String(500))
    data = Column(JSON, nullable=True)  # Extra data like shift_id, swap_id
    
    is_read = Column(Boolean, default=False)
    is_sent = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    sender = relationship("User", foreign_keys=[sender_id])
    company = relationship("Company")

class ShiftSwapRequest(Base):
    __tablename__ = "shift_swap_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    
    # Original shift
    shift_id = Column(Integer, ForeignKey("shifts.id"))
    requesting_employee_id = Column(Integer, ForeignKey("users.id"))
    
    # Target employee (who they want to swap with)
    target_employee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Proposed new shift details
    proposed_start_time = Column(DateTime, nullable=True)
    proposed_end_time = Column(DateTime, nullable=True)
    
    status = Column(String(50), default="pending")  # pending, approved, rejected
    reason = Column(String(500), nullable=True)
    
    # Admin action
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    shift = relationship("Shift")
    requester = relationship("User", foreign_keys=[requesting_employee_id])
    target = relationship("User", foreign_keys=[target_employee_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])