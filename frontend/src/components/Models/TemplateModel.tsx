import React from 'react';
import type{ Template } from '../../types/schedule.types';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  template: Template;
  setTemplate: React.Dispatch<React.SetStateAction<Template>>;
}

const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  template,
  setTemplate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Create Shift Template</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Template Title *</label>
            <input
              type="text"
              required
              className="mt-1 block w-full border rounded-md p-2"
              value={template.title}
              onChange={(e) => setTemplate({...template, title: e.target.value})}
              placeholder="Morning Shift Template"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Time *</label>
              <input
                type="time"
                required
                className="mt-1 block w-full border rounded-md p-2"
                value={template.start_time}
                onChange={(e) => setTemplate({...template, start_time: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Time *</label>
              <input
                type="time"
                required
                className="mt-1 block w-full border rounded-md p-2"
                value={template.end_time}
                onChange={(e) => setTemplate({...template, end_time: e.target.value})}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Days of Week</label>
            <select
              className="mt-1 block w-full border rounded-md p-2"
              value={template.days_of_week}
              onChange={(e) => setTemplate({...template, days_of_week: e.target.value})}
            >
              <option value="0,1,2,3,4">Monday - Friday</option>
              <option value="5,6">Weekends</option>
              <option value="0,1,2,3,4,5,6">Every day</option>
              <option value="0">Mondays only</option>
              <option value="1">Tuesdays only</option>
              <option value="2">Wednesdays only</option>
              <option value="3">Thursdays only</option>
              <option value="4">Fridays only</option>
              <option value="5">Saturdays only</option>
              <option value="6">Sundays only</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Department (Optional)</label>
            <input
              type="text"
              className="mt-1 block w-full border rounded-md p-2"
              value={template.department}
              onChange={(e) => setTemplate({...template, department: e.target.value})}
              placeholder="Leave empty for all departments"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Create Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateModal;