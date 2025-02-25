import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Pressable } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/contexts/theme';
import { getCommonStyles } from '../../../src/styles/commonStyles';

// Define the types for phase timing and phases
type PhaseTiming = {
  inhale: number; 
  hold1: number; 
  exhale: number; 
  hold2: number;
};

type Phase = 'inhale' | 'hold1' | 'exhale' | 'hold2';

// Exercise component
export default function Exercise() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { name, pattern } = params;
  
  const { theme, colors, palette } = useTheme();
  const commonStyles = getCommonStyles(theme, palette);

  // Parse the breathing pattern
  const patternArray = pattern ? (pattern as string).split('-').map(Number) : [4, 4, 4, 4];
  const timing: PhaseTiming = {
    inhale: patternArray[0],
    hold1: patternArray[1],
    exhale: patternArray[2],
    hold2: patternArray[3],
  };

  // State for managing the exercise
  const [currentPhase, setCurrentPhase] = useState<Phase>('inhale');
  const [isActive, setIsActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(timing.inhale);
  const [completedCycles, setCompletedCycles] = useState(0);
  
  // Animation values
  const circleScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Function to get the timing for each phase
  const getPhaseTime = (phase: Phase) => {
    return timing[phase];
  };
  
  // Get the action text for the current phase
  const getPhaseText = (phase: Phase) => {
    switch(phase) {
      case 'inhale': return 'Breathe In';
      case 'hold1': return 'Hold';
      case 'exhale': return 'Breathe Out';
      case 'hold2': return 'Hold';
      default: return '';
    }
  };
  
  // Function to move to the next phase
  const nextPhase = () => {
    switch(currentPhase) {
      case 'inhale':
        setCurrentPhase('hold1');
        setCurrentTime(timing.hold1);
        break;
      case 'hold1':
        setCurrentPhase('exhale');
        setCurrentTime(timing.exhale);
        break;
      case 'exhale':
        setCurrentPhase('hold2');
        setCurrentTime(timing.hold2);
        break;
      case 'hold2':
        setCurrentPhase('inhale');
        setCurrentTime(timing.inhale);
        setCompletedCycles(completedCycles + 1);
        break;
    }
  };
  
  // Start or pause the exercise
  const toggleActive = () => {
    setIsActive(!isActive);
  };
  
  // Reset the exercise
  const resetExercise = () => {
    setIsActive(false);
    setCurrentPhase('inhale');
    setCurrentTime(timing.inhale);
    setCompletedCycles(0);
  };
  
  // Handle animations for each phase
  useEffect(() => {
    if (isActive) {
      let animation;
      
      switch(currentPhase) {
        case 'inhale':
          animation = Animated.timing(circleScale, {
            toValue: 1.5,
            duration: timing.inhale * 1000,
            useNativeDriver: true,
          });
          break;
        case 'hold1':
          animation = Animated.timing(fadeAnim, {
            toValue: 0.7,
            duration: timing.hold1 * 500,
            useNativeDriver: true,
          });
          break;
        case 'exhale':
          animation = Animated.timing(circleScale, {
            toValue: 1,
            duration: timing.exhale * 1000,
            useNativeDriver: true,
          });
          break;
        case 'hold2':
          animation = Animated.timing(fadeAnim, {
            toValue: 1,
            duration: timing.hold2 * 500,
            useNativeDriver: true,
          });
          break;
      }
      
      if (animation) {
        animation.start();
      }
    }
  }, [currentPhase, isActive]);
  
  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && currentTime > 0) {
      interval = setInterval(() => {
        setCurrentTime(currentTime - 1);
      }, 1000);
    } else if (isActive && currentTime === 0) {
      nextPhase();
    }
    
    return () => clearInterval(interval);
  }, [isActive, currentTime]);

  // Get gradient colors based on palette
  const getGradientColors = () => {
    if (theme === 'dark') {
      switch (palette) {
        case 'ocean': return { start: '#0D47A1', end: '#1565C0' };
        case 'mint': return { start: '#1B5E20', end: '#2E7D32' };
        case 'berry': return { start: '#B71C1C', end: '#C62828' };
        case 'citric': return { start: '#E65100', end: '#EF6C00' };
        default: return { start: '#4527A0', end: '#5E35B1' }; // Purple theme
      }
    } else {
      switch (palette) {
        case 'ocean': return { start: '#166bb5', end: '#4a6fa1' };
        case 'mint': return { start: '#388E3C', end: '#4AD66D' };
        case 'berry': return { start: '#D32F2F', end: '#E57373' };
        case 'citric': return { start: '#F57C00', end: '#FFB347' };
        default: return { start: '#166bb5', end: '#4a6fa1' };
      }
    }
  };
  
  const gradientColors = getGradientColors();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
      <View style={styles.header}>
        <Pressable 
          style={({ pressed }) => [
            styles.backButton,
            { opacity: pressed ? 0.7 : 1 }
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.TEXT.PRIMARY} />
          <Text style={[styles.backText, { color: colors.TEXT.PRIMARY }]}>Back</Text>
        </Pressable>
        
        <Text style={[commonStyles.heading, styles.title]}>
          {name || 'Breathing Exercise'}
        </Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.infoContainer}>
          <Text style={[commonStyles.subheading, styles.phaseText]}>
            {getPhaseText(currentPhase)}
          </Text>
          <Text style={[commonStyles.body, styles.timeText]}>
            {currentTime}s
          </Text>
          <Text style={[commonStyles.caption, styles.cyclesText]}>
            Completed Cycles: {completedCycles}
          </Text>
        </View>
        
        <View style={styles.circleContainer}>
          <Animated.View 
            style={[
              styles.breathCircle,
              {
                transform: [{ scale: circleScale }],
                opacity: fadeAnim,
                backgroundColor: currentPhase === 'inhale' || currentPhase === 'exhale' 
                  ? gradientColors.start
                  : gradientColors.end,
              }
            ]}
          >
            <Text style={styles.circleText}>
              {getPhaseText(currentPhase)}
            </Text>
          </Animated.View>
        </View>
        
        <View style={styles.controlsContainer}>
          <Button
            mode="contained"
            style={[commonStyles.button, styles.controlButton]}
            labelStyle={{ color: '#fff' }}
            onPress={toggleActive}
          >
            {isActive ? 'Pause' : 'Start'}
          </Button>
          
          <Button
            mode="outlined"
            style={[commonStyles.button, styles.controlButton]}
            onPress={resetExercise}
          >
            Reset
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    marginLeft: 4,
  },
  title: {
    fontSize: 28,
    marginBottom: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  phaseText: {
    fontSize: 22,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 18,
    marginBottom: 16,
  },
  cyclesText: {
    fontSize: 14,
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  breathCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 40,
  },
  controlButton: {
    width: 150,
  }
}); 