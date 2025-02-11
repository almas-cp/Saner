import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export default function Chat() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Chat</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
}); 