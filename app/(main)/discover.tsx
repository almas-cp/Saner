import { View, StyleSheet } from 'react-native';
import { Title } from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';

export default function Discover() {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
      <Title style={[styles.title, { color: colors.TEXT.PRIMARY }]}>
        Discover
      </Title>
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
}); 