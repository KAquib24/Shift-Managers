import React, { useState, useEffect } from 'react';
import { getAPI } from '../utils/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface AttendanceMetrics {
  total_hours: number;
  total_employees: number;
  late_arrivals: number;
  overtime: number;
  absences: number;
}

const AttendanceSummary: React.FC = () => {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [metrics, setMetrics] = useState<AttendanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const API = getAPI();
      const response = await API.get('/shifts/attendance-summary', {
        params: { period }
      });
      setMetrics(response.data.metrics);
    } catch (error) {
      toast.error('Failed to load attendance summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [period]);

  const MetricCard = ({ title, value, icon, color }: any) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <div className={`text-3xl ${color}`}>{icon}</div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Attendance Summary</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg ${
              period === 'week' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg ${
              period === 'month' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Total Hours"
            value={`${metrics.total_hours}h`}
            icon="⏰"
            color="text-blue-600"
          />
          <MetricCard
            title="Employees"
            value={metrics.total_employees}
            icon="👥"
            color="text-purple-600"
          />
          <MetricCard
            title="Late Arrivals"
            value={metrics.late_arrivals}
            icon="⚠️"
            color="text-red-600"
          />
          <MetricCard
            title="Overtime"
            value={metrics.overtime}
            icon="⏱️"
            color="text-orange-600"
          />
          <MetricCard
            title="Absences"
            value={metrics.absences}
            icon="❌"
            color="text-gray-600"
          />
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">No data available</div>
      )}
    </div>
  );
};

export default AttendanceSummary;