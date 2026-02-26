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

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function EnhancedSchedule() {
  const { user } = useAuth();
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

  const isAdmin =
    user?.role === "admin" || localStorage.getItem("role") === "admin";

  // Wrapper functions to handle form submissions - using React.FormEvent (more generic)
  const handleAddShiftSubmit = (e: React.FormEvent) => {
    // Cast the event to the expected type for handleAddShift
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
          <div className="flex space-x-8">
            <button className="py-4 border-b-2 border-blue-500 text-blue-600">
              Schedule
            </button>
            <button className="py-4 text-gray-600">Tasks</button>
            <button className="py-4 text-gray-600">Location</button>
            <button className="py-4 text-gray-600">People</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
      </div>

      <AddShiftModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddShiftSubmit}
        newShift={newShift}
        setNewShift={setNewShift}
        employees={employees}
        weekStart={weekStart} // Add this line
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
        weekStart={weekStart} // Add this
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
