import React from 'react';
import { format, addDays } from 'date-fns';

interface ScheduleNavigationProps {
  weekStart: Date;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedDepartment: string;
  departments: string[];
  onDepartmentChange: (value: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

const ScheduleNavigation: React.FC<ScheduleNavigationProps> = ({
  weekStart,
  searchTerm,
  onSearchChange,
  selectedDepartment,
  departments,
  onDepartmentChange,
  onPrevWeek,
  onNextWeek
}) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex space-x-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search employees..."
            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
        
        <select
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedDepartment}
          onChange={(e) => onDepartmentChange(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>
      
      <div className="flex items-center space-x-4">
        <button 
          onClick={onPrevWeek}
          className="p-2 hover:bg-gray-100 rounded"
        >
          ←
        </button>
        <span className="font-medium">
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </span>
        <button 
          onClick={onNextWeek}
          className="p-2 hover:bg-gray-100 rounded"
        >
          →
        </button>
      </div>
    </div>
  );
};

export default ScheduleNavigation;