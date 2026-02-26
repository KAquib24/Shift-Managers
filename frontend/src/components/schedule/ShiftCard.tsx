import React from 'react';
import type { Shift } from '../../types/schedule.types';

interface ShiftCardProps {
  shift: Shift;
  isAdmin: boolean;
  onClockIn: (id: number) => void;
  onClockOut: (id: number) => void;
  onEdit: (id: number, updates: any) => void;
  onDelete: (id: number) => void;
}

const ShiftCard: React.FC<ShiftCardProps> = ({
  shift,
  isAdmin,
  onClockIn,
  onClockOut,
  onEdit,
  onDelete
}) => {
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    if (timeStr.includes('T')) {
      return timeStr.split('T')[1].substring(0, 5);
    }
    return timeStr.substring(0, 5);
  };

  // Determine background color based on status
  const getBgColor = () => {
    if (shift.is_late) return 'bg-red-100 border-red-300';
    if (shift.status === 'in_progress') return 'bg-green-100 border-green-300';
    return 'bg-blue-100 border-blue-300';
  };

  return (
    <div className={`p-2 rounded border-2 ${getBgColor()} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="text-xs font-bold">
        {formatTime(shift.start)} - {formatTime(shift.end)}
      </div>
      <div className="text-sm font-semibold">{shift.title}</div>
      {shift.location && (
        <div className="text-xs">📍 {shift.location}</div>
      )}
      
      <div className="flex gap-1 mt-2">
        {shift.status === 'scheduled' && (
          <button
            onClick={() => onClockIn(shift.id)}
            className="text-xs bg-white px-2 py-1 rounded border hover:bg-gray-50 flex-1"
          >
            ⏰ Clock In
          </button>
        )}
        {shift.status === 'in_progress' && (
          <button
            onClick={() => onClockOut(shift.id)}
            className="text-xs bg-white px-2 py-1 rounded border hover:bg-gray-50 flex-1"
          >
            ⏹️ Clock Out
          </button>
        )}
        
        {isAdmin && (
          <>
            <button
              onClick={() => {
                const newTitle = prompt('New title:', shift.title);
                if (newTitle) onEdit(shift.id, { title: newTitle });
              }}
              className="text-xs bg-white px-2 py-1 rounded border hover:bg-gray-50"
            >
              ✏️
            </button>
            <button
              onClick={() => {
                if (window.confirm('Delete this shift?')) {
                  onDelete(shift.id);
                }
              }}
              className="text-xs bg-white px-2 py-1 rounded border hover:bg-gray-50"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ShiftCard;