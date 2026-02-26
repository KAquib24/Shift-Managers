import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getAPI } from '../utils/api';
import type { EmployeeSchedule, Employee, Shift } from '../types/schedule.types';
import { extractDepartments, transformScheduleData } from '../utils/scheduleHelpers';
import { format } from 'date-fns';

export const useScheduleData = (weekStart: Date, selectedDepartment: string) => {
  const [schedule, setSchedule] = useState<EmployeeSchedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const API = getAPI();
      
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      console.log('🔍 Fetching data for week starting:', weekStartStr);
      
      // Fetch schedule with department filter
      const scheduleRes = await API.get('/shifts/weekly', {
        params: { 
          week_start: weekStartStr,
          department: selectedDepartment || undefined
        }
      });
      
      console.log('📦 RAW API RESPONSE:', JSON.stringify(scheduleRes.data, null, 2));
      
      // Transform the schedule data to ensure proper date grouping
      const transformedSchedule = transformScheduleData(scheduleRes.data.schedule || []);
      console.log('🔄 Transformed schedule:', transformedSchedule);
      
      // Verify that each employee has shifts grouped by date
      transformedSchedule.forEach(emp => {
        console.log(`👤 ${emp.employee_name} - Shifts by date:`, 
          Object.keys(emp.shifts).map(date => ({
            date,
            count: emp.shifts[date]?.length || 0
          }))
        );
      });
      
      setSchedule(transformedSchedule);
      
      // Extract unique departments
      const depts = extractDepartments(transformedSchedule);
      setDepartments(depts);
      
      // Build flat shifts array for any components that need it
      const allShifts: Shift[] = [];
      transformedSchedule.forEach((emp: EmployeeSchedule) => {
        Object.values(emp.shifts).forEach((dayShifts) => {
          if (Array.isArray(dayShifts)) {
            allShifts.push(...dayShifts);
          }
        });
      });
      
      console.log('📋 Total shifts loaded:', allShifts.length);
      setShifts(allShifts);
      
      // Fetch employees list
      try {
        const employeesRes = await API.get('/employees');
        setEmployees(employeesRes.data);
      } catch (err) {
        console.log('⚠️ Could not fetch employees separately');
      }
      
    } catch (error: any) {
      console.error('❌ Error fetching data:', error);
      toast.error(error.response?.data?.detail || 'Failed to load schedule');
      setSchedule([]);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [weekStart, selectedDepartment]);

  return {
    schedule,
    employees,
    shifts,
    departments,
    loading,
    fetchData,
    setShifts
  };
};