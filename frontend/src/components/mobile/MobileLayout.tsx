// frontend/src/components/mobile/MobileLayout.tsx
import { useState, useEffect } from 'react';
import { NativeBiometric } from 'capacitor-native-biometric';
import { Geolocation } from '@capacitor/geolocation';
// import { Filesystem, Directory } from '@capacitor/filesystem';
import { PushNotifications } from '@capacitor/push-notifications';
import { Html5QrcodeScanner } from 'html5-qrcode';
import localforage from 'localforage';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const API = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

interface OfflineShift {
  id: number;
  employee_id: number;
  title: string;
  start_time: string;
  end_time: string;
  synced: boolean;
}

interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface QrData {
  shift_id: number;
  employee_id: number;
  timestamp: string;
  signature: string;
  type: string;
}

function MobileLayout() {
  const [activeTab, setActiveTab] = useState('today');
  const [offlineShifts, setOfflineShifts] = useState<OfflineShift[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const { user } = useAuth();

  // Initialize offline storage
  useEffect(() => {
    localforage.config({
      name: 'workforce-offline',
      storeName: 'offline_data'
    });
    
    loadOfflineData();
    
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initialize push notifications
    initializePushNotifications();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleOnline = () => {
    setIsOnline(true);
    syncOfflineData();
    toast.success('Back online - syncing data...');
  };

  const handleOffline = () => {
    setIsOnline(false);
    toast.error('You are offline - working in offline mode');
  };

  const loadOfflineData = async () => {
    try {
      const stored = await localforage.getItem('offlineShifts');
      if (stored) {
        setOfflineShifts(stored as OfflineShift[]);
      }
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  };

  const syncOfflineData = async () => {
    const unsynced = offlineShifts.filter(s => !s.synced);
    
    for (const shift of unsynced) {
      try {
        await API.post('/shifts/clock', {
          shift_id: shift.id,
          action: 'clock_in',
          time: new Date().toISOString()
        });
        
        shift.synced = true;
      } catch (error) {
        console.error('Failed to sync shift:', shift.id);
      }
    }
    
    await localforage.setItem('offlineShifts', offlineShifts);
    toast.success(`Synced ${unsynced.length} shifts`);
  };

  // ============================================
  // 🔐 BIOMETRIC AUTHENTICATION - FIXED
  // ============================================
  // ============================================
// 🔐 BIOMETRIC AUTHENTICATION - FIXED
// ============================================
const authenticateWithBiometrics = async (): Promise<boolean> => {
  try {
    // Check if biometrics is available
    const isAvailable = await NativeBiometric.isAvailable();
    
    if (!isAvailable.isAvailable) {
      toast.error('Biometrics not available on this device');
      return false;
    }
    
    // Verify identity with biometrics
    // This will throw an error if verification fails
    await NativeBiometric.verifyIdentity({
      reason: 'Authenticate to clock in',
      title: 'Verify Identity',
      subtitle: 'Use your fingerprint or face to verify',
      description: 'Please authenticate to clock in for your shift'
    });
    
    // If we get here, verification was successful
    toast.success('Biometric verification successful');
    return true;
    
  } catch (error) {
    console.error('Biometric error:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('cancel')) {
        toast.error('Biometric verification cancelled');
      } else if (error.message.includes('not available')) {
        toast.error('Biometrics not available');
      } else {
        toast.error('Biometric verification failed');
      }
    } else {
      toast.error('Biometric verification failed');
    }
    
    return false;
  }
};

  // ============================================
  // 📍 GET CURRENT LOCATION
  // ============================================
  const getCurrentLocation = async (): Promise<Location | null> => {
    try {
      const permission = await Geolocation.requestPermissions();
      
      if (permission.location !== 'granted') {
        toast.error('Location permission denied');
        return null;
      }
      
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy || 0
      };
    } catch (error) {
      console.error('Location error:', error);
      toast.error('Could not get location');
      return null;
    }
  };

  // ============================================
  // 📱 PUSH NOTIFICATIONS
  // ============================================
  const initializePushNotifications = async () => {
    try {
      await PushNotifications.requestPermissions();
      await PushNotifications.register();
      
      PushNotifications.addListener('registration', (token: any) => {
        console.log('Push registration token:', token.value);
        // Send token to backend
        API.post('/notifications/register-device', { token: token.value })
          .catch(error => console.error('Failed to register push token:', error));
      });
      
      PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        toast.custom(() => (
          <div className="bg-white p-4 rounded-lg shadow-lg border-l-4 border-blue-500">
            <div className="font-bold">{notification.title}</div>
            <div className="text-sm">{notification.body}</div>
          </div>
        ));
      });
      
    } catch (error) {
      console.error('Push notification error:', error);
    }
  };

  // ============================================
  // 📷 QR CODE SCANNER
  // ============================================
  const startQrScanner = () => {
    setShowQrScanner(true);
    
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: 250 },
        false
      );
      
      scanner.render(
        async (decodedText: string) => {
          try {
            const qrData: QrData = JSON.parse(decodedText);
            
            // Clock in with QR data
            const response = await API.post('/shifts/clock/qr', qrData);
            
            toast.success(response.data.message);
            setShowQrScanner(false);
            scanner.clear();
            
          } catch (error) {
            toast.error('Invalid QR code');
          }
        },
        (error: string) => {
          console.error('QR scan error:', error);
        }
      );
    }, 500);
  };

  // ============================================
  // ⏰ CLOCK IN (WITH BIOMETRICS + LOCATION)
  // ============================================
  const handleClockIn = async (shiftId: number) => {
    try {
      // Step 1: Biometric auth
      const authenticated = await authenticateWithBiometrics();
      if (!authenticated) return;
      
      // Step 2: Get location
      const location = await getCurrentLocation();
      if (!location) return;
      
      // Step 3: Clock in (with location)
      if (isOnline) {
        const response = await API.post('/shifts/clock/location', {
          shift_id: shiftId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        });
        
        toast.success(`✅ Clocked in! ${response.data.distance_from_office}m from office`);
      } else {
        // Store offline
        const offlineShift: OfflineShift = {
          id: shiftId,
          employee_id: user?.id || 0,
          title: 'Offline Clock In',
          start_time: new Date().toISOString(),
          end_time: '',
          synced: false
        };
        
        const updated = [...offlineShifts, offlineShift];
        setOfflineShifts(updated);
        await localforage.setItem('offlineShifts', updated);
        
        toast.success('📱 Clocked in (offline mode)');
      }
      
    } catch (error) {
      toast.error('Failed to clock in');
    }
  };

  // Update API token when it changes
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      API.defaults.headers.Authorization = `Bearer ${token}`;
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex justify-between items-center border-b">
        <h1 className="text-xl font-bold">Workforce</h1>
        <div className="flex items-center space-x-3">
          {/* Online/Offline indicator */}
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm">{user?.full_name || 'User'}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* QR Scanner Button */}
        <button
          onClick={startQrScanner}
          className="w-full bg-blue-600 text-white p-4 rounded-lg mb-4 flex items-center justify-center space-x-2"
        >
          <span className="text-2xl">📷</span>
          <span>Scan QR to Clock In</span>
        </button>

        {/* QR Scanner Modal */}
        {showQrScanner && (
          <div className="fixed inset-0 bg-black z-50">
            <div className="p-4">
              <button
                onClick={() => setShowQrScanner(false)}
                className="text-white mb-4"
              >
                ← Close
              </button>
              <div id="qr-reader" className="w-full"></div>
            </div>
          </div>
        )}

        {/* Today's Shifts */}
        <h2 className="font-semibold mb-3">Today's Shifts</h2>
        <div className="space-y-3">
          {/* Sample shift card */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between">
              <div>
                <div className="font-medium">Morning Shift</div>
                <div className="text-sm text-gray-600">9:00 AM - 5:00 PM</div>
                <div className="text-xs text-gray-500 mt-1">📍 Main Office</div>
              </div>
              <button
                onClick={() => handleClockIn(1)}
                className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm"
              >
                Clock In
              </button>
            </div>
          </div>
        </div>

        {/* Offline Shifts */}
        {offlineShifts.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium text-yellow-600 mb-2">
              📱 Offline Mode ({offlineShifts.length} pending)
            </h3>
            {offlineShifts.map(shift => (
              <div key={shift.id} className="bg-yellow-50 p-3 rounded-lg mb-2 text-sm">
                Pending sync: {shift.title}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t grid grid-cols-5 py-2">
        <button 
          onClick={() => setActiveTab('today')}
          className={`flex flex-col items-center ${activeTab === 'today' ? 'text-blue-600' : 'text-gray-600'}`}
        >
          <span className="text-xl">📅</span>
          <span className="text-xs">Today</span>
        </button>
        <button 
          onClick={() => setActiveTab('schedule')}
          className={`flex flex-col items-center ${activeTab === 'schedule' ? 'text-blue-600' : 'text-gray-600'}`}
        >
          <span className="text-xl">📋</span>
          <span className="text-xs">Schedule</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('scan');
            startQrScanner();
          }}
          className="flex flex-col items-center"
        >
          <span className="text-xl bg-blue-600 text-white p-2 rounded-full -mt-5">📷</span>
          <span className="text-xs">Scan</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center ${activeTab === 'history' ? 'text-blue-600' : 'text-gray-600'}`}
        >
          <span className="text-xl">📊</span>
          <span className="text-xs">History</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-600'}`}
        >
          <span className="text-xl">👤</span>
          <span className="text-xs">Profile</span>
        </button>
      </div>
    </div>
  );
}

export default MobileLayout;