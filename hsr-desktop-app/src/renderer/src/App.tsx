import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { LicensingService } from '../../shared/licensing';
import { LicenseScreen } from './components/LicenseScreen';
import { MainApplication } from './components/MainApplication';
import { LoadingScreen } from './components/LoadingScreen';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppStateProvider } from './contexts/AppStateContext';

interface AppState {
  isLoading: boolean;
  isLicensed: boolean;
  isTrial: boolean;
  daysRemaining: number;
  licenseError?: string;
}

function App() {
  const [appState, setAppState] = useState<AppState>({
    isLoading: true,
    isLicensed: false,
    isTrial: false,
    daysRemaining: 0
  });

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check licensing status
      const licenseStatus = await LicensingService.isAppLicensed();
      
      setAppState({
        isLoading: false,
        isLicensed: licenseStatus.licensed,
        isTrial: licenseStatus.trial,
        daysRemaining: licenseStatus.daysRemaining,
        licenseError: licenseStatus.error
      });
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setAppState({
        isLoading: false,
        isLicensed: false,
        isTrial: false,
        daysRemaining: 0,
        licenseError: 'Failed to check license status'
      });
    }
  };

  const handleLicenseActivated = () => {
    initializeApp();
  };

  const handleTrialStarted = () => {
    initializeApp();
  };

  if (appState.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider>
      <AppStateProvider>
        <div className="app-container">
          <AnimatePresence mode="wait">
            {!appState.isLicensed ? (
              <motion.div
                key="license"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <LicenseScreen
                  onLicenseActivated={handleLicenseActivated}
                  onTrialStarted={handleTrialStarted}
                  error={appState.licenseError}
                />
              </motion.div>
            ) : (
              <motion.div
                key="main"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <MainApplication
                  isTrial={appState.isTrial}
                  daysRemaining={appState.daysRemaining}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: '0.5rem',
                boxShadow: 'var(--shadow-lg)',
              },
              success: {
                iconTheme: {
                  primary: 'var(--color-success)',
                  secondary: 'var(--color-text-inverse)',
                },
              },
              error: {
                iconTheme: {
                  primary: 'var(--color-error)',
                  secondary: 'var(--color-text-inverse)',
                },
              },
            }}
          />
        </div>
      </AppStateProvider>
    </ThemeProvider>
  );
}

export default App;
