from pydantic import BaseModel
from typing import List, Optional
from datetime import date

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
    company_totals: dict
    employees: List[EmployeeMonthlyReport]