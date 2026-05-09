import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';
import { Colors, ThemeColors } from '../constants/Colors';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
  setTheme: () => {},
  colors: Colors.light,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = Appearance.getColorScheme();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(systemColorScheme === 'dark');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (e) {
      console.error('Failed to load theme from storage', e);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveTheme = async (isDark: boolean) => {
    try {
      await AsyncStorage.setItem('app_theme', isDark ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme to storage', e);
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    saveTheme(newTheme);
  };

  const setTheme = (isDark: boolean) => {
    setIsDarkMode(isDark);
    saveTheme(isDark);
  };

  const colors = isDarkMode ? Colors.dark : Colors.light;

  if (!isLoaded) return null; // Wait for theme to load to prevent flicker

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};
