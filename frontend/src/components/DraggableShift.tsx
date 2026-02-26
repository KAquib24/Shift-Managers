// import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ShiftProps {
  id: number;
  title: string;
  start: string;
  end: string;
  employee_name: string;
  employee_id: number;
  is_late?: boolean;
  status?: string;
  onDelete?: () => void;
}

function DraggableShift({ id, title, start, end, employee_name, is_late, status, onDelete }: ShiftProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        p-2 rounded cursor-move relative group
        ${is_late ? 'bg-red-50 border-l-4 border-red-500' : 
          status === 'in_progress' ? 'bg-green-50 border-l-4 border-green-500' : 
          'bg-white hover:bg-gray-50 border border-gray-200'}
      `}
    >
      <div className="text-xs font-medium">{start} - {end}</div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-gray-600">{employee_name}</div>
      {is_late && <span className="text-xs text-red-600 font-medium">Late</span>}
      
      {/* Delete button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default DraggableShift;