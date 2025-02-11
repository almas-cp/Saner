import { View, StyleSheet, Pressable } from 'react-native';
import { Title, Subheading } from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Write() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
      <Title style={[styles.title, { color: colors.TEXT.PRIMARY }]}>
        Voice Assistant ✨
      </Title>

      <View style={styles.content}>
        <Pressable 
          style={({ pressed }) => [
            styles.micButton,
            { 
              backgroundColor: colors.TAB_BAR.ACTIVE,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            }
          ]}
        >
          <MaterialCommunityIcons 
            name="microphone" 
            size={32} 
            color={colors.BACKGROUND}
          />
        </Pressable>

        <Subheading style={[styles.hint, { color: colors.TEXT.SECONDARY }]}>
          Hold to speak
        </Subheading>
      </View>
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
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  hint: {
    marginTop: 16,
  },
}); 