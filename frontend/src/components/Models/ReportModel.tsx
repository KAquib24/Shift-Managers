import React, { useState } from 'react';
import { format, addDays } from 'date-fns';
import { getAPI } from '../../utils/api';
import toast from 'react-hot-toast';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekStart: Date;
  onDownload: (fileFormat: 'csv' | 'pdf') => void;  // Changed parameter name
}

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  weekStart,
  onDownload
}) => {
  const [loading, setLoading] = useState<'csv' | 'pdf' | null>(null);
  const [reportType, setReportType] = useState<'schedule' | 'attendance' | 'leave'>('schedule');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [employees, setEmployees] = useState<any[]>([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async (fileFormat: 'csv' | 'pdf') => {  // Changed parameter name
    setLoading(fileFormat);
    
    try {
      const API = getAPI();
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      
      if (reportType === 'schedule') {
        console.log('📥 Downloading schedule as', fileFormat);
        
        // Use existing schedule export
        const response = await API.get('/shifts/export', {
          params: {
            week_start: weekStartStr,
            export_format: fileFormat  // Use fileFormat instead of format
          },
          responseType: 'blob'
        });
        
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `schedule_${weekStartStr}.${fileFormat === 'csv' ? 'xlsx' : 'pdf'}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        toast.success(`Schedule exported as ${fileFormat.toUpperCase()}`);
      } 
      else if (reportType === 'attendance') {
        console.log('📥 Downloading attendance as', fileFormat);
        
        if (fileFormat === 'pdf') {
          // For PDF, use the export endpoint with format=pdf
          const response = await API.get('/shifts/export', {
            params: {
              week_start: weekStartStr,
              export_format: 'pdf'
            },
            responseType: 'blob'
          });
          
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `attendance_${weekStartStr}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
        } else {
          // For CSV/Excel, get attendance summary
          const response = await API.get('/shifts/attendance-summary', {
            params: {
              period: 'week'
            }
          });
          
          // Create JSON report
          const data = response.data;
          const jsonStr = JSON.stringify(data, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `attendance_summary_${weekStartStr}.json`);
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
        
        toast.success('Attendance summary downloaded');
      }
      else if (reportType === 'leave') {
        console.log('📥 Downloading leave report as', fileFormat);
        
        if (selectedEmployee === 'all') {
          // Get all employees leave report
          const response = await API.get('/leave/all-employees-report', {
            params: {
              month: weekStart.getMonth() + 1,
              year: weekStart.getFullYear()
            }
          });
          
          // Create JSON report
          const data = response.data;
          const jsonStr = JSON.stringify(data, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `leave_report_all_${weekStartStr}.json`);
          document.body.appendChild(link);
          link.click();
          link.remove();
        } else {
          // Get individual employee leave report
          const response = await API.get(`/leave/export-employee-report/${selectedEmployee}`, {
            params: {
              month: weekStart.getMonth() + 1,
              year: weekStart.getFullYear()
            },
            responseType: 'blob'
          });
          
          // Get employee name for filename
          const emp = employees.find(e => e.id.toString() === selectedEmployee);
          const empName = emp ? emp.name.replace(/\s+/g, '_') : 'employee';
          
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `${empName}_report_${weekStartStr}.xlsx`);
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
        
        toast.success('Leave report downloaded');
      }
      
      // Call the original onDownload with the fileFormat
      onDownload(fileFormat);
      
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.response?.data?.detail || 'Failed to download report');
    } finally {
      setLoading(null);
    }
  };

  const fetchEmployees = async () => {
    try {
      const API = getAPI();
      const response = await API.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const toggleEmployeeDropdown = () => {
    if (!showEmployeeDropdown) {
      fetchEmployees();
    }
    setShowEmployeeDropdown(!showEmployeeDropdown);
  };

  // Logs se pata chalta hai ki shifts display ho rahi hain
  console.log('📊 ReportModal - Shifts are being displayed in cells');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Download Reports</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
        </div>
        
        <div className="space-y-4">
          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setReportType('schedule')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  reportType === 'schedule'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📅 Schedule
              </button>
              <button
                onClick={() => setReportType('attendance')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  reportType === 'attendance'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📊 Attendance
              </button>
              <button
                onClick={() => setReportType('leave')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  reportType === 'leave'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📋 Leave
              </button>
            </div>
          </div>

          {/* Period Info */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Period:</span>{' '}
              {reportType === 'schedule' ? (
                <>Week: {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}</>
              ) : (
                <>Month: {format(weekStart, 'MMMM yyyy')}</>
              )}
            </p>
          </div>

          {/* Employee Selection for Leave Reports */}
          {reportType === 'leave' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Employee
              </label>
              <div className="relative">
                <button
                  onClick={toggleEmployeeDropdown}
                  className="w-full px-4 py-2 text-left border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center"
                >
                  <span>
                    {selectedEmployee === 'all' 
                      ? '👥 All Employees' 
                      : employees.find(e => e.id.toString() === selectedEmployee)?.name || 'Select Employee'}
                  </span>
                  <span className="text-gray-400">▼</span>
                </button>
                
                {showEmployeeDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedEmployee('all');
                        setShowEmployeeDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                        selectedEmployee === 'all' ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      👥 All Employees
                    </button>
                    {employees.map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => {
                          setSelectedEmployee(emp.id.toString());
                          setShowEmployeeDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                          selectedEmployee === emp.id.toString() ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        <div>👤 {emp.name}</div>
                        <div className="text-xs text-gray-500">{emp.department || 'No Dept'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Download Options */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <button
              onClick={() => handleDownload('csv')}
              disabled={loading !== null}
              className={`p-4 border-2 rounded-lg hover:bg-gray-50 text-center transition-all ${
                loading === 'csv' ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                reportType === 'schedule' ? 'border-green-200 hover:border-green-400' : 
                reportType === 'attendance' ? 'border-purple-200 hover:border-purple-400' : 
                'border-orange-200 hover:border-orange-400'
              }`}
            >
              {loading === 'csv' ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                  <div className="text-sm">Generating...</div>
                </div>
              ) : (
                <>
                  <div className="text-3xl mb-2">
                    {reportType === 'schedule' ? '📅' : reportType === 'attendance' ? '📊' : '📋'}
                  </div>
                  <div className="font-medium">
                    {reportType === 'schedule' ? 'Excel' : 
                     reportType === 'attendance' ? 'JSON' : 'Excel'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {reportType === 'schedule' ? 'Weekly schedule' : 
                     reportType === 'attendance' ? 'Summary stats' : 
                     selectedEmployee === 'all' ? 'All employees' : 'Individual report'}
                  </div>
                </>
              )}
            </button>
            
            <button
              onClick={() => handleDownload('pdf')}
              disabled={loading !== null}
              className={`p-4 border-2 rounded-lg hover:bg-gray-50 text-center transition-all ${
                loading === 'pdf' ? 'opacity-50 cursor-not-allowed' : ''
              } border-red-200 hover:border-red-400`}
            >
              {loading === 'pdf' ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mb-2"></div>
                  <div className="text-sm">Generating...</div>
                </div>
              ) : (
                <>
                  <div className="text-3xl mb-2">📄</div>
                  <div className="font-medium">PDF</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {reportType === 'schedule' ? 'Printable schedule' : 
                     reportType === 'attendance' ? 'Attendance PDF' : 'Leave PDF'}
                  </div>
                </>
              )}
            </button>
          </div>

          {/* Info Messages */}
          {reportType === 'leave' && selectedEmployee !== 'all' && (
            <div className="bg-green-50 p-3 rounded-lg mt-2">
              <p className="text-xs text-green-700 flex items-center">
                <span className="mr-1">✨</span>
                Individual report includes daily breakdown, total hours, late arrivals, overtime, and leave days.
              </p>
            </div>
          )}

          {reportType === 'attendance' && (
            <div className="bg-purple-50 p-3 rounded-lg mt-2">
              <p className="text-xs text-purple-700 flex items-center">
                <span className="mr-1">📊</span>
                Attendance summary: Total hours, late arrivals, overtime, absences for the period.
              </p>
            </div>
          )}
          
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors mt-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;