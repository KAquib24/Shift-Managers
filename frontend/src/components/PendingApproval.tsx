import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PendingApproval: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-linear-to-r from-yellow-400 to-orange-500 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
        <div className="text-6xl mb-4">⏳</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Pending Approval</h1>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-gray-700 mb-2">
            Your registration is awaiting admin approval.
          </p>
          <p className="text-sm text-gray-600">
            You'll receive access once an admin approves your request.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/login')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Different Account
          </button>
          
          <button
            onClick={logout}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Logout
          </button>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Contact your admin if you've been waiting too long.
        </p>
      </div>
    </div>
  );
};

export default PendingApproval;