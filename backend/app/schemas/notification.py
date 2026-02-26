# backend/app/schemas/notification.py
from pydantic import BaseModel
from typing import Optional, Any, Dict, List
from datetime import datetime
from enum import Enum

# This must match your model's NotificationType exactly
class NotificationType(str, Enum):
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

# ============================================
# NOTIFICATION SCHEMAS
# ============================================

class NotificationBase(BaseModel):
    """Base Notification schema"""
    type: NotificationType
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None

class NotificationCreate(NotificationBase):
    """Schema for creating a notification"""
    company_id: int
    user_id: int
    sender_id: Optional[int] = None

class NotificationUpdate(BaseModel):
    """Schema for updating a notification"""
    is_read: bool = True
    read_at: Optional[datetime] = None

class NotificationResponse(NotificationBase):
    """Schema for notification response"""
    id: int
    company_id: int
    user_id: int
    sender_id: Optional[int] = None
    is_read: bool
    is_sent: bool
    created_at: datetime
    read_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class NotificationListResponse(BaseModel):
    """Schema for list of notifications with metadata"""
    notifications: List[NotificationResponse]
    total: int
    unread_count: int

# ============================================
# SHIFT SWAP REQUEST SCHEMAS
# ============================================

class ShiftSwapRequestBase(BaseModel):
    """Base Shift Swap Request schema"""
    shift_id: int
    target_employee_id: Optional[int] = None
    proposed_start_time: Optional[datetime] = None
    proposed_end_time: Optional[datetime] = None
    reason: Optional[str] = None

class ShiftSwapRequestCreate(ShiftSwapRequestBase):
    """Schema for creating a shift swap request"""
    company_id: int
    requesting_employee_id: int

class ShiftSwapRequestUpdate(BaseModel):
    """Schema for updating a shift swap request"""
    status: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None

class ShiftSwapRequestResponse(ShiftSwapRequestBase):
    """Schema for shift swap request response"""
    id: int
    company_id: int
    requesting_employee_id: int
    status: str  # pending, approved, rejected
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ShiftSwapRequestDetailResponse(ShiftSwapRequestResponse):
    """Detailed shift swap request with related data"""
    shift_title: Optional[str] = None
    shift_date: Optional[str] = None
    shift_time: Optional[str] = None
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    target_name: Optional[str] = None
    reviewer_name: Optional[str] = None

# ============================================
# REQUEST/RESPONSE WRAPPERS
# ============================================

class ShiftSwapRequestAction(BaseModel):
    """Schema for swap request action"""
    action: str  # 'approve' or 'reject'
    notes: Optional[str] = None

class UnreadCountResponse(BaseModel):
    """Schema for unread count response"""
    count: int

class MarkReadResponse(BaseModel):
    """Schema for mark as read response"""
    message: str
    notification_id: Optional[int] = None

class MarkAllReadResponse(BaseModel):
    """Schema for mark all as read response"""
    message: str
    count: int