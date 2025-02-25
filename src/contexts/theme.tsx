import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { Theme, COLORS, ColorPalette, getThemeWithPalette } from '../styles/theme';

export type ThemeContextType = {
  theme: Theme;
  colors: any;
  palette: ColorPalette;
  toggleTheme: () => void;
  setColorPalette: (palette: ColorPalette) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme';
const COLOR_PALETTE_STORAGE_KEY = '@app_color_palette';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(systemColorScheme || 'light');
  const [palette, setPaletteState] = useState<ColorPalette>('default');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load saved theme and color palette
    Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(COLOR_PALETTE_STORAGE_KEY)
    ]).then(([savedTheme, savedPalette]) => {
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setTheme(savedTheme);
      }
      
      if (savedPalette && isValidColorPalette(savedPalette)) {
        setPaletteState(savedPalette as ColorPalette);
      }
    }).finally(() => {
      setIsLoaded(true);
    });
  }, []);

  const isValidColorPalette = (palette: string): boolean => {
    return ['default', 'citric', 'mint', 'berry', 'ocean'].includes(palette);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  const setColorPalette = (palette: ColorPalette) => {
    setPaletteState(palette);
    AsyncStorage.setItem(COLOR_PALETTE_STORAGE_KEY, palette);
  };

  // Get the theme colors based on the current theme and selected palette
  const colors = getThemeWithPalette(theme, palette);

  // Show nothing until theme preference is loaded
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      colors,
      palette,
      setColorPalette
    }}>
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