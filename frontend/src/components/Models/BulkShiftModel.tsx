import React from 'react';
import type { Employee } from '../../types/schedule.types';
import { format } from 'date-fns';

interface BulkShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  bulkShifts: any[];
  employees: Employee[];
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onUpdateRow: (index: number, field: string, value: any) => void;
  weekStart: Date;
}

const BulkShiftModal: React.FC<BulkShiftModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  bulkShifts,
  employees,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  weekStart
}) => {
  if (!isOpen) return null;

  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    weekDates.push(date);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Bulk Create Shifts</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
        </div>
        
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            {bulkShifts.map((shift, index) => (
              <div key={index} className="border p-4 rounded-lg bg-gray-50 relative">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-lg">Shift #{index + 1}</h3>
                  {bulkShifts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveRow(index)}
                      className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-300 rounded"
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee *
                    </label>
                    <select
                      required
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={shift.employee_id || 0}
                      onChange={(e) => onUpdateRow(index, 'employee_id', parseInt(e.target.value))}
                    >
                      <option value={0}>Select Employee</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} - {emp.department || 'No Dept'}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Date *
                    </label>
                    <select
                      required
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={shift.date || ''}
                      onChange={(e) => onUpdateRow(index, 'date', e.target.value)}
                    >
                      <option value="">Select a day</option>
                      {weekDates.map((date, i) => (
                        <option key={i} value={format(date, 'yyyy-MM-dd')}>
                          {format(date, 'EEEE, MMMM d')}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shift Title *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full p-2 border rounded-lg"
                      value={shift.title || ''}
                      onChange={(e) => onUpdateRow(index, 'title', e.target.value)}
                      placeholder="Morning Shift"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg"
                      value={shift.location || ''}
                      onChange={(e) => onUpdateRow(index, 'location', e.target.value)}
                      placeholder="Main Office"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      className="w-full p-2 border rounded-lg"
                      value={shift.start_time || '09:00'}
                      onChange={(e) => onUpdateRow(index, 'start_time', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      className="w-full p-2 border rounded-lg"
                      value={shift.end_time || '17:00'}
                      onChange={(e) => onUpdateRow(index, 'end_time', e.target.value)}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg"
                      value={shift.department || ''}
                      onChange={(e) => onUpdateRow(index, 'department', e.target.value)}
                      placeholder="Engineering"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={onAddRow}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
            >
              + Add Another Shift
            </button>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Create {bulkShifts.length} {bulkShifts.length === 1 ? 'Shift' : 'Shifts'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkShiftModal;