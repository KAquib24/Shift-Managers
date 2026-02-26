import { useState } from 'react';
import axios from 'axios';

function TestAPI() {
  const [status, setStatus] = useState('');

  const testConnection = async () => {
    try {
      setStatus('Testing...');
      const response = await axios.get('http://localhost:8000/health');
      setStatus(`✅ Connected: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
      console.error(error);
    }
  };

  const testLogin = async () => {
    try {
      setStatus('Testing login...');
      const response = await axios.post('http://localhost:8000/api/auth/login', {
        email: 'newfounder@gmail.com',
        password: 'yourpassword'
      });
      setStatus(`✅ Login success: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
      console.error(error);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Test</h1>
      <div className="space-x-4">
        <button 
          onClick={testConnection}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Test Connection
        </button>
        <button 
          onClick={testLogin}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Test Login
        </button>
      </div>
      <div className="mt-4 p-4 bg-gray-100 rounded">
        {status}
      </div>
    </div>
  );
}

export default TestAPI;