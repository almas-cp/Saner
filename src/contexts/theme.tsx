import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { Theme, COLORS, ColorPalette, getThemeWithPalette } from '../styles/theme';

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  colors: typeof COLORS.LIGHT | typeof COLORS.DARK;
  colorPalette: ColorPalette;
  setColorPalette: (palette: ColorPalette) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme';
const COLOR_PALETTE_STORAGE_KEY = '@app_color_palette';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(systemColorScheme || 'light');
  const [colorPalette, setColorPaletteState] = useState<ColorPalette>('default');

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
        setColorPaletteState(savedPalette as ColorPalette);
      }
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
    setColorPaletteState(palette);
    AsyncStorage.setItem(COLOR_PALETTE_STORAGE_KEY, palette);
  };

  // Get the theme colors based on the current theme and selected palette
  const colors = getThemeWithPalette(theme, colorPalette);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      colors,
      colorPalette,
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