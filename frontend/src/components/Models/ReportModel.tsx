import React from 'react';
import { format, addDays } from 'date-fns';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekStart: Date;
  onDownload: (format: 'csv' | 'pdf') => void;
}

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  weekStart,
  onDownload
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Download Reports</h2>
        <div className="space-y-4">
          <p className="text-gray-600">
            Week: {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onDownload('csv')}
              className="p-4 border rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium">CSV</div>
              <div className="text-sm text-gray-500">Excel compatible</div>
            </button>
            
            <button
              onClick={() => onDownload('pdf')}
              className="p-4 border rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-2">📄</div>
              <div className="font-medium">PDF</div>
              <div className="text-sm text-gray-500">Printable report</div>
            </button>
          </div>
          
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;