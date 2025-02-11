import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../src/contexts/auth';

export default function AuthLayout() {
  const { session } = useAuth();

  if (session) {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      initialRouteName="login"
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: 'Login',
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          title: 'Sign Up',
        }}
      />
    </Stack>
  );
} 