import { useState } from "react";
import { startOfWeek, subWeeks, addWeeks } from "date-fns";
import { Toaster } from "react-hot-toast";

import { useAuth } from "../../context/AuthContext";
import { useScheduleData } from "../../hooks/useScheduleData";
import { useShiftActions } from "../../hooks/useShiftActions";

import ScheduleHeader from "./ScheduleHandler";
import ScheduleNavigation from "./ScheduleNavigation";
import ScheduleGrid from "./ScheduleGrid";
import AdminActionButtons from "./AdminActionButtons";
import AddShiftModal from "../Models/AddShiftModel";
import BulkShiftModal from "../Models/BulkShiftModel";
import TemplateModal from "../Models/TemplateModel";
import ReportModal from "../Models/ReportModel";
import AttendanceSummary from "../AttendanceSummary";
import LeaveRequests from "../LeaveRequest";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function EnhancedSchedule() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"schedule" | "tasks" | "location" | "people" | "attendance" | "leave">("schedule");
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Custom hooks
  const {
    schedule,
    employees,
    shifts,
    departments,
    loading,
    fetchData,
    setShifts,
  } = useScheduleData(weekStart, selectedDepartment);

  const {
    handleDeleteShift,
    handleAddShift,
    handleBulkCreate,
    handleCreateTemplate,
    handleClockIn,
    handleClockOut,
    handleUpdateShift,
    downloadReport,
    bulkShifts,
    newShift,
    setNewShift,
    template,
    setTemplate,
    addBulkShiftRow,
    removeBulkShiftRow,
    updateBulkShift,
  } = useShiftActions(weekStart, employees, shifts, setShifts, fetchData);

  const isAdmin = user?.role === "admin" || localStorage.getItem("role") === "admin";

  const handleAddShiftSubmit = (e: React.FormEvent) => {
    handleAddShift(e as React.FormEvent<HTMLFormElement>, isAdmin, () =>
      setShowAddModal(false),
    );
  };

  const handleBulkCreateSubmit = (e: React.FormEvent) => {
    handleBulkCreate(e as React.FormEvent<HTMLFormElement>, isAdmin, () =>
      setShowBulkModal(false),
    );
  };

  const handleCreateTemplateSubmit = (e: React.FormEvent) => {
    handleCreateTemplate(e as React.FormEvent<HTMLFormElement>, () =>
      setShowTemplateModal(false),
    );
  };

  const renderTabContent = () => {
    switch(activeTab) {
      case "schedule":
        return (
          <>
            <ScheduleNavigation
              weekStart={weekStart}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedDepartment={selectedDepartment}
              departments={departments}
              onDepartmentChange={setSelectedDepartment}
              onPrevWeek={() => setWeekStart(subWeeks(weekStart, 1))}
              onNextWeek={() => setWeekStart(addWeeks(weekStart, 1))}
            />

            <ScheduleGrid
              schedule={schedule}
              weekStart={weekStart}
              days={days}
              loading={loading}
              searchTerm={searchTerm}
              isAdmin={isAdmin}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              onEdit={handleUpdateShift}
              onDelete={(id) => handleDeleteShift(id, isAdmin)}
            />

            {isAdmin && (
              <AdminActionButtons
                onAddClick={() => setShowAddModal(true)}
                onBulkClick={() => setShowBulkModal(true)}
                onTemplateClick={() => setShowTemplateModal(true)}
              />
            )}
          </>
        );
      
      case "attendance":
        return <AttendanceSummary />;
      
      case "leave":
        return <LeaveRequests isAdmin={isAdmin} />;
      
      case "tasks":
        return (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Tasks Coming Soon</h2>
            <p className="text-gray-600">Task management features are under development.</p>
          </div>
        );
      
      case "location":
        return (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">📍</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Location Tracking Coming Soon</h2>
            <p className="text-gray-600">Location-based features are under development.</p>
          </div>
        );
      
      case "people":
        return (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">People Management Coming Soon</h2>
            <p className="text-gray-600">Employee directory and management features are under development.</p>
          </div>
        );
      
      default:
        return (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} section coming soon...
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      <ScheduleHeader
        isAdmin={isAdmin}
        onBulkClick={() => setShowBulkModal(true)}
        onTemplateClick={() => setShowTemplateModal(true)}
        onReportClick={() => setShowReportModal(true)}
      />

      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto pb-1">
            <button 
              onClick={() => setActiveTab("schedule")}
              className={`py-4 px-1 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "schedule" 
                  ? "border-blue-500 text-blue-600 font-medium" 
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Schedule
            </button>
            <button 
              onClick={() => setActiveTab("attendance")}
              className={`py-4 px-1 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "attendance" 
                  ? "border-blue-500 text-blue-600 font-medium" 
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Attendance 📊
            </button>
            <button 
              onClick={() => setActiveTab("leave")}
              className={`py-4 px-1 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "leave" 
                  ? "border-blue-500 text-blue-600 font-medium" 
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Leave 📝
            </button>
            <button 
              onClick={() => setActiveTab("tasks")}
              className={`py-4 px-1 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "tasks" 
                  ? "border-blue-500 text-blue-600 font-medium" 
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Tasks
            </button>
            <button 
              onClick={() => setActiveTab("location")}
              className={`py-4 px-1 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "location" 
                  ? "border-blue-500 text-blue-600 font-medium" 
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Location
            </button>
            <button 
              onClick={() => setActiveTab("people")}
              className={`py-4 px-1 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "people" 
                  ? "border-blue-500 text-blue-600 font-medium" 
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              People
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderTabContent()}
      </div>

      {/* Modals */}
      <AddShiftModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddShiftSubmit}
        newShift={newShift}
        setNewShift={setNewShift}
        employees={employees}
        weekStart={weekStart}
      />

      <BulkShiftModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSubmit={handleBulkCreateSubmit}
        bulkShifts={bulkShifts}
        employees={employees}
        onAddRow={addBulkShiftRow}
        onRemoveRow={removeBulkShiftRow}
        onUpdateRow={updateBulkShift}
        weekStart={weekStart}
      />

      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSubmit={handleCreateTemplateSubmit}
        template={template}
        setTemplate={setTemplate}
      />

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        weekStart={weekStart}
        onDownload={downloadReport}
      />
    </div>
  );
}

export default EnhancedSchedule;