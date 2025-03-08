import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated, 
  Pressable, 
  Alert, 
  Image, 
  ScrollView,
  RefreshControl
} from 'react-native';
import { Text, Button, Snackbar } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/contexts/theme';
import { getCommonStyles } from '../../../src/styles/commonStyles';
import { supabase } from '../../../src/lib/supabase';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';

// Define the types for phase timing and phases
type PhaseTiming = {
  inhale: number; 
  hold1: number; 
  hold2: number; 
  exhale: number;
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
    inhale: patternArray[0] || 4,
    hold1: patternArray[1] || 4,
    exhale: patternArray[2] || 4,
    hold2: patternArray[3] || 4,
  };

  // State for managing the exercise
  const [currentPhase, setCurrentPhase] = useState<Phase>('inhale');
  const [isActive, setIsActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(timing.inhale);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Animation values
  const circleScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reset animation values when component mounts
  useEffect(() => {
    circleScale.setValue(1);
    fadeAnim.setValue(1);
  }, []);
  
  // Session timer
  useEffect(() => {
    if (isActive) {
      sessionTimerRef.current = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    } else if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };
  }, [isActive]);
  
  // Check authentication
  useEffect(() => {
    checkAuth();
  }, []);
  
  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, []);
  
  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
  };

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
    // Stop any running animation
    if (animationRef.current) {
      animationRef.current.stop();
    }
    
    switch(currentPhase) {
      case 'inhale':
        setCurrentPhase('hold1');
        setCurrentTime(timing.hold1);
        startAnimation('hold1');
        break;
      case 'hold1':
        setCurrentPhase('exhale');
        setCurrentTime(timing.exhale);
        startAnimation('exhale');
        break;
      case 'exhale':
        setCurrentPhase('hold2');
        setCurrentTime(timing.hold2);
        startAnimation('hold2');
        break;
      case 'hold2':
        setCurrentPhase('inhale');
        setCurrentTime(timing.inhale);
        startAnimation('inhale');
        setCompletedCycles(prev => prev + 1);
        break;
    }
  };
  
  // Start the appropriate animation for the current phase
  const startAnimation = (phase: Phase) => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
    
    // Reset animation values based on the phase
    if (phase === 'inhale') {
      // Start from small circle for inhale
      circleScale.setValue(1);
    } else if (phase === 'exhale') {
      // Start from large circle for exhale
      circleScale.setValue(1.5);
    } else if (phase === 'hold1') {
      // Start from full opacity for hold1
      fadeAnim.setValue(1);
    } else if (phase === 'hold2') {
      // Start from reduced opacity for hold2
      fadeAnim.setValue(0.7);
    }
    
    let animation;
    const duration = timing[phase] * 1000;
    
    switch(phase) {
      case 'inhale':
        // Expand the circle during inhale
        animation = Animated.timing(circleScale, {
          toValue: 1.5,
          duration: duration,
          useNativeDriver: true,
        });
        break;
      case 'hold1':
        // Reduce opacity during hold1
        animation = Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: duration,
          useNativeDriver: true,
        });
        break;
      case 'exhale':
        // Shrink the circle during exhale
        animation = Animated.timing(circleScale, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        });
        break;
      case 'hold2':
        // Increase opacity during hold2
        animation = Animated.timing(fadeAnim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        });
        break;
    }
    
    if (animation && isActive) {
      animationRef.current = animation;
      animation.start();
    }
  };
  
  // Finish the session
  const finishSession = () => {
    // Stop timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    
    if (isActive) {
      setIsActive(false);
      
      // Stop any running animation
      if (animationRef.current) {
        animationRef.current.stop();
      }
    }
    
    // Only try to save if there's a meaningful session
    if (completedCycles > 0 || sessionDuration > 10) {
      // Show saving message
      setSnackbarMessage('Saving your session...');
      setSnackbarVisible(true);
      
      // Try to save and navigate back regardless of the outcome
      saveSession()
        .then(() => {
          console.log('Session saved successfully');
        })
        .catch((error) => {
          console.error('Error saving session:', error);
        })
        .finally(() => {
          // Always navigate back after a short delay
          setTimeout(() => {
            router.replace('/(main)/breath');
          }, 1500);
        });
    } else {
      // If there's no meaningful session, just go back immediately
      router.replace('/(main)/breath');
    }
  };
  
  // Save session data to the database
  const saveSession = async () => {
    if (!isAuthenticated) {
      setSnackbarMessage('Sign in to save your breathing sessions');
      setSnackbarVisible(true);
      return Promise.resolve();
    }
    
    if (sessionDuration < 10) {
      setSnackbarMessage('Sessions shorter than 10 seconds are not saved');
      setSnackbarVisible(true);
      return Promise.resolve();
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setSnackbarMessage('Please sign in to save your session');
        setSnackbarVisible(true);
        return Promise.resolve();
      }
      
      const { error } = await supabase.from('breath_sessions').insert({
        user_id: user.id,
        exercise_name: name || 'Custom Exercise',
        duration_seconds: sessionDuration,
        pattern: pattern || `${timing.inhale}-${timing.hold1}-${timing.exhale}-${timing.hold2}`,
        created_at: new Date().toISOString(),
        completed: true
      });
      
      if (error) {
        console.error('Error saving session:', error);
        setSnackbarMessage('Failed to save session');
        setSnackbarVisible(true);
        return Promise.reject(error);
      } else {
        setSnackbarMessage('Session saved successfully!');
        setSnackbarVisible(true);
        return Promise.resolve();
      }
    } catch (error) {
      console.error('Error saving session:', error);
      setSnackbarMessage('An error occurred');
      setSnackbarVisible(true);
      return Promise.reject(error);
    }
  };
  
  // Start or pause the exercise
  const toggleActive = () => {
    if (!isActive) {
      setIsActive(true);
      startAnimation(currentPhase);
    } else {
      setIsActive(false);
      // Pause the animation
      if (animationRef.current) {
        animationRef.current.stop();
      }
    }
  };
  
  // Reset the exercise
  const resetExercise = () => {
    // Stop timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    
    setIsActive(false);
    setCurrentPhase('inhale');
    setCurrentTime(timing.inhale);
    setCompletedCycles(0);
    setSessionDuration(0);
    
    // Reset animations
    circleScale.setValue(1);
    fadeAnim.setValue(1);
    
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
  };
  
  // Timer countdown effect
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (isActive && currentTime > 0) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => prev - 1);
      }, 1000);
    } else if (isActive && currentTime === 0) {
      // Schedule the next phase after a short delay to avoid state update conflicts
      setTimeout(() => {
        nextPhase();
      }, 50);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, currentTime]);

  // Format seconds to minutes:seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
    resetExercise();
  };

  // Update animation when isActive changes
  useEffect(() => {
    if (isActive) {
      startAnimation(currentPhase);
    } else if (animationRef.current) {
      animationRef.current.stop();
    }
  }, [isActive]);

  return (
    <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
      <LinearGradient
        colors={['#4a6fa1', colors.BACKGROUND]} 
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Pressable 
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.7 : 1 }
            ]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          
          <Text style={styles.title}>
            {name || 'Breathing Exercise'}
          </Text>
        </View>
      </LinearGradient>
      
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        <View style={styles.content}>
          <View style={styles.infoContainer}>
            <MotiView
              animate={{
                scale: currentPhase === 'inhale' ? [1, 1.05, 1] : 
                      currentPhase === 'exhale' ? [1, 0.98, 1] : 1,
              }}
              transition={{
                type: 'timing',
                duration: 1000,
                loop: isActive
              }}
            >
              <Text style={[commonStyles.subheading, styles.phaseText, { color: colors.TEXT.PRIMARY }]}>
                {getPhaseText(currentPhase)}
              </Text>
            </MotiView>
            
            <Text style={[commonStyles.body, styles.timeText, { color: colors.TEXT.PRIMARY }]}>
              {currentTime}s
            </Text>
            
            <View style={styles.statsRow}>
              <Text style={[commonStyles.caption, styles.cyclesText, { color: colors.TEXT.SECONDARY }]}>
                Completed Cycles: {completedCycles}
              </Text>
              <Text style={[commonStyles.caption, styles.durationText, { color: colors.TEXT.SECONDARY }]}>
                Session: {formatTime(sessionDuration)}
              </Text>
            </View>
          </View>
          
          <View style={styles.circleContainer}>
            <Animated.View 
              style={[
                styles.breathCircle,
                {
                  transform: [{ scale: circleScale }],
                  opacity: fadeAnim,
                  backgroundColor: currentPhase === 'inhale' || currentPhase === 'exhale' 
                    ? '#4a6fa1'  
                    : '#166bb5', 
                  borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  borderWidth: 2,
                }
              ]}
            >
              <Animated.View 
                style={[
                  styles.innerCircle,
                  {
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    transform: [
                      { 
                        scale: fadeAnim.interpolate({
                          inputRange: [0.7, 1],
                          outputRange: [0.9, 0.7]
                        }) 
                      }
                    ],
                  }
                ]}
              />
              
              <Text style={styles.circleText}>
                {getPhaseText(currentPhase)}
              </Text>
            </Animated.View>
          </View>
          
          <View style={styles.controlsContainer}>
            <Button
              mode="contained"
              style={[commonStyles.button, styles.controlButton, { backgroundColor: isActive ? '#EF5350' : '#4CAF50' }]}
              labelStyle={{ color: '#fff' }}
              onPress={toggleActive}
            >
              {isActive ? 'Pause' : 'Start'}
            </Button>
            
            <Button
              mode="outlined"
              style={[commonStyles.button, styles.controlButton, { 
                borderColor: colors.TAB_BAR.ACTIVE,
              }]}
              textColor={colors.TEXT.PRIMARY}
              onPress={resetExercise}
            >
              Reset
            </Button>
          </View>
          
          <Button
            mode="contained"
            style={[styles.finishButton, {
              backgroundColor: colors.TAB_BAR.ACTIVE
            }]}
            textColor="#fff"
            onPress={finishSession}
          >
            Finish & Save
          </Button>
        </View>
      </ScrollView>
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: colors.CARD }}
      >
        <Text style={{ color: colors.TEXT.PRIMARY }}>{snackbarMessage}</Text>
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    paddingTop: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    marginLeft: 4,
    color: 'white',
  },
  title: {
    fontSize: 28,
    marginBottom: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  phaseText: {
    fontSize: 24,
    marginBottom: 8,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 20,
    marginBottom: 16,
    fontWeight: '300',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  cyclesText: {
    fontSize: 14,
  },
  durationText: {
    fontSize: 14,
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
  },
  breathCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
  },
  innerCircle: {
    position: 'absolute',
    width: '60%',
    height: '60%',
    borderRadius: 100,
  },
  circleText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '500',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  controlButton: {
    width: '42%',
  },
  finishButton: {
    alignSelf: 'center',
    width: '90%',
    marginBottom: 20,
    paddingVertical: 8,
  },
});