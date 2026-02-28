import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  company_id: number | null;
  phone?: string;
  is_active?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  registerFounder: (userData: any) => Promise<any>;
  registerEmployee: (userData: any) => Promise<any>;
  createCompany: (companyData: any) => Promise<any>;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  isBackendAvailable: boolean;
  userStatus: 'approved' | 'pending' | 'none';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Create axios instance with baseURL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't clear on pending employee login attempts
      if (error.response?.data?.detail?.includes('pending')) {
        return Promise.reject(error);
      }
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendAvailable, setIsBackendAvailable] = useState(true);
  const [userStatus, setUserStatus] = useState<'approved' | 'pending' | 'none'>('none');

  // Check backend availability on mount
  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    try {
      await axios.get('/health', { timeout: 3000 });
      setIsBackendAvailable(true);
    } catch (error) {
      console.warn('⚠️ Backend is not available - using mock data mode');
      setIsBackendAvailable(false);
    }
  };

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser && !user) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setUserStatus(parsedUser.is_active ? 'approved' : 'pending');
      } catch (e) {
        console.error('Error parsing stored user:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (token && isBackendAvailable) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [token, isBackendAvailable]);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      setUserStatus(response.data.is_active ? 'approved' : 'pending');
      localStorage.setItem('role', response.data.role);
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      console.error('❌ Failed to fetch user', error);
      if (isBackendAvailable) {
        // Don't logout automatically, might be pending
        const currentToken = localStorage.getItem('token');
        if (currentToken) {
          // Try to decode token to check status
          try {
            const payload = JSON.parse(atob(currentToken.split('.')[1]));
            setUserStatus(payload.status || 'pending');
          } catch (e) {
            logout();
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      const { access_token, user_id, role, company_id } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('role', role);
      setToken(access_token);
      
      const userData = {
        id: user_id,
        email,
        full_name: '',
        role,
        company_id,
        is_active: true
      };
      
      setUser(userData);
      setUserStatus('approved');
      localStorage.setItem('user', JSON.stringify(userData));
      
      await fetchUser();
    } catch (error: any) {
      // Handle pending employee error
      if (error.response?.data?.detail?.includes('pending')) {
        throw new Error('pending_approval');
      }
      throw error;
    }
  };

  const registerFounder = async (userData: any) => {
    try {
      const response = await api.post('/auth/register/founder', userData);
      
      const { access_token, user_id, role, company_id } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('role', role);
      setToken(access_token);
      
      const newUser = {
        id: user_id,
        email: userData.email,
        full_name: userData.full_name,
        role,
        company_id,
        is_active: true
      };
      
      setUser(newUser);
      setUserStatus('approved');
      localStorage.setItem('user', JSON.stringify(newUser));
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  };

  const registerEmployee = async (userData: any) => {
    try {
      const response = await api.post('/auth/register/employee', {
        ...userData,
        company_code: userData.company_code.toUpperCase()
      });
      
      // Store pending status
      setUserStatus('pending');
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  };

  const createCompany = async (companyData: any) => {
    try {
      const response = await api.post('/auth/company', companyData);
      
      // Update user with new role (ADMIN) and company
      if (user) {
        const updatedUser = {
          ...user,
          company_id: response.data.company_id,
          role: 'admin',  // Founder becomes admin!
          is_active: true
        };
        
        setUser(updatedUser);
        localStorage.setItem('role', 'admin');
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        await fetchUser();
      }
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setUserStatus('none');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      registerFounder,
      registerEmployee,
      createCompany,
      logout, 
      isLoading,
      refreshUser,
      isBackendAvailable,
      userStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};