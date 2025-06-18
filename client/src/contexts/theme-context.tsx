import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSettings } from '@/hooks/use-settings';

interface ThemeContextType {
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings, updateSettings } = useSettings();
  const [darkMode, setDarkModeState] = useState(false);

  // Initialize dark mode from settings
  useEffect(() => {
    if (settings?.darkMode !== undefined) {
      setDarkModeState(settings.darkMode);
    }
  }, [settings?.darkMode]);

  // Apply dark mode class to HTML element
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const setDarkMode = (newDarkMode: boolean) => {
    setDarkModeState(newDarkMode);
    // Update settings in the backend
    updateSettings({ darkMode: newDarkMode });
  };

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
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