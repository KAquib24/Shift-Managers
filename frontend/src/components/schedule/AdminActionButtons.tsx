import React from 'react';

interface AdminActionButtonsProps {
  onAddClick: () => void;
  onBulkClick: () => void;
  onTemplateClick: () => void;
}

const AdminActionButtons: React.FC<AdminActionButtonsProps> = ({
  onAddClick,
  onBulkClick,
  onTemplateClick
}) => {
  return (
    <div className="mt-6 flex space-x-4">
      <button 
        onClick={onAddClick}
        className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
      >
        <span className="text-xl">+</span>
        <span>Add new shift</span>
      </button>
      <button 
        onClick={onBulkClick}
        className="flex items-center space-x-2 text-green-600 hover:text-green-700"
      >
        <span className="text-xl">📦</span>
        <span>Bulk create</span>
      </button>
      <button 
        onClick={onTemplateClick}
        className="flex items-center space-x-2 text-orange-600 hover:text-orange-700"
      >
        <span className="text-xl">📋</span>
        <span>Create template</span>
      </button>
    </div>
  );
};

export default AdminActionButtons;