import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import MobileLayout from './components/mobile/MobileLayout';
import { AuthProvider } from './context/AuthContext';

const isMobile = Capacitor.isNativePlatform();

function AppMobile() {
  useEffect(() => {
    if (isMobile) {
      // Hide splash screen
      SplashScreen.hide();
      
      // Set status bar
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#ffffff' });
    }
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<MobileLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default AppMobile;