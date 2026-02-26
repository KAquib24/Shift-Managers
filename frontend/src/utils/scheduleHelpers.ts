import type { Shift, EmployeeSchedule } from '../types/schedule.types';
import { format, isToday } from 'date-fns';

export const getStatusColor = (status?: string): string => {
  switch(status) {
    case 'On shift': return 'bg-green-100 text-green-800';
    case 'Late': return 'bg-red-100 text-red-800';
    case 'Off': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getShiftStyle = (shift?: Shift): string => {
  if (!shift) return 'bg-gray-50';
  if (shift.is_late) return 'bg-red-100';
  if (shift.status === 'in_progress') return 'bg-green-100';
  return 'bg-blue-100';
};

export const isTodayDate = (date: Date): boolean => {
  return isToday(date);
};

export const transformScheduleData = (scheduleData: any[]): EmployeeSchedule[] => {
  console.log('🔄 Transforming:', scheduleData);
  
  if (!scheduleData || !Array.isArray(scheduleData)) {
    return [];
  }
  
  return scheduleData.map((emp: any) => {
    const shiftsByDay: { [key: string]: Shift[] } = {};
    
    // If shifts exist, convert them to proper format
    if (emp.shifts) {
      Object.entries(emp.shifts).forEach(([key, value]: [string, any]) => {
        if (Array.isArray(value)) {
  shiftsByDay[key] = value.map((s: any) => ({
    id: s.id,
    employee_id: emp.employee_id || emp.id,
    employee_name: emp.employee_name || emp.name,
    title: s.title || 'Shift',
    start: s.start_time || s.start || '09:00',
    end: s.end_time || s.end || '17:00',
    status: s.status || 'scheduled',
    is_late: s.is_late || false,
    location: s.location || '',
    description: s.description || '',
    department: emp.department || ''
  }));
}
else if (value && typeof value === 'object') {

  // 🔥 ensure array append, not overwrite
  if (!shiftsByDay[key]) {
    shiftsByDay[key] = [];
  }

  shiftsByDay[key].push({
    id: value.id,
    employee_id: emp.employee_id || emp.id,
    employee_name: emp.employee_name || emp.name,
    title: value.title || 'Shift',
    start: value.start_time || value.start || '09:00',
    end: value.end_time || value.end || '17:00',
    status: value.status || 'scheduled',
    is_late: value.is_late || false,
    location: value.location || '',
    description: value.description || '',
    department: emp.department || ''
  });
}
      });
    }
    
    return {
      employee_id: emp.employee_id || emp.id,
      employee_name: emp.employee_name || emp.name || 'Unknown',
      position: emp.position || '',
      status: emp.status || 'active',
      department: emp.department || '',
      shifts: shiftsByDay
    };
  });
};

export const extractDepartments = (schedule: EmployeeSchedule[]): string[] => {
  const depts = schedule
    .map(emp => emp.department)
    .filter((dept): dept is string => !!dept);
  
  return ['All Departments', ...new Set(depts)];
};