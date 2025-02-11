import { Slot, Stack, useSegments, useRouter } from 'expo-router';
import { ThemeProvider } from '../src/providers/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/contexts/auth';
import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';

function RootLayoutNav() {
  // Bypass auth check - always render main app
  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootLayoutNav />
        </ThemeProvider>
      </SafeAreaProvider>
    </AuthProvider>
  );
} 