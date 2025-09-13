import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('hsr-theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemeState(savedTheme);
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      updateActualTheme(theme);
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    updateActualTheme(savedTheme || 'system');

    // Listen for Electron theme changes
    if (window.electronAPI?.onThemeChanged) {
      window.electronAPI.onThemeChanged((isDark: boolean) => {
        if (theme === 'system') {
          setActualTheme(isDark ? 'dark' : 'light');
          applyTheme(isDark ? 'dark' : 'light');
        }
      });
    }

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  const updateActualTheme = (currentTheme: Theme) => {
    let newActualTheme: 'light' | 'dark';

    if (currentTheme === 'system') {
      newActualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      newActualTheme = currentTheme;
    }

    setActualTheme(newActualTheme);
    applyTheme(newActualTheme);
  };

  const applyTheme = (themeToApply: 'light' | 'dark') => {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeToApply);
    
    // Update meta theme-color for better integration
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeToApply === 'dark' ? '#0f172a' : '#ffffff');
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('hsr-theme', newTheme);
    updateActualTheme(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = actualTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    actualTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
