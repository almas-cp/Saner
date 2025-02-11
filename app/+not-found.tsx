import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text variant="headlineMedium">This screen doesn't exist.</Text>
        <Link href="/">
          <Text variant="labelLarge" style={{ marginTop: 10, color: '#6B4DE6' }}>
            Go to home screen!
          </Text>
        </Link>
      </View>
    </>
  );
} 