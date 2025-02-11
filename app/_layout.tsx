import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/contexts/auth';
import { ThemeProvider } from '../src/contexts/theme';
import { PaperProvider, MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import { useTheme } from '../src/contexts/theme';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { COLORS } from '../src/styles/theme';

function ThemedLayout() {
  const { theme, colors } = useTheme();
  
  const { DarkTheme: NavigationDarkTheme, LightTheme: NavigationLightTheme } = 
    adaptNavigationTheme({
      reactNavigationDark: DarkTheme,
      reactNavigationLight: DefaultTheme,
    });

  const baseTheme = theme === 'dark' ? MD3DarkTheme : MD3LightTheme;
  const navigationTheme = theme === 'dark' ? NavigationDarkTheme : NavigationLightTheme;

  const paperTheme = {
    ...baseTheme,
    ...navigationTheme,
    colors: {
      ...baseTheme.colors,
      ...navigationTheme.colors,
      primary: colors.TAB_BAR.ACTIVE,
      secondary: COLORS.BRAND.SECONDARY,
      background: colors.BACKGROUND,
      surface: colors.SURFACE,
      surfaceVariant: colors.CARD,
      text: colors.TEXT.PRIMARY,
      onSurface: colors.TEXT.PRIMARY,
      onSurfaceVariant: colors.TEXT.SECONDARY,
      outline: colors.BORDER,
    },
    // Use the default MD3 typescale
    fonts: baseTheme.fonts
  };

  return (
    <PaperProvider theme={paperTheme}>
      <SafeAreaProvider>
        <Slot />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ThemedLayout />
      </ThemeProvider>
    </AuthProvider>
  );
} 