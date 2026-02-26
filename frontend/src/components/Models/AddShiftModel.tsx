import React from 'react';
import type { Employee } from '../../types/schedule.types';
import { format } from 'date-fns';

interface AddShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newShift: any;
  setNewShift: any;
  employees: Employee[];
  weekStart: Date;
}

const AddShiftModal: React.FC<AddShiftModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  newShift,
  setNewShift,
  employees,
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
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add New Shift</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee *
              </label>
              <select
                required
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                value={newShift.employee_id}
                onChange={(e) => setNewShift({...newShift, employee_id: parseInt(e.target.value)})}
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
                value={newShift.date || ''}
                onChange={(e) => setNewShift({...newShift, date: e.target.value})}
              >
                <option value="">Select a day</option>
                {weekDates.map((date, index) => (
                  <option key={index} value={format(date, 'yyyy-MM-dd')}>
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
                value={newShift.title}
                onChange={(e) => setNewShift({...newShift, title: e.target.value})}
                placeholder="Morning Shift"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  className="w-full p-2 border rounded-lg"
                  value={newShift.start_time}
                  onChange={(e) => setNewShift({...newShift, start_time: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  className="w-full p-2 border rounded-lg"
                  value={newShift.end_time}
                  onChange={(e) => setNewShift({...newShift, end_time: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded-lg"
                value={newShift.location}
                onChange={(e) => setNewShift({...newShift, location: e.target.value})}
                placeholder="Main Office"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded-lg"
                value={newShift.department}
                onChange={(e) => setNewShift({...newShift, department: e.target.value})}
                placeholder="Engineering"
              />
            </div>
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Shift
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddShiftModal;