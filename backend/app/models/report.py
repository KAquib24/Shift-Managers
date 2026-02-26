from sqlalchemy import Column, Integer, String, DateTime, Date, Float, ForeignKey, Text, JSON, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class ReportType(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    CUSTOM = "custom"

class ReportFormat(str, enum.Enum):
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    JSON = "json"

class ReportStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class EmployeeReport(Base):
    __tablename__ = "employee_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Report details
    report_type = Column(Enum(ReportType), nullable=False)
    report_format = Column(Enum(ReportFormat), default=ReportFormat.EXCEL)
    status = Column(Enum(ReportStatus), default=ReportStatus.PENDING)
    
    # Date range
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    # Report data (stored as JSON)
    summary_data = Column(JSON, nullable=True)  # Stores summary statistics
    daily_breakdown = Column(JSON, nullable=True)  # Stores daily data array
    
    # File info
    file_path = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)  # in bytes
    
    # Pre-computed statistics for quick access
    total_days_in_month = Column(Integer, default=0)
    attendance_days = Column(Integer, default=0)
    leave_days = Column(Integer, default=0)
    absent_days = Column(Integer, default=0)
    total_hours = Column(Float, default=0)
    total_minutes = Column(Integer, default=0)
    average_hours_per_day = Column(Float, default=0)
    late_arrivals = Column(Integer, default=0)
    overtime_days = Column(Integer, default=0)
    total_late_minutes = Column(Integer, default=0)
    
    # Month/Year for easy filtering
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    month_name = Column(String(20), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    generated_at = Column(DateTime(timezone=True), nullable=True)
    downloaded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships (using your existing models)
    employee = relationship("User", foreign_keys=[employee_id], backref="employee_reports")
    company = relationship("Company", foreign_keys=[company_id], backref="company_reports")
    generator = relationship("User", foreign_keys=[generated_by], backref="generated_reports")

class ReportTemplate(Base):
    __tablename__ = "report_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Template details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    report_type = Column(Enum(ReportType), nullable=False)
    report_format = Column(Enum(ReportFormat), default=ReportFormat.EXCEL)
    
    # Template configuration
    config = Column(JSON, nullable=True)  # Stores which fields to include
    
    # Default settings
    include_daily_breakdown = Column(Boolean, default=True)
    include_summary = Column(Boolean, default=True)
    include_employee_details = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    
    # Relationships
    company = relationship("Company", backref="report_templates")
    creator = relationship("User", foreign_keys=[created_by])

class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("report_templates.id"), nullable=True)
    
    # Schedule details
    name = Column(String(255), nullable=False)
    report_type = Column(Enum(ReportType), nullable=False)
    report_format = Column(Enum(ReportFormat), default=ReportFormat.EXCEL)
    
    # Frequency
    frequency = Column(String(50), nullable=False)  # daily, weekly, monthly
    day_of_week = Column(Integer, nullable=True)  # 0-6 for weekly
    day_of_month = Column(Integer, nullable=True)  # 1-31 for monthly
    
    # Recipients
    email_recipients = Column(JSON, nullable=True)  # List of email addresses
    
    # Last run tracking
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    last_report_id = Column(Integer, ForeignKey("employee_reports.id"), nullable=True)
    
    # Active status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", backref="scheduled_reports")
    creator = relationship("User", foreign_keys=[created_by])
    template = relationship("ReportTemplate")
    last_report = relationship("EmployeeReport", foreign_keys=[last_report_id])