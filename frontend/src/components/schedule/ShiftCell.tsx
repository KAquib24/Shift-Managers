import React from 'react';
import type { Shift } from '../../types/schedule.types';
import ShiftCard from './ShiftCard';
import { isTodayDate } from '../../utils/scheduleHelpers';
import { format } from 'date-fns';

interface ShiftCellProps {
  date: Date;
  shifts: Shift[];
  isAdmin: boolean;
  onClockIn: (id: number) => void;
  onClockOut: (id: number) => void;
  onEdit: (id: number, updates: any) => void;
  onDelete: (id: number) => void;
}

const ShiftCell: React.FC<ShiftCellProps> = ({
  date,
  shifts,
  isAdmin,
  onClockIn,
  onClockOut,
  onEdit,
  onDelete
}) => {
  const isToday = isTodayDate(date);
  const safeShifts = Array.isArray(shifts) ? shifts : [];
  
  console.log(`📦 ShiftCell for ${format(date, 'yyyy-MM-dd')}:`, safeShifts);

  if (safeShifts.length === 0) {
    return (
      <div className={`p-2 min-h-25px ${isToday ? 'bg-blue-50' : ''} flex items-center justify-center border border-dashed border-gray-200 rounded`}>
        <span className="text-xs text-gray-400">No shift</span>
      </div>
    );
  }

  return (
    <div className={`p-2 min-h-25 ${isToday ? 'bg-blue-50' : ''}`}>
      <div className="space-y-2">
        {safeShifts.map((shift, index) => (
          <ShiftCard
            key={shift.id || `shift-${index}`}
            shift={shift}
            isAdmin={isAdmin}
            onClockIn={onClockIn}
            onClockOut={onClockOut}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default ShiftCell;