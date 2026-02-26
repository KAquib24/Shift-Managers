import React, { useEffect, useState } from 'react';
import { getAPI } from '../utils/api';
import { format } from 'date-fns';

const DebugSchedule: React.FC = () => {
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const testAPI = async () => {
    setLoading(true);
    setError('');
    try {
      const API = getAPI();
      const weekStart = format(new Date(), 'yyyy-MM-dd');
      
      console.log('🔍 Testing API with week start:', weekStart);
      
      const response = await API.get('/shifts/weekly', {
        params: { week_start: weekStart }
      });
      
      console.log('📦 API Response:', response.data);
      setApiResponse(response.data);
      
    } catch (err: any) {
      console.error('❌ API Error:', err);
      setError(err.response?.data?.detail || err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createTestShift = async () => {
    setLoading(true);
    setError('');
    try {
      const API = getAPI();
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const shiftData = {
        employee_id: 1, // Change this to a valid employee ID
        title: 'Test Shift',
        description: 'Test Description',
        start_time: `${today}T09:00:00`,
        end_time: `${today}T17:00:00`,
        location: 'Office',
        department: 'Engineering'
      };
      
      console.log('Creating test shift:', shiftData);
      
      const response = await API.post('/shifts', shiftData);
      
      console.log('✅ Shift created:', response.data);
      alert('Shift created successfully!');
      
      // Refresh the data
      testAPI();
      
    } catch (err: any) {
      console.error('❌ Create Error:', err);
      setError(err.response?.data?.detail || err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Schedule API Debugger</h1>
      
      <div className="space-x-4 mb-6">
        <button
          onClick={testAPI}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Test Fetch Schedule'}
        </button>
        
        <button
          onClick={createTestShift}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          Create Test Shift
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {apiResponse && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">API Response:</h2>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 text-sm">
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
          
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Schedule Structure:</h3>
            {apiResponse.schedule?.map((emp: any, idx: number) => (
              <div key={idx} className="mb-4 p-3 bg-white rounded border">
                <p><strong>Employee:</strong> {emp.employee_name || emp.name}</p>
                <p><strong>Shifts count:</strong> {Object.keys(emp.shifts || {}).length} days</p>
                <div className="mt-2">
                  <strong>Shift days:</strong>
                  <ul className="list-disc pl-5">
                    {Object.entries(emp.shifts || {}).map(([date, shifts]: [string, any]) => (
                      <li key={date}>
                        {date}: {Array.isArray(shifts) ? shifts.length : 1} shift(s)
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugSchedule;