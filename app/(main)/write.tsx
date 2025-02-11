import { View, StyleSheet, Animated, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useRef } from 'react';

export default function Write() {
  const theme = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    setIsRecording(true);
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsRecording(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Voice Assistant 🪄</Text>
      <View style={styles.buttonContainer}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={({ pressed }) => [
            styles.buttonWrapper,
            pressed && styles.buttonPressed
          ]}
        >
          <Animated.View
            style={[
              styles.button,
              { transform: [{ scale: scaleAnim }] },
              { backgroundColor: theme.colors.primary }
            ]}
          >
            <MaterialCommunityIcons
              name={isRecording ? "microphone" : "microphone-outline"}
              size={48}
              color="#fff"
            />
          </Animated.View>
        </Pressable>
        <Text variant="titleMedium" style={styles.helpText}>
          {isRecording ? "Listening..." : "Hold to speak"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  buttonWrapper: {
    borderRadius: 100,
    padding: 24,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  helpText: {
    color: '#666',
    marginTop: 8,
  },
}); 