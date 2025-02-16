import { View, StyleSheet } from 'react-native';
import { Title, Button, Text } from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';
import { useAuth } from '../../src/contexts/auth';
import { useRouter } from 'expo-router';

export default function Chat() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  
  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
        <View style={styles.centerContent}>
          <Text 
            style={[styles.message, { color: colors.TEXT.PRIMARY }]}
            variant="bodyLarge"
          >
            Please log in to access the chat feature
          </Text>
          <Button 
            mode="contained" 
            onPress={() => router.push('/profile')}
            style={styles.button}
          >
            Go to Profile
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
      <Title style={[styles.title, { color: colors.TEXT.PRIMARY }]}>
        Chat
      </Title>
      {/* Chat content goes here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    minWidth: 150,
  },
}); 