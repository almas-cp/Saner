import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export default function Profile() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Profile</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
}); 