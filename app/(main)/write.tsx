import { View, StyleSheet, Animated, Pressable, ScrollView } from 'react-native';
import { Text, useTheme, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useRef } from 'react';
import * as Speech from 'expo-speech';

export default function Write() {
  const theme = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const startRecording = async () => {
    try {
      setError('');
      setIsRecording(true);
      // Here we would start speech recognition
      // For now, we'll just show a message
      setText((prev) => prev + "\nSpeech recognition coming soon...");
    } catch (e) {
      setError('Speech recognition not available yet');
      console.error(e);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePressIn = () => {
    startRecording();
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    stopRecording();
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleClear = () => {
    setText('');
    setError('');
  };

  const handleSpeak = async () => {
    try {
      if (text.trim()) {
        await Speech.speak(text, {
          language: 'en',
          pitch: 1,
          rate: 0.9,
        });
      }
    } catch (e) {
      setError('Error speaking text');
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Voice Assistant 🪄</Text>
      
      <ScrollView style={styles.textContainer}>
        <TextInput
          mode="outlined"
          multiline
          value={text}
          onChangeText={setText}
          placeholder="Your text will appear here..."
          style={styles.textInput}
        />
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
        {text ? (
          <View style={styles.buttonGroup}>
            <Button 
              mode="contained-tonal" 
              onPress={handleClear}
              style={styles.actionButton}
            >
              Clear Text
            </Button>
            <Button 
              mode="contained" 
              onPress={handleSpeak}
              style={styles.actionButton}
            >
              Speak Text
            </Button>
          </View>
        ) : null}
      </ScrollView>

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
    marginBottom: 24,
  },
  textContainer: {
    flex: 1,
    marginBottom: 16,
  },
  textInput: {
    minHeight: 120,
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#FF6B6B',
    marginTop: 8,
    textAlign: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  buttonContainer: {
    paddingVertical: 16,
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
  },
}); 