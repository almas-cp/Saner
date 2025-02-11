import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import { Theme } from 'react-native-paper/lib/typescript/types';

const theme: Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6B4DE6',
    secondary: '#83C5BE',
    error: '#FF6B6B',
    success: '#4AD66D',
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <PaperProvider theme={theme}>{children}</PaperProvider>;
} 