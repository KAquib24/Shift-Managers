import React from 'react';
import { format, addDays } from 'date-fns';
import type { EmployeeSchedule } from '../../types/schedule.types';
import ShiftCell from './ShiftCell';
import { getStatusColor } from '../../utils/scheduleHelpers';

interface EmployeeRowProps {
  employee: EmployeeSchedule;
  weekStart: Date;
  days: string[];
  isAdmin: boolean;
  onClockIn: (id: number) => void;
  onClockOut: (id: number) => void;
  onEdit: (id: number, updates: any) => void;
  onDelete: (id: number) => void;
}

const EmployeeRow: React.FC<EmployeeRowProps> = ({
  employee,
  weekStart,
  days,
  isAdmin,
  onClockIn,
  onClockOut,
  onEdit,
  onDelete
}) => {
  return (
    <tr className="hover:bg-gray-50">
      <td className="p-3 border-b font-medium">
        <div>{employee.employee_name}</div>
        <div className="text-xs text-gray-500">{employee.department}</div>
        <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${getStatusColor(employee.status)}`}>
          {employee.status}
        </span>
      </td>
      
      {days.map((day) => {
        const date = addDays(weekStart, days.indexOf(day));
        
        // ✅ FIX: Direct day name se access (same as working code)
        const shift = employee.shifts[day as keyof typeof employee.shifts];
        
        // ✅ Multiple shifts ke liye - agar shift array hai toh array bhejo, nahi toh single shift ko array mein wrap karo
        const dayShifts = Array.isArray(shift) ? shift : (shift ? [shift] : []);
        
        return (
          <td key={`${employee.employee_id}-${day}`} className="p-1 border-b align-top">
            <ShiftCell
              day={day}
              date={date}
              shifts={dayShifts}
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
};

export default EmployeeRow;