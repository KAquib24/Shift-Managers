import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Register from './components/Register';
import EnhancedSchedule from './components/schedule/EnhancedSchedule';
import CreateCompany from './components/CreateCompany';
import AdminDashboard from './components/AdminDashboard';
import PendingApproval from './components/PendingApproval';
import DebugSchedule from './components/DebugSchedule';
import { AuthProvider, useAuth } from './context/AuthContext';

// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

function AppRoutes() {
  const { user, isLoading, userStatus } = useAuth();
  
  console.log('📍 AppRoutes - User:', user);
  console.log('📍 AppRoutes - Role:', user?.role);
  console.log('📍 AppRoutes - Status:', userStatus);
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  // Show pending page for unapproved employees
  if (user && userStatus === 'pending') {
    return <PendingApproval />;
  }
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
      <Route path="/debug-schedule" element={<DebugSchedule />} />
      
      {/* Protected routes */}
      <Route
        path="/create-company"
        element={
          user ? (
            // Founder without company
            user.role === 'founder' && !user.company_id ? (
              <CreateCompany />
            ) : (
              <Navigate to="/schedule" />
            )
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      
      <Route
        path="/admin"
        element={
          user ? (
            // Both admin AND founder (after company creation) can access
            (user.role === 'admin' || user.role === 'founder') ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/schedule" />
            )
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      
      <Route
        path="/schedule"
        element={
          user ? (
            <EnhancedSchedule />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      
      {/* Default route */}
      <Route
        path="/"
        element={
          user ? (
            user.role === 'founder' && !user.company_id ? (
              <Navigate to="/create-company" />
            ) : (
              <Navigate to="/schedule" />
            )
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;