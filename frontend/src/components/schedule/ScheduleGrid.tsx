import React from 'react';
import { format, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import type { EmployeeSchedule, Shift } from '../../types/schedule.types';
import ShiftCell from './ShiftCell';

interface ScheduleGridProps {
  schedule: EmployeeSchedule[];
  weekStart: Date;
  days: string[];
  loading: boolean;
  searchTerm: string;
  isAdmin: boolean;
  onClockIn: (id: number) => void;
  onClockOut: (id: number) => void;
  onEdit: (id: number, updates: any) => void;
  onDelete: (id: number) => void;
}

const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  schedule,
  weekStart,
  days,
  loading,
  searchTerm,
  isAdmin,
  onClockIn,
  onClockOut,
  onEdit,
  onDelete
}) => {
  const weekDates: Date[] = eachDayOfInterval({
    start: startOfWeek(weekStart, { weekStartsOn: 1 }),
    end: endOfWeek(weekStart, { weekStartsOn: 1 })
  });

  const filteredSchedule = schedule.filter(emp => 
    emp.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('🔥 ScheduleGrid received:', schedule);
  console.log('🔥 Week dates:', weekDates.map(d => format(d, 'yyyy-MM-dd')));

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-8 text-center text-gray-500">Loading schedule...</div>
      </div>
    );
  }

  if (filteredSchedule.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-8 text-center text-gray-500">No employees found</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-3 text-left text-sm font-medium text-gray-600 border-b w-48">
                Employee
              </th>
              {weekDates.map((date, index) => (
                <th key={index} className="p-3 text-left text-sm font-medium text-gray-600 border-b min-w-[150px]">
                  <div>{days[index]}</div>
                  <div className="text-xs text-gray-400">{format(date, 'MMM d')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSchedule.map((employee) => {
              // Log employee shifts to debug
              console.log(`👤 ${employee.employee_name} shifts:`, employee.shifts);
              
              return (
                <tr key={employee.employee_id} className="hover:bg-gray-50">
                  <td className="p-3 border-b font-medium">
                    <div>{employee.employee_name}</div>
                    <div className="text-xs text-gray-500">{employee.department}</div>
                  </td>
                  {weekDates.map((date, index) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    
                    // Try multiple ways to get shifts
                    let shiftsForDate: Shift[] = [];
                    
                    // Method 1: Direct by date string
                    if (employee.shifts && employee.shifts[dateStr]) {
                      if (Array.isArray(employee.shifts[dateStr])) {
                        shiftsForDate = employee.shifts[dateStr];
                      } else {
                        shiftsForDate = [employee.shifts[dateStr] as Shift];
                      }
                    }
                    // Method 2: Try by day name
                    else if (employee.shifts && employee.shifts[days[index]]) {
                      if (Array.isArray(employee.shifts[days[index]])) {
                        shiftsForDate = employee.shifts[days[index]];
                      } else {
                        shiftsForDate = [employee.shifts[days[index]] as Shift];
                      }
                    }
                    
                    if (shiftsForDate.length > 0) {
                      console.log(`✅ ${employee.employee_name} - ${dateStr}: ${shiftsForDate.length} shifts`);
                    }
                    
                    return (
                      <td key={`${employee.employee_id}-${dateStr}`} className="p-1 border-b align-top">
                        <ShiftCell
                          date={date}
                          shifts={shiftsForDate}
                          isAdmin={isAdmin}
                          onClockIn={onClockIn}
                          onClockOut={onClockOut}
                          onEdit={onEdit}
                          onDelete={onDelete}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScheduleGrid;