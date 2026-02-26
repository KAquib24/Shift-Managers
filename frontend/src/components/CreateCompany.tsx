import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function CreateCompany() {
  console.log('🔥 CreateCompany component is RENDERING!');
  
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    size: '1-10',
    timezone: 'America/New_York',
    currency: 'USD'
  });
  const [loading, setLoading] = useState(false);
  const [companyCode, setCompanyCode] = useState<string | null>(null);
  const { createCompany, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('📌 CreateCompany mounted');
    console.log('👤 User in CreateCompany:', user);
    
    // Agar user ke paas already company hai to redirect
    if (user?.company_id) {
      console.log('✅ User already has company, redirecting...');
      navigate('/schedule');
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('📤 Submitting company data:', formData);
      const response = await createCompany(formData);
      console.log('✅ Company created:', response);
      
      setCompanyCode(response.company_code);
      toast.success('Company created successfully!');
      
      // Wait 3 seconds then redirect
      setTimeout(() => {
        navigate('/schedule');
      }, 3000);
      
    } catch (error: any) {
      console.error('❌ Company creation error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  // Agar company code mil gaya to success message dikhao
  if (companyCode) {
    return (
      <div className="min-h-screen bg-linear-to-r from-green-500 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Company Created!</h2>
          <p className="text-gray-600 mb-6">
            Share this code with your employees:
          </p>
          <div className="bg-gray-100 p-4 rounded-lg mb-6">
            <p className="text-3xl font-mono font-bold text-blue-600 tracking-wider">
              {companyCode}
            </p>
          </div>
          <p className="text-sm text-gray-500">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-linear-to-r from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Create Your Company</h2>
        <p className="text-gray-600 mb-6 text-center">
          You're almost there! Set up your company to start managing shifts.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
            <input
              type="text"
              name="name"
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.name}
              onChange={handleChange}
              placeholder="Acme Inc."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
            <input
              type="text"
              name="industry"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.industry}
              onChange={handleChange}
              placeholder="Technology, Healthcare, Retail..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Size</label>
            <select
              name="size"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.size}
              onChange={handleChange}
            >
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-500">201-500 employees</option>
              <option value="500+">500+ employees</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
              <select
                name="timezone"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.timezone}
                onChange={handleChange}
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Asia/Dubai">Dubai</option>
                <option value="Asia/Singapore">Singapore</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
              <select
                name="currency"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.currency}
                onChange={handleChange}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="SGD">SGD (S$)</option>
              </select>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 mt-6"
          >
            {loading ? 'Creating...' : 'Create Company'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateCompany;