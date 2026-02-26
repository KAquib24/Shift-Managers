from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
import calendar
from pathlib import Path

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.report import EmployeeReport, ReportTemplate, ScheduledReport, ReportStatus, ReportType, ReportFormat
from app.schemas.report import (
    EmployeeReportCreate, EmployeeReportUpdate, EmployeeReportInDB, EmployeeReportListResponse,
    ReportTemplateCreate, ReportTemplateUpdate, ReportTemplateResponse,
    ScheduledReportCreate, ScheduledReportUpdate, ScheduledReportResponse,
    GenerateReportRequest
)
from app.utils.auth import get_current_active_user, require_role
from app.routers.leave import get_employee_monthly_report

router = APIRouter(prefix="/reports", tags=["Reports"])

# ============================================
# 1️⃣ GENERATE EMPLOYEE REPORT
# ============================================
@router.post("/generate", response_model=EmployeeReportInDB)
async def generate_employee_report(
    request: GenerateReportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate a new employee report"""
    
    # Check permissions
    if current_user.role != UserRole.ADMIN and current_user.id != request.employee_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get employee
    employee = db.query(User).filter(
        User.id == request.employee_id,
        User.company_id == current_user.company_id
    ).first()
    
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Create report record
    report = EmployeeReport(
        employee_id=request.employee_id,
        company_id=current_user.company_id,
        generated_by=current_user.id,
        report_type=ReportType.MONTHLY,
        report_format=request.report_format,
        status=ReportStatus.PENDING,
        start_date=date(request.year, request.month, 1),
        end_date=date(request.year, request.month, calendar.monthrange(request.year, request.month)[1]),
        month=request.month,
        year=request.year,
        month_name=calendar.month_name[request.month]
    )
    
    db.add(report)
    db.commit()
    db.refresh(report)
    
    # Generate report in background
    background_tasks.add_task(
        generate_report_task,
        report_id=report.id,
        employee_id=request.employee_id,
        month=request.month,
        year=request.year,
        db=db
    )
    
    return report

# ============================================
# 2️⃣ GET REPORT BY ID
# ============================================
@router.get("/{report_id}", response_model=EmployeeReportInDB)
async def get_report(
    report_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get report by ID"""
    
    report = db.query(EmployeeReport).filter(
        EmployeeReport.id == report_id,
        EmployeeReport.company_id == current_user.company_id
    ).first()
    
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check permissions
    if current_user.role != UserRole.ADMIN and report.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return report

# ============================================
# 3️⃣ GET EMPLOYEE REPORTS
# ============================================
@router.get("/employee/{employee_id}", response_model=EmployeeReportListResponse)
async def get_employee_reports(
    employee_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all reports for an employee"""
    
    # Check permissions
    if current_user.role != UserRole.ADMIN and current_user.id != employee_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    reports = db.query(EmployeeReport).filter(
        EmployeeReport.employee_id == employee_id,
        EmployeeReport.company_id == current_user.company_id
    ).order_by(EmployeeReport.created_at.desc()).offset(skip).limit(limit).all()
    
    total = db.query(EmployeeReport).filter(
        EmployeeReport.employee_id == employee_id,
        EmployeeReport.company_id == current_user.company_id
    ).count()
    
    return {
        "total": total,
        "reports": reports
    }

# ============================================
# 4️⃣ DOWNLOAD REPORT
# ============================================
@router.get("/{report_id}/download")
async def download_report(
    report_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Download generated report"""
    
    from fastapi.responses import FileResponse
    
    report = db.query(EmployeeReport).filter(
        EmployeeReport.id == report_id,
        EmployeeReport.company_id == current_user.company_id
    ).first()
    
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check permissions
    if current_user.role != UserRole.ADMIN and report.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if report.status != ReportStatus.COMPLETED or report.file_path is None:
        raise HTTPException(status_code=400, detail="Report not ready for download")
    
    # Update download timestamp
    setattr(report, "downloaded_at", datetime.now())
    db.commit()
    
    return FileResponse(
        path=report.file_path,
        filename=report.file_name,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

# ============================================
# Background Task for Report Generation
# ============================================
async def generate_report_task(
    report_id: int,
    employee_id: int,
    month: int,
    year: int,
    db: Session
):
    """Background task to generate report"""
    
    import pandas as pd
    from io import BytesIO
    from datetime import datetime
    
    # Get report
    report = db.query(EmployeeReport).filter(EmployeeReport.id == report_id).first()
    if report is None:
        return
    
    try:
        # Update status
        setattr(report, "status", ReportStatus.PROCESSING)
        db.commit()
        
        # Get user who requested the report
        generator = db.query(User).filter(User.id == report.generated_by).first()
        
        # Get report data using existing function
        report_data = await get_employee_monthly_report(
            employee_id=employee_id,
            month=month,
            year=year,
            current_user=generator,
            db=db
        )
        
        # Store summary data as JSON
        setattr(report, "summary_data", report_data["summary"])
        setattr(report, "daily_breakdown", report_data["daily_breakdown"])
        
        # Update statistics
        setattr(report, "total_days_in_month", report_data["summary"]["total_days_in_month"])
        setattr(report, "attendance_days", report_data["summary"]["attendance_days"])
        setattr(report, "leave_days", report_data["summary"]["leave_days"])
        setattr(report, "absent_days", report_data["summary"]["absent_days"])
        setattr(report, "total_hours", report_data["summary"]["total_hours"])
        setattr(report, "total_minutes", report_data["summary"]["total_minutes"])
        setattr(report, "average_hours_per_day", report_data["summary"]["average_hours_per_day"])
        setattr(report, "late_arrivals", report_data["summary"]["late_arrivals"])
        setattr(report, "overtime_days", report_data["summary"]["overtime_days"])
        setattr(report, "total_late_minutes", report_data["summary"]["total_late_minutes"])
        
        # Create Excel file
        summary_data = {
            "Metric": [
                "Employee Name",
                "Department",
                "Month",
                "Year",
                "Total Days in Month",
                "Attendance Days",
                "Leave Days",
                "Absent Days",
                "Total Hours Worked",
                "Total Minutes Worked",
                "Average Hours/Day",
                "Late Arrivals",
                "Overtime Days",
                "Total Late Minutes"
            ],
            "Value": [
                report_data["employee"]["name"],
                report_data["employee"]["department"] or "N/A",
                report_data["period"]["month_name"],
                str(report_data["period"]["year"]),
                str(report_data["summary"]["total_days_in_month"]),
                str(report_data["summary"]["attendance_days"]),
                str(report_data["summary"]["leave_days"]),
                str(report_data["summary"]["absent_days"]),
                f"{report_data['summary']['total_hours']} hrs",
                f"{report_data['summary']['total_minutes']} mins",
                f"{report_data['summary']['average_hours_per_day']} hrs",
                str(report_data["summary"]["late_arrivals"]),
                str(report_data["summary"]["overtime_days"]),
                f"{report_data['summary']['total_late_minutes']} mins"
            ]
        }
        
        daily_data = []
        for day in report_data["daily_breakdown"]:
            daily_data.append({
                "Date": day["date"],
                "Day": day["day_name"],
                "Hours": day["hours"],
                "Minutes": day["minutes"],
                "Shifts": day["shifts"],
                "Late": "Yes" if day["late"] else "No",
                "Overtime": "Yes" if day["overtime"] else "No"
            })
        
        # Create Excel file
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            pd.DataFrame(summary_data).to_excel(writer, sheet_name='Summary', index=False)
            pd.DataFrame(daily_data).to_excel(writer, sheet_name='Daily Breakdown', index=False)
        
        # Save file
        reports_dir = Path("generated_reports")
        reports_dir.mkdir(exist_ok=True)
        
        filename = f"{report_data['employee']['name']}_{report_data['period']['month_name']}_{report_data['period']['year']}_{report_id}.xlsx"
        filename = filename.replace(" ", "_")
        file_path = reports_dir / filename
        
        with open(file_path, "wb") as f:
            f.write(output.getvalue())
        
        # Update report with file info
        setattr(report, "file_path", str(file_path))
        setattr(report, "file_name", filename)
        setattr(report, "file_size", file_path.stat().st_size)
        setattr(report, "status", ReportStatus.COMPLETED)
        setattr(report, "generated_at", datetime.now())
        
    except Exception as e:
        setattr(report, "status", ReportStatus.FAILED)
        setattr(report, "summary_data", {"error": str(e)})
    
    db.commit()