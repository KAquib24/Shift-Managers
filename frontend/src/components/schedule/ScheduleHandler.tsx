import React from 'react';

interface ScheduleHeaderProps {
  isAdmin: boolean;
  onBulkClick: () => void;
  onTemplateClick: () => void;
  onReportClick: () => void;
}

const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  isAdmin,
  onBulkClick,
  onTemplateClick,
  onReportClick
}) => {
  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <h1 className="text-xl font-semibold">Schedule</h1>
          <div className="flex items-center space-x-4">
            {isAdmin && (
              <>
                <button 
                  onClick={() => window.location.href = '/admin'}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  👑 Admin
                </button>
                <button 
                  onClick={onBulkClick}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  📦 Bulk
                </button>
                <button 
                  onClick={onTemplateClick}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  📋 Template
                </button>
              </>
            )}
            
            <button 
              onClick={onReportClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              📊 Reports
            </button>
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleHeader;