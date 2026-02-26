import React, { useState, useEffect } from 'react';
import { getAPI } from '../utils/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface LeaveRequest {
  id: number;
  employee_id: number;
  employee_name?: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface LeaveRequestsProps {
  isAdmin: boolean;
}

const LeaveRequests: React.FC<LeaveRequestsProps> = ({ isAdmin }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // New request form
  const [newRequest, setNewRequest] = useState({
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    reason: ''
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const API = getAPI();
      const endpoint = isAdmin ? '/leave/pending' : '/leave/my-requests';
      const response = await API.get(endpoint);
      setRequests(response.data);
    } catch (error) {
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const API = getAPI();
      await API.post('/leave/request', newRequest);
      toast.success('Leave request submitted');
      setShowRequestModal(false);
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    }
  };

  const handleUpdateStatus = async (id: number, status: 'approved' | 'rejected') => {
    try {
      const API = getAPI();
      await API.patch(`/leave/${id}`, { status });
      toast.success(`Request ${status}`);
      fetchRequests();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b flex justify-between items-center">
        <h2 className="text-xl font-bold">
          {isAdmin ? 'Pending Leave Requests' : 'My Leave Requests'}
        </h2>
        {!isAdmin && (
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Request Leave
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No leave requests</div>
      ) : (
        <div className="divide-y">
          {requests.map((request) => (
            <div key={request.id} className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  {isAdmin && (
                    <p className="font-medium">{request.employee_name}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm mt-2">{request.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Requested: {format(new Date(request.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                  {isAdmin && request.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUpdateStatus(request.id, 'approved')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(request.id, 'rejected')}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Leave Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Request Leave</h3>
            <form onSubmit={handleRequestLeave}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    className="w-full p-2 border rounded"
                    value={newRequest.start_date}
                    onChange={(e) => setNewRequest({...newRequest, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    className="w-full p-2 border rounded"
                    value={newRequest.end_date}
                    onChange={(e) => setNewRequest({...newRequest, end_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reason</label>
                  <textarea
                    required
                    className="w-full p-2 border rounded"
                    rows={3}
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                    placeholder="Why do you need leave?"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequests;