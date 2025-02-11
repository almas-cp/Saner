import { Slot, Stack, useSegments, useRouter } from 'expo-router';
import { ThemeProvider } from '../src/providers/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/contexts/auth';
import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      const inAuthGroup = segments[0] === '(auth)';
      
      if (session && inAuthGroup) {
        router.replace('/(main)');
      } else if (!session && !inAuthGroup) {
        router.replace('/(auth)/login');
      }
    }
  }, [session, segments, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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