import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const API = axios.create({
  baseURL: "/api"
});

// Add token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface PendingEmployee {
  id: number;
  email: string;
  full_name: string;
  registered_at: string;
}

interface CompanyDetails {
  id: number;
  name: string;
  company_code: string;
  industry?: string;
  size?: string;
}

function AdminDashboard() {
  const [pendingEmployees, setPendingEmployees] = useState<PendingEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchPendingEmployees();
    fetchCompanyDetails();
  }, []);

  const fetchPendingEmployees = async () => {
    try {
      const response = await API.get('/auth/pending-employees');
      setPendingEmployees(response.data.employees);
    } catch (error) {
      console.error('Error fetching pending employees:', error);
      toast.error('Failed to load pending employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyDetails = async () => {
    setCompanyLoading(true);
    try {
      // ✅ FIXED: Use correct endpoint /auth/company/details
      const response = await API.get('/auth/company/details');
      setCompanyDetails(response.data);
    } catch (error: any) {
      console.error('Error fetching company details:', error);
      if (error.response?.status === 404) {
        toast.error('Company details not found');
      }
    } finally {
      setCompanyLoading(false);
    }
  };

  const approveEmployee = async (employeeId: number) => {
    try {
      await API.post(`/auth/approve-employee/${employeeId}`);
      toast.success('Employee approved successfully');
      setPendingEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    } catch (error) {
      toast.error('Failed to approve employee');
    }
  };

  const rejectEmployee = async (employeeId: number) => {
    try {
      // You might want to add a reject endpoint
      toast.success('Employee rejected');
      setPendingEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    } catch (error) {
      toast.error('Failed to reject employee');
    }
  };

  const copyCompanyCode = () => {
    if (companyDetails?.company_code) {
      navigator.clipboard.writeText(companyDetails.company_code);
      toast.success('Company code copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Logout */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.email}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Company Info Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Company Settings</h2>
          
          {companyLoading ? (
            <div className="text-center py-4 text-gray-500">Loading company details...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <div className="text-lg font-semibold mb-4">
                  {companyDetails?.name || 'Your Company'}
                </div>
                {companyDetails?.industry && (
                  <>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Industry
                    </label>
                    <div className="text-lg mb-4">
                      {companyDetails.industry}
                    </div>
                  </>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Company Code
                </label>
                <div className="flex items-center space-x-2">
                  <div className="bg-gray-100 px-4 py-3 rounded-lg font-mono text-xl font-bold tracking-wider">
                    {companyDetails?.company_code || 'Loading...'}
                  </div>
                  {companyDetails?.company_code && (
                    <button
                      onClick={copyCompanyCode}
                      className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Share this code with employees to join your company
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Employees will need this code to register
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold">Pending Employee Approvals</h2>
            <p className="text-sm text-gray-600 mt-1">
              {pendingEmployees.length} employees waiting for approval
            </p>
          </div>
          
          <div className="divide-y">
            {pendingEmployees.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No pending approvals
              </div>
            ) : (
              pendingEmployees.map((employee) => (
                <div key={employee.id} className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{employee.full_name}</h3>
                    <p className="text-sm text-gray-600">{employee.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Registered: {new Date(employee.registered_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => approveEmployee(employee.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => rejectEmployee(employee.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl mb-2">👥</div>
            <div className="text-2xl font-bold">{pendingEmployees.length}</div>
            <div className="text-sm text-gray-600">Pending Approvals</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl mb-2">📅</div>
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-gray-600">Shifts This Week</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl mb-2">⏰</div>
            <div className="text-2xl font-bold">
              {companyDetails ? 'Active' : '0'}
            </div>
            <div className="text-sm text-gray-600">Active Employees</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;