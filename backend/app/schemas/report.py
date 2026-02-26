from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional, List, Dict, Any

# ============================================
# Report Data Schemas (Matching your existing)
# ============================================

class EmployeeInfo(BaseModel):
    id: int
    name: str
    department: Optional[str] = None
    position: Optional[str] = None

class ReportPeriod(BaseModel):
    month: int
    year: int
    month_name: str
    start_date: str
    end_date: str

class DailyBreakdown(BaseModel):
    date: str
    day_name: str
    hours: float
    minutes: int
    shifts: int
    late: bool
    overtime: bool

class SummaryStats(BaseModel):
    total_days_in_month: int
    attendance_days: int
    leave_days: int
    absent_days: int
    total_hours: float
    total_minutes: int
    average_hours_per_day: float
    late_arrivals: int
    overtime_days: int
    total_late_minutes: int

class EmployeeMonthlyReport(BaseModel):
    employee: EmployeeInfo
    period: ReportPeriod
    summary: SummaryStats
    daily_breakdown: List[DailyBreakdown]

class EmployeeReportResponse(BaseModel):
    employee: EmployeeInfo
    period: ReportPeriod
    summary: SummaryStats
    daily_breakdown: List[DailyBreakdown]

class CompanyReportSummary(BaseModel):
    month: int
    year: int
    month_name: str
    total_employees: int
    company_totals: Dict[str, Any]
    employees: List[EmployeeMonthlyReport]

# ============================================
# Employee Report Model Schemas
# ============================================

class EmployeeReportBase(BaseModel):
    employee_id: int
    report_type: str
    start_date: date
    end_date: date
    report_format: str = "excel"
    month: int
    year: int
    month_name: Optional[str] = None

class EmployeeReportCreate(EmployeeReportBase):
    summary_data: Optional[Dict[str, Any]] = None
    daily_breakdown: Optional[List[Dict[str, Any]]] = None

class EmployeeReportUpdate(BaseModel):
    status: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    generated_at: Optional[datetime] = None
    downloaded_at: Optional[datetime] = None
    summary_data: Optional[Dict[str, Any]] = None
    daily_breakdown: Optional[List[Dict[str, Any]]] = None
    
    # Statistics
    total_days_in_month: Optional[int] = None
    attendance_days: Optional[int] = None
    leave_days: Optional[int] = None
    absent_days: Optional[int] = None
    total_hours: Optional[float] = None
    total_minutes: Optional[int] = None
    average_hours_per_day: Optional[float] = None
    late_arrivals: Optional[int] = None
    overtime_days: Optional[int] = None
    total_late_minutes: Optional[int] = None

class EmployeeReportInDB(EmployeeReportBase):
    id: int
    company_id: int
    generated_by: int
    status: str
    summary_data: Optional[Dict[str, Any]] = None
    daily_breakdown: Optional[List[Dict[str, Any]]] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    created_at: datetime
    generated_at: Optional[datetime] = None
    downloaded_at: Optional[datetime] = None
    
    # Statistics
    total_days_in_month: int
    attendance_days: int
    leave_days: int
    absent_days: int
    total_hours: float
    total_minutes: int
    average_hours_per_day: float
    late_arrivals: int
    overtime_days: int
    total_late_minutes: int
    
    model_config = ConfigDict(from_attributes=True)

class EmployeeReportListResponse(BaseModel):
    total: int
    reports: List[EmployeeReportInDB]

# ============================================
# Report Template Schemas
# ============================================

class ReportTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    report_type: str
    report_format: str = "excel"
    config: Optional[Dict[str, Any]] = None
    include_daily_breakdown: bool = True
    include_summary: bool = True
    include_employee_details: bool = True

class ReportTemplateCreate(ReportTemplateBase):
    pass

class ReportTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    report_type: Optional[str] = None
    report_format: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    include_daily_breakdown: Optional[bool] = None
    include_summary: Optional[bool] = None
    include_employee_details: Optional[bool] = None
    is_active: Optional[bool] = None

class ReportTemplateResponse(ReportTemplateBase):
    id: int
    company_id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_active: bool
    creator_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# ============================================
# Scheduled Report Schemas
# ============================================

class ScheduledReportBase(BaseModel):
    name: str
    report_type: str
    report_format: str = "excel"
    frequency: str  # daily, weekly, monthly
    day_of_week: Optional[int] = None  # 0-6 (Monday=0)
    day_of_month: Optional[int] = None  # 1-31
    email_recipients: Optional[List[str]] = None
    template_id: Optional[int] = None
    is_active: bool = True

class ScheduledReportCreate(ScheduledReportBase):
    pass

class ScheduledReportUpdate(BaseModel):
    name: Optional[str] = None
    report_type: Optional[str] = None
    report_format: Optional[str] = None
    frequency: Optional[str] = None
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    email_recipients: Optional[List[str]] = None
    template_id: Optional[int] = None
    is_active: Optional[bool] = None

class ScheduledReportResponse(ScheduledReportBase):
    id: int
    company_id: int
    created_by: int
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    creator_name: Optional[str] = None
    template_name: Optional[str] = None
    last_report_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

# ============================================
# Report Generation Request Schemas
# ============================================

class GenerateReportRequest(BaseModel):
    employee_id: int
    month: int
    year: int
    report_format: str = "excel"
    template_id: Optional[int] = None

class GenerateCompanyReportRequest(BaseModel):
    month: int
    year: int
    department: Optional[str] = None
    report_format: str = "excel"
    include_all_employees: bool = True