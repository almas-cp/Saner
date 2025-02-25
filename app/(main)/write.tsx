import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { Title, Subheading, Text } from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

export default function Write() {
  const { colors } = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    );
    
    animation.start();
    
    return () => animation.stop();
  }, []);

  return (
    <LinearGradient
      colors={[colors.BACKGROUND, colors.BACKGROUND, colors.SURFACE]}
      style={styles.container}
    >
      <View style={styles.header}>
        <Title style={[styles.title, { color: colors.TEXT.PRIMARY }]}>
          Voice Assistant ✨
        </Title>
        <Text style={[styles.subtitle, { color: colors.TEXT.SECONDARY }]}>
          Talk to Saner's AI assistant for help with your mental wellbeing
        </Text>
      </View>

      <View style={styles.content}>
        <Animated.View
          style={{
            transform: [{ scale: isPressed ? 1 : pulseAnim }],
            shadowColor: colors.TAB_BAR.ACTIVE,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isPressed ? 0.4 : 0.2,
            shadowRadius: isPressed ? 16 : 8,
          }}
        >
          <Pressable 
            style={({ pressed }) => [
              styles.micButton,
              { 
                backgroundColor: colors.TAB_BAR.ACTIVE,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              }
            ]}
            onPressIn={() => setIsPressed(true)}
            onPressOut={() => setIsPressed(false)}
          >
            <MaterialCommunityIcons 
              name="microphone" 
              size={40} 
              color="#fff"
            />
          </Pressable>
        </Animated.View>

        <Subheading style={[styles.hint, { color: colors.TEXT.SECONDARY }]}>
          {isPressed ? "I'm listening..." : "Hold to speak"}
        </Subheading>
      </View>
      
      <View style={styles.suggestionsContainer}>
        <Text style={[styles.suggestionsTitle, { color: colors.TEXT.PRIMARY }]}>
          Try asking:
        </Text>
        
        {suggestions.map((suggestion, index) => (
          <View 
            key={index}
            style={[
              styles.suggestionCard,
              { 
                backgroundColor: colors.CARD,
                borderColor: colors.BORDER,
              }
            ]}
          >
            <MaterialCommunityIcons
              name={suggestion.icon}
              size={22}
              color={colors.TAB_BAR.ACTIVE}
              style={{ marginRight: 12 }}
            />
            <Text style={{ color: colors.TEXT.PRIMARY }}>
              {suggestion.text}
            </Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const suggestions = [
  { text: "How can I manage my anxiety?", icon: "brain" },
  { text: "Give me a calming meditation", icon: "meditation" },
  { text: "Help me with positive affirmations", icon: "heart" },
  { text: "What are some sleep improvement tips?", icon: "sleep" },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  hint: {
    marginTop: 24,
    fontWeight: '500',
  },
  suggestionsContainer: {
    marginBottom: 40,
  },
  suggestionsTitle: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '600',
  },
  suggestionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 