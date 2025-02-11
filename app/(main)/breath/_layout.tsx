import { Stack } from 'expo-router';

export default function BreathLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="exercise"
        options={{
          headerShown: false
        }}
      />
    </Stack>
  );
} 