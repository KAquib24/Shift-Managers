import { useState } from 'react';
import toast from 'react-hot-toast';
import { getAPI } from '../utils/api';
import type { Shift, Employee, BulkShift, NewShift, Template } from '../types/schedule.types';
import { addDays, format } from 'date-fns';

export const useShiftActions = (
  weekStart: Date,
  _employees: Employee[],
  _shifts: Shift[],
  _setShifts: React.Dispatch<React.SetStateAction<Shift[]>>,
  refreshData: () => Promise<void>
) => {
  const [bulkShifts, setBulkShifts] = useState<BulkShift[]>([
    { 
      employee_id: 0, 
      title: '', 
      start_time: '09:00', 
      end_time: '17:00', 
      location: '',
      department: '',
      date: format(weekStart, 'yyyy-MM-dd')
    }
  ]);

  const [newShift, setNewShift] = useState<NewShift>({
    employee_id: 0,
    title: '',
    description: '',
    start_time: '09:00',
    end_time: '17:00',
    location: '',
    department: '',
    date: format(weekStart, 'yyyy-MM-dd')
  });

  const [template, setTemplate] = useState<Template>({
    title: '',
    start_time: '09:00',
    end_time: '17:00',
    days_of_week: '0,1,2,3,4',
    department: ''
  });

  const handleDeleteShift = async (shiftId: number, isAdmin: boolean) => {
    if (!isAdmin) {
      toast.error('Only admins can delete shifts');
      return;
    }
    
    if (window.confirm('Delete this shift?')) {
      try {
        const API = getAPI();
        await API.delete(`/shifts/${shiftId}`);
        toast.success('Shift deleted');
        await refreshData();
      } catch (error: any) {
        console.error('Delete error:', error);
        toast.error(error.response?.data?.detail || 'Failed to delete shift');
      }
    }
  };

  const handleAddShift = async (
    e: React.FormEvent<HTMLFormElement>, 
    isAdmin: boolean, 
    onClose: () => void
  ) => {
    e.preventDefault();
    
    if (!isAdmin) {
      toast.error('Only admins can create shifts');
      return;
    }
    
    if (!newShift.employee_id) {
      toast.error('Please select an employee');
      return;
    }
    
    if (!newShift.title) {
      toast.error('Please enter a shift title');
      return;
    }
    
    if (!newShift.date) {
      toast.error('Please select a date');
      return;
    }
    
    try {
      const API = getAPI();
      
      const startDateTime = `${newShift.date}T${newShift.start_time}:00`;
      const endDateTime = `${newShift.date}T${newShift.end_time}:00`;
      
      console.log('Creating shift:', {
        employee_id: newShift.employee_id,
        title: newShift.title,
        date: newShift.date,
        start_time: startDateTime,
        end_time: endDateTime
      });
      
      const response = await API.post('/shifts', {
        employee_id: newShift.employee_id,
        title: newShift.title,
        description: newShift.description || newShift.title,
        start_time: startDateTime,
        end_time: endDateTime,
        location: newShift.location || 'Office',
        department: newShift.department
      });
      
      console.log('✅ Shift created:', response.data);
      toast.success('Shift added successfully');
      
      setNewShift({
        employee_id: 0,
        title: '',
        description: '',
        start_time: '09:00',
        end_time: '17:00',
        location: '',
        department: '',
        date: format(weekStart, 'yyyy-MM-dd')
      });
      
      onClose();
      await refreshData();
      
    } catch (error: any) {
      console.error('Error creating shift:', error);
      
      if (error.response?.status === 403) {
        toast.error('You do not have permission to create shifts');
      } else if (error.response?.status === 422) {
        toast.error('Validation error: ' + JSON.stringify(error.response.data.detail));
      } else {
        toast.error(error.response?.data?.detail || 'Failed to add shift');
      }
    }
  };

  const handleBulkCreate = async (
    e: React.FormEvent<HTMLFormElement>, 
    isAdmin: boolean, 
    onClose: () => void
  ) => {
    e.preventDefault();
    
    if (!isAdmin) {
      toast.error('Only admins can create bulk shifts');
      return;
    }
    
    const invalidShifts = bulkShifts.filter(s => !s.date);
    if (invalidShifts.length > 0) {
      toast.error('Please select a date for all shifts');
      return;
    }
    
    const noEmployeeShifts = bulkShifts.filter(s => !s.employee_id);
    if (noEmployeeShifts.length > 0) {
      toast.error('Please select an employee for all shifts');
      return;
    }
    
    try {
      const API = getAPI();
      
      const formattedShifts = bulkShifts.map(shift => ({
        employee_id: shift.employee_id,
        title: shift.title,
        description: shift.title,
        start_time: `${shift.date}T${shift.start_time}:00`,
        end_time: `${shift.date}T${shift.end_time}:00`,
        location: shift.location || 'Office',
        department: shift.department || ''
      }));
      
      console.log('Creating bulk shifts:', formattedShifts);
      
      const response = await API.post('/shifts/bulk', formattedShifts);
      
      console.log('✅ Bulk shifts created:', response.data);
      toast.success(`${bulkShifts.length} shifts created successfully`);
      
      onClose();
      setBulkShifts([{ 
        employee_id: 0, 
        title: '', 
        start_time: '09:00', 
        end_time: '17:00', 
        location: '',
        department: '',
        date: format(weekStart, 'yyyy-MM-dd')
      }]);
      
      await refreshData();
    } catch (error: any) {
      console.error('Bulk create error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create bulk shifts');
    }
  };

  const handleCreateTemplate = async (
    e: React.FormEvent<HTMLFormElement>, 
    onClose: () => void
  ) => {
    e.preventDefault();
    
    try {
      const API = getAPI();
      
      console.log('Creating template:', template);
      
      const response = await API.post('/shifts/templates', template);
      
      console.log('✅ Template created:', response.data);
      toast.success('Template created successfully');
      
      onClose();
      setTemplate({
        title: '',
        start_time: '09:00',
        end_time: '17:00',
        days_of_week: '0,1,2,3,4',
        department: ''
      });
    } catch (error: any) {
      console.error('Template create error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create template');
    }
  };

  const handleApplyTemplate = async (templateId: number) => {
    try {
      const API = getAPI();
      
      const response = await API.post(`/shifts/templates/${templateId}/apply`, {
        start_date: format(weekStart, 'yyyy-MM-dd'),
        weeks: 4
      });
      
      console.log('✅ Template applied:', response.data);
      toast.success('Template applied for next 4 weeks');
      await refreshData();
    } catch (error: any) {
      console.error('Apply template error:', error);
      toast.error(error.response?.data?.detail || 'Failed to apply template');
    }
  };

  const handleClockIn = async (shiftId: number) => {
    try {
      const API = getAPI();
      const response = await API.post('/shifts/clock', {
        shift_id: shiftId,
        action: 'clock_in'
      });
      
      console.log('✅ Clock in successful:', response.data);
      toast.success('Clocked in successfully');
      await refreshData();
    } catch (error: any) {
      console.error('Clock in error:', error);
      toast.error(error.response?.data?.detail || 'Failed to clock in');
    }
  };

  const handleClockOut = async (shiftId: number) => {
    try {
      const API = getAPI();
      const response = await API.post('/shifts/clock', {
        shift_id: shiftId,
        action: 'clock_out'
      });
      
      console.log('✅ Clock out successful:', response.data);
      toast.success('Clocked out successfully');
      await refreshData();
    } catch (error: any) {
      console.error('Clock out error:', error);
      toast.error(error.response?.data?.detail || 'Failed to clock out');
    }
  };

  const handleUpdateShift = async (shiftId: number, updates: any) => {
    try {
      const API = getAPI();
      const response = await API.put(`/shifts/${shiftId}`, updates);
      
      console.log('✅ Shift updated:', response.data);
      toast.success('Shift updated');
      await refreshData();
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.detail || 'Failed to update shift');
    }
  };

  const downloadReport = async (reportFormat: 'csv' | 'pdf') => {
    try {
      const API = getAPI();
      const response = await API.get('/shifts/reports/attendance', {
        params: {
          start_date: format(weekStart, 'yyyy-MM-dd'),
          end_date: format(addDays(weekStart, 6), 'yyyy-MM-dd'),
          format: reportFormat
        },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report.${reportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`Report downloaded as ${reportFormat.toUpperCase()}`);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.response?.data?.detail || 'Failed to download report');
    }
  };

  const addBulkShiftRow = () => {
    setBulkShifts([...bulkShifts, { 
      employee_id: 0, 
      title: '', 
      start_time: '09:00', 
      end_time: '17:00', 
      location: '',
      department: '',
      date: format(weekStart, 'yyyy-MM-dd')
    }]);
  };

  const removeBulkShiftRow = (index: number) => {
    const newBulkShifts = [...bulkShifts];
    newBulkShifts.splice(index, 1);
    setBulkShifts(newBulkShifts);
  };

  const updateBulkShift = (index: number, field: string, value: any) => {
    const newBulkShifts = [...bulkShifts];
    newBulkShifts[index] = { ...newBulkShifts[index], [field]: value };
    setBulkShifts(newBulkShifts);
  };

  return {
    bulkShifts,
    newShift,
    setNewShift,
    template,
    setTemplate,
    handleDeleteShift,
    handleAddShift,
    handleBulkCreate,
    handleCreateTemplate,
    handleApplyTemplate,
    handleClockIn,
    handleClockOut,
    handleUpdateShift,
    downloadReport,
    addBulkShiftRow,
    removeBulkShiftRow,
    updateBulkShift
  };
};