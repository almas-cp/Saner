import { View, StyleSheet, Dimensions, Pressable, Modal, Animated, ScrollView, SafeAreaView } from 'react-native';
import { Text, Title, Subheading, Caption, IconButton, Button, Card, ProgressBar, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../src/contexts/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import React, { useState, useRef, useEffect } from 'react';
import { COLORS } from '../../../src/styles/theme';
import { MotiView } from 'moti';
import { supabase } from '../../../src/lib/supabase';
import { useRouter } from 'expo-router';
import { TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { getCommonStyles } from '../../../src/styles/commonStyles';

type Exercise = {
  id: string;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  description: string;
  benefits: string[];
  pattern: {
    inhale: number;
    hold1?: number;
    exhale: number;
    hold2?: number;
  };
};

type MoodEntry = {
  value: number;
  timestamp: string;
  notes?: string;
};

const exercises: Exercise[] = [
  {
    id: 'box',
    name: 'Box Breathing',
    icon: 'square-outline',
    description: 'Inhale, hold, exhale, hold - each for 4 seconds',
    benefits: ['Reduces stress', 'Improves focus', 'Lowers blood pressure'],
    pattern: {
      inhale: 4,
      hold1: 4,
      exhale: 4,
      hold2: 4
    }
  },
  {
    id: '478',
    name: '4-7-8 Breathing',
    icon: 'numeric-8-circle-outline',
    description: 'Inhale for 4, hold for 7, exhale for 8',
    benefits: ['Helps with sleep', 'Reduces anxiety', 'Balances emotions'],
    pattern: {
      inhale: 4,
      hold1: 7,
      exhale: 8
    }
  },
  {
    id: 'calm',
    name: 'Calming Breath',
    icon: 'heart-outline',
    description: 'Inhale for 4, exhale for 6',
    benefits: ['Reduces anxiety', 'Lowers heart rate', 'Prepares for meditation'],
    pattern: {
      inhale: 4,
      exhale: 6
    }
  },
  {
    id: 'energize',
    name: 'Energizing Breath',
    icon: 'lightning-bolt',
    description: 'Quick inhale for 2, exhale for 2',
    benefits: ['Increases alertness', 'Improves energy', 'Enhances concentration'],
    pattern: {
      inhale: 2,
      exhale: 2
    }
  },
  {
    id: 'focused',
    name: 'Focus Breath',
    icon: 'brain',
    description: 'Deep inhale for 5, hold for 2, slow exhale for 7',
    benefits: ['Improves cognitive function', 'Enhances clarity', 'Reduces mental fatigue'],
    pattern: {
      inhale: 5,
      hold1: 2,
      exhale: 7
    }
  },
  {
    id: 'sleep',
    name: 'Sleep Well',
    icon: 'weather-night',
    description: 'Gentle inhale for 4, exhale for 8. Perfect before bed.',
    benefits: ['Induces relaxation', 'Prepares body for sleep', 'Reduces racing thoughts'],
    pattern: {
      inhale: 4,
      exhale: 8
    }
  }
];

function MoodSlider() {
  const { colors, theme } = useTheme();
  const [mood, setMood] = useState(50);
  const [submitted, setSubmitted] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchMoodHistory();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
  };

  const fetchMoodHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      if (data) {
        setMoodHistory(data.map(entry => ({
          value: entry.value,
          timestamp: entry.created_at,
          notes: entry.notes
        })));
      }
    } catch (error) {
      console.error('Error fetching mood history:', error);
    }
  };

  const getMoodEmoji = (value: number) => {
    if (value < 20) return { icon: 'emoticon-cry-outline' as const, color: theme === 'dark' ? '#EF5350' : '#E53935', text: 'Feeling low' };
    if (value < 40) return { icon: 'emoticon-sad-outline' as const, color: theme === 'dark' ? '#FF8A80' : '#FF6B6B', text: 'Not great' };
    if (value < 60) return { icon: 'emoticon-neutral-outline' as const, color: theme === 'dark' ? '#FFD180' : '#FFB347', text: 'Okay' };
    if (value < 80) return { icon: 'emoticon-happy-outline' as const, color: theme === 'dark' ? '#B9F6CA' : '#4AD66D', text: 'Good' };
    return { icon: 'emoticon-excited-outline' as const, color: theme === 'dark' ? '#69F0AE' : '#2E7D32', text: 'Excellent!' };
  };

  const currentMood = getMoodEmoji(mood);
  
  const handleSubmit = async () => {
    setSubmitted(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Prompt to log in
      return;
    }
    
    try {
      const { error } = await supabase
        .from('mood_entries')
        .insert({
          user_id: user.id,
          value: mood,
          notes: notes,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Update local mood history
      setMoodHistory([
        {
          value: mood,
          timestamp: new Date().toISOString(),
          notes
        },
        ...moodHistory.slice(0, 4)
      ]);
      
    } catch (error) {
      console.error('Error logging mood:', error);
    }
  };

  const getMoodAnalysis = () => {
    if (moodHistory.length === 0) return null;
    
    const average = moodHistory.reduce((acc, item) => acc + item.value, 0) / moodHistory.length;
    const trend = moodHistory.length > 1 
      ? moodHistory[0].value > moodHistory[moodHistory.length - 1].value 
        ? 'improving' 
        : 'declining'
      : 'stable';
    
    return {
      average,
      trend,
      emoji: getMoodEmoji(average).icon
    };
  };

  const moodAnalysis = getMoodAnalysis();

  return (
    <View style={[
      styles.moodContainer, 
      { 
        backgroundColor: colors.CARD,
        borderRadius: 20,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        shadowColor: theme === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.15)',
        shadowOffset: { width: 0, height: theme === 'dark' ? 2 : 1 },
        shadowOpacity: theme === 'dark' ? 0.2 : 0.07,
        shadowRadius: theme === 'dark' ? 12 : 5,
        elevation: theme === 'dark' ? 5 : 2,
        borderWidth: theme === 'dark' ? 0.5 : 0,
        borderColor: colors.BORDER,
      }
    ]}>
      <Text style={[styles.sectionTitle, { 
        color: colors.TEXT.PRIMARY, 
        textAlign: 'center'
      }]}>
        How are you feeling today?
      </Text>
      
      <View style={styles.moodEmoji}>
        <MotiView
          from={{ scale: 0.8, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'timing', duration: 500 }}
        >
          <MaterialCommunityIcons
            name={currentMood.icon}
            size={48}
            color={currentMood.color}
            style={{ marginBottom: 8 }}
          />
        </MotiView>
        <Text style={{ 
          fontSize: 18, 
          color: currentMood.color,
          fontWeight: '500'
        }}>
          {currentMood.text}
        </Text>
      </View>
      
      <View style={styles.sliderContainer}>
        <LinearGradient
          colors={COLORS.GRADIENT.MOOD}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradientTrack}
        />
        
        <Slider
          style={styles.slider}
          value={mood}
          minimumValue={0}
          maximumValue={100}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbTintColor={colors.TAB_BAR.ACTIVE}
          onValueChange={setMood}
        />
        
        <View style={styles.emojiLabels}>
          <Text style={{ color: colors.TEXT.SECONDARY }}>😞</Text>
          <Text style={{ color: colors.TEXT.SECONDARY }}>😐</Text>
          <Text style={{ color: colors.TEXT.SECONDARY }}>😊</Text>
        </View>
      </View>
      
      {!submitted ? (
        <View>
          {!showNotes && (
            <Button
              onPress={() => setShowNotes(true)}
              mode="text"
              style={{ marginBottom: 12 }}
              textColor={colors.TAB_BAR.ACTIVE}
            >
              Add notes
            </Button>
          )}
          
          {showNotes && (
            <View style={styles.notesContainer}>
              <TextInput
                placeholder="What's on your mind? (optional)"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                style={[styles.notesInput, { backgroundColor: theme === 'dark' ? colors.SURFACE : colors.BACKGROUND }]}
                placeholderTextColor={colors.TEXT.TERTIARY}
                textColor={colors.TEXT.PRIMARY}
              />
            </View>
          )}
          
          <Button
            onPress={handleSubmit}
            mode="contained"
            style={[styles.moodButton, { backgroundColor: colors.TAB_BAR.ACTIVE }]}
            labelStyle={{ color: theme === 'dark' ? colors.BACKGROUND : '#FFFFFF' }}
          >
            Log Mood
          </Button>
          
          {!isAuthenticated && (
            <Text style={{ color: colors.TEXT.SECONDARY, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
              Sign in to track your mood history
            </Text>
          )}
        </View>
      ) : (
        <View>
          <Text style={[styles.thankYouText, { color: colors.TAB_BAR.ACTIVE }]}>
            Thanks for sharing! 🙏
          </Text>
          
          {isAuthenticated && moodHistory.length > 0 && (
            <Pressable 
              style={[styles.moodHistoryButton, { 
                borderColor: colors.BORDER,
                backgroundColor: theme === 'dark' ? colors.SURFACE : 'transparent',
              }]}
              onPress={() => router.push('/(main)/breath/mood-history')}
            >
              <View style={styles.moodHistoryContent}>
                <MaterialCommunityIcons
                  name="chart-line"
                  size={22}
                  color={colors.TAB_BAR.ACTIVE}
                />
                <Text style={{ color: colors.TEXT.PRIMARY, marginLeft: 8 }}>
                  View Mood History
                </Text>
              </View>
              
              {moodAnalysis && (
                <View style={styles.moodTrend}>
                  <MaterialCommunityIcons
                    name={moodAnalysis.trend === 'improving' ? 'trending-up' : 'trending-down'}
                    size={20}
                    color={moodAnalysis.trend === 'improving' ? (theme === 'dark' ? '#69F0AE' : '#4CAF50') : (theme === 'dark' ? '#FF8A80' : '#F44336')}
                  />
                </View>
              )}
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function RecommendedExercise({ onSelectExercise }: { onSelectExercise: (exercise: Exercise) => void }) {
  const { colors, theme, palette } = useTheme();
  const [recommendation, setRecommendation] = useState<Exercise | null>(null);
  
  useEffect(() => {
    // This could be based on time of day, user history, mood, etc.
    const currentHour = new Date().getHours();
    let recommendedId = 'box'; // default

    if (currentHour < 10) {
      recommendedId = 'energize'; // Morning - energy boost
    } else if (currentHour >= 21) {
      recommendedId = 'sleep'; // Evening - prepare for sleep
    } else if (currentHour >= 13 && currentHour < 17) {
      recommendedId = 'focused'; // Afternoon - focus
    }
    
    const found = exercises.find(ex => ex.id === recommendedId);
    if (found) {
      setRecommendation(found);
    }
  }, []);
  
  if (!recommendation) return null;
  
  // Dynamically select colors based on current theme and palette
  const gradientColors = (() => {
    if (palette === 'ocean') return theme === 'dark' ? ['#1565C0', '#0D47A1'] as const : ['#4a6fa1', '#166bb5'] as const;
    if (palette === 'mint') return theme === 'dark' ? ['#2E7D32', '#1B5E20'] as const : ['#4AD66D', '#388E3C'] as const;
    if (palette === 'berry') return theme === 'dark' ? ['#C62828', '#B71C1C'] as const : ['#E57373', '#D32F2F'] as const;
    if (palette === 'citric') return theme === 'dark' ? ['#EF6C00', '#E65100'] as const : ['#FFB347', '#F57C00'] as const;
    return theme === 'dark' ? ['#5E35B1', '#4527A0'] as const : ['#4a6fa1', '#166bb5'] as const; // Default - purple theme
  })();
  
  return (
    <MotiView
      from={{ opacity: 0, translateY: 15 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 600 }}
      style={{ marginHorizontal: 16, marginBottom: 24 }}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.recommendedCard, { 
          borderRadius: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: theme === 'dark' ? 0.3 : 0.2,
          shadowRadius: 6,
          elevation: theme === 'dark' ? 8 : 4,
        }]}
      >
        <View style={styles.recommendedContent}>
          <View>
            <Text style={styles.recommendedLabel}>Recommended for now</Text>
            <Text style={styles.recommendedTitle}>{recommendation.name}</Text>
            <Text style={styles.recommendedDescription}>{recommendation.description}</Text>
            
            <Button 
              mode="contained" 
              onPress={() => onSelectExercise(recommendation)}
              style={styles.startButton}
              labelStyle={{ color: gradientColors[0] }}
              buttonColor="#ffffff"
            >
              Start Now
            </Button>
          </View>
          
          <View style={styles.recommendedIconContainer}>
            <MaterialCommunityIcons
              name={recommendation.icon}
              size={60}
              color="#ffffff"
              style={{ opacity: 0.9 }}
            />
          </View>
        </View>
      </LinearGradient>
    </MotiView>
  );
}

function StatsCard() {
  const { colors, theme } = useTheme();
  const [stats, setStats] = useState({
    weeklyMinutes: 0,
    totalSessions: 0,
    streak: 0,
    lastExercise: ''
  });
  
  useEffect(() => {
    fetchStats();
  }, []);
  
  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    try {
      // Fetch breath session stats
      const { data, error } = await supabase
        .from('breath_sessions')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      if (data) {
        // Calculate stats
        const totalSessions = data.length;
        
        // Calculate minutes this week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const weekSessions = data.filter(session => 
          new Date(session.created_at) >= oneWeekAgo
        );
        
        const weeklyMinutes = Math.round(weekSessions.reduce(
          (acc, session) => acc + (session.duration_seconds || 0), 0
        ) / 60);
        
        // Calculate streak (consecutive days)
        const sessionDates = data.map(session => 
          new Date(session.created_at).toDateString()
        );
        
        const uniqueDates = [...new Set(sessionDates)];
        uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        
        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        // Go back one day if no session today
        if (uniqueDates[0] !== currentDate.toDateString()) {
          currentDate.setDate(currentDate.getDate() - 1);
        }
        
        for (let i = 0; i < 30; i++) { // max 30 day look-back
          const dateStr = currentDate.toDateString();
          if (uniqueDates.includes(dateStr)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break;
          }
        }
        
        // Get last exercise name
        let lastExercise = '';
        if (data.length > 0) {
          data.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          lastExercise = data[0].exercise_name || '';
        }
        
        setStats({
          weeklyMinutes,
          totalSessions,
          streak,
          lastExercise
        });
      }
    } catch (error) {
      console.error('Error fetching breath stats:', error);
    }
  };
  
  return (
    <Card style={[styles.statsCard, { 
      backgroundColor: colors.CARD,
      borderRadius: 16,
      elevation: theme === 'dark' ? 4 : 2,
      shadowColor: theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.15)',
      shadowOffset: { width: 0, height: theme === 'dark' ? 2 : 1 },
      shadowOpacity: theme === 'dark' ? 0.25 : 0.07,
      shadowRadius: theme === 'dark' ? 8 : 4,
      borderWidth: theme === 'dark' ? 0.5 : 0,
      borderColor: theme === 'dark' ? colors.BORDER : 'transparent',
    }]}>
      <Card.Content>
        <Text style={[styles.statsTitle, { color: colors.TEXT.PRIMARY }]}>
          Your Progress
        </Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons 
              name="timer-outline" 
              size={22} 
              color={colors.TAB_BAR.ACTIVE} 
            />
            <Text style={[styles.statValue, { color: colors.TEXT.PRIMARY }]}>
              {stats.weeklyMinutes}
            </Text>
            <Text style={[styles.statLabel, { color: colors.TEXT.SECONDARY }]}>
              minutes this week
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <MaterialCommunityIcons 
              name="fire" 
              size={22} 
              color={theme === 'dark' ? "#FFB74D" : "#FF9800"} 
            />
            <Text style={[styles.statValue, { color: colors.TEXT.PRIMARY }]}>
              {stats.streak}
            </Text>
            <Text style={[styles.statLabel, { color: colors.TEXT.SECONDARY }]}>
              day streak
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <MaterialCommunityIcons 
              name="meditation" 
              size={22} 
              color={theme === 'dark' ? "#CE93D8" : "#9C27B0"} 
            />
            <Text style={[styles.statValue, { color: colors.TEXT.PRIMARY }]}>
              {stats.totalSessions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.TEXT.SECONDARY }]}>
              total sessions
            </Text>
          </View>
        </View>
        
        {stats.lastExercise && (
          <Text style={{ fontSize: 13, color: colors.TEXT.SECONDARY, textAlign: 'center', marginTop: 8 }}>
            Last exercise: {stats.lastExercise}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}

function ExerciseModal({ exercise, visible, onClose }: { 
  exercise: Exercise | null, 
  visible: boolean, 
  onClose: () => void 
}) {
  const { colors, theme } = useTheme();
  const [phase, setPhase] = useState<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  const [timeLeft, setTimeLeft] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [currentScale, setCurrentScale] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [totalCycles, setTotalCycles] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const listener = progressAnim.addListener(({ value }) => {
      setCurrentScale(value);
    });
    return () => progressAnim.removeListener(listener);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && hasStarted) {
      interval = setInterval(() => {
        setTotalSeconds(s => s + 1);
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isActive, hasStarted]);

  const startExercise = () => {
    setHasStarted(true);
    setIsActive(true);
    setPhase('inhale');
    setTotalCycles(0);
    setTotalSeconds(0);
    progressAnim.setValue(0);
  };

  const resetExercise = () => {
    setIsActive(false);
    setHasStarted(false);
    setPhase('inhale');
    setTimeLeft(0);
    setTotalCycles(0);
    setTotalSeconds(0);
    progressAnim.setValue(0);
  };
  
  const saveSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !exercise) return;
    
    try {
      await supabase
        .from('breath_sessions')
        .insert({
          user_id: user.id,
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          duration_seconds: totalSeconds,
          cycles_completed: totalCycles,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging breath session:', error);
    }
  };

  useEffect(() => {
    if (!visible) {
      if (totalSeconds > 0) {
        saveSession();
      }
      resetExercise();
    }
  }, [visible]);

  useEffect(() => {
    if (!exercise || !isActive) return;

    const duration = exercise.pattern[phase] || 0;
    setTimeLeft(duration);

    const animation = Animated.sequence([
      Animated.timing(progressAnim, {
        toValue: phase === 'inhale' ? 1 : phase === 'exhale' ? 0 : currentScale,
        duration: duration * 1000,
        useNativeDriver: true,
      })
    ]);

    animation.start(({ finished }) => {
      if (finished && isActive) {
        let nextPhase: typeof phase = 'inhale';
        let shouldIncrementCycle = false;

        if (phase === 'inhale') {
          nextPhase = exercise.pattern.hold1 ? 'hold1' : 'exhale';
        } else if (phase === 'hold1') {
          nextPhase = 'exhale';
        } else if (phase === 'exhale') {
          nextPhase = exercise.pattern.hold2 ? 'hold2' : 'inhale';
          if (!exercise.pattern.hold2) {
            shouldIncrementCycle = true;
          }
        } else if (phase === 'hold2') {
          nextPhase = 'inhale';
          shouldIncrementCycle = true;
        }

        if (shouldIncrementCycle) {
          setTotalCycles(prev => {
            const newCount = prev + 1;
            if (newCount >= 3) {
              setTimeout(() => {
                onClose();
              }, 500);
            }
            return newCount;
          });
        }

        setPhase(nextPhase);
      }
    });

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      animation.stop();
    };
  }, [phase, exercise, isActive, currentScale]);

  if (!exercise) return null;

  const getPhaseText = () => {
    switch (phase) {
      case 'inhale': return 'Breathe In';
      case 'hold1': return 'Hold';
      case 'exhale': return 'Breathe Out';
      case 'hold2': return 'Hold';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { 
        backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.4)' 
      }]}>
        <MotiView
          from={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'timing', duration: 400 }}
          style={[styles.modalContent, { 
            backgroundColor: colors.SURFACE,
            shadowColor: theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)',
            shadowOffset: { width: 0, height: theme === 'dark' ? 4 : 2 },
            shadowOpacity: theme === 'dark' ? 0.3 : 0.15,
            shadowRadius: theme === 'dark' ? 10 : 6,
            elevation: theme === 'dark' ? 8 : 4,
            borderWidth: theme === 'dark' ? 0.5 : 0,
            borderColor: theme === 'dark' ? colors.BORDER : 'transparent',
          }]}
        >
          <View style={styles.modalHeader}>
            <Title style={{ color: colors.TEXT.PRIMARY }}>{exercise.name}</Title>
            <View style={styles.headerActions}>
              <IconButton
                icon="information-outline"
                size={24}
                onPress={() => setShowInfo(!showInfo)}
                iconColor={colors.TEXT.PRIMARY}
              />
              <IconButton
                icon="close"
                size={24}
                onPress={onClose}
                iconColor={colors.TEXT.PRIMARY}
              />
            </View>
          </View>
          
          {showInfo ? (
            <View style={styles.infoContainer}>
              <Text style={{ color: colors.TEXT.PRIMARY, marginBottom: 12 }}>
                {exercise.description}
              </Text>
              
              <Text style={{ color: colors.TEXT.PRIMARY, fontWeight: 'bold', marginBottom: 8 }}>
                Benefits:
              </Text>
              
              <View style={styles.benefitsList}>
                {exercise.benefits.map((benefit, index) => (
                  <View key={index} style={styles.benefitItem}>
                    <MaterialCommunityIcons
                      name="check-circle-outline"
                      size={18}
                      color={colors.TAB_BAR.ACTIVE}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={{ color: colors.TEXT.PRIMARY }}>{benefit}</Text>
                  </View>
                ))}
              </View>
              
              <Text style={{ color: colors.TEXT.PRIMARY, fontWeight: 'bold', marginTop: 12, marginBottom: 8 }}>
                Pattern:
              </Text>
              
              <View style={styles.patternInfo}>
                <View style={styles.patternItem}>
                  <Text style={{ color: colors.TEXT.SECONDARY }}>Inhale</Text>
                  <Text style={{ color: colors.TEXT.PRIMARY, fontWeight: 'bold' }}>{exercise.pattern.inhale}s</Text>
                </View>
                
                {exercise.pattern.hold1 && (
                  <View style={styles.patternItem}>
                    <Text style={{ color: colors.TEXT.SECONDARY }}>Hold</Text>
                    <Text style={{ color: colors.TEXT.PRIMARY, fontWeight: 'bold' }}>{exercise.pattern.hold1}s</Text>
                  </View>
                )}
                
                <View style={styles.patternItem}>
                  <Text style={{ color: colors.TEXT.SECONDARY }}>Exhale</Text>
                  <Text style={{ color: colors.TEXT.PRIMARY, fontWeight: 'bold' }}>{exercise.pattern.exhale}s</Text>
                </View>
                
                {exercise.pattern.hold2 && (
                  <View style={styles.patternItem}>
                    <Text style={{ color: colors.TEXT.SECONDARY }}>Hold</Text>
                    <Text style={{ color: colors.TEXT.PRIMARY, fontWeight: 'bold' }}>{exercise.pattern.hold2}s</Text>
                  </View>
                )}
              </View>
              
              <Button
                mode="contained"
                onPress={() => {
                  setShowInfo(false);
                  if (!hasStarted) startExercise();
                }}
                style={[styles.startInfoButton]}
                buttonColor={colors.TAB_BAR.ACTIVE}
                textColor={theme === 'dark' ? colors.BACKGROUND : '#FFFFFF'}
              >
                {hasStarted ? 'Continue Exercise' : 'Start Exercise'}
              </Button>
            </View>
          ) : (
            <View style={styles.exerciseContent}>
              {totalSeconds > 0 && (
                <View style={styles.sessionStats}>
                  <Text style={{ color: colors.TEXT.SECONDARY }}>
                    Session: {Math.floor(totalSeconds / 60)}:{(totalSeconds % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              )}
              
              <View style={[styles.circleContainer, { 
                borderColor: colors.TAB_BAR.ACTIVE,
                borderWidth: theme === 'dark' ? 3 : 2,
              }]}>
                <Animated.View
                  style={[
                    styles.progressCircle,
                    {
                      backgroundColor: colors.TAB_BAR.ACTIVE,
                      transform: [
                        {
                          scale: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 1],
                          }),
                        },
                      ],
                      opacity: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, theme === 'dark' ? 0.25 : 0.15],
                      }),
                    },
                  ]}
                />
                <View style={styles.circleContent}>
                  <Subheading style={{ color: colors.TEXT.PRIMARY }}>
                    {getPhaseText()}
                  </Subheading>
                  <Title style={{ color: colors.TEXT.PRIMARY, fontSize: 32 }}>{timeLeft}s</Title>
                  {hasStarted && (
                    <Caption style={{ color: colors.TEXT.SECONDARY, marginTop: 4 }}>
                      Cycle {totalCycles + 1}/3
                    </Caption>
                  )}
                </View>
              </View>

              {!hasStarted ? (
                <Button
                  mode="contained"
                  style={[styles.startButton]}
                  buttonColor={colors.TAB_BAR.ACTIVE}
                  textColor={theme === 'dark' ? colors.BACKGROUND : '#FFFFFF'}
                  onPress={startExercise}
                  icon="play"
                >
                  Begin
                </Button>
              ) : (
                <View style={styles.controlsContainer}>
                  <Pressable
                    style={[
                      styles.controlButton,
                      { 
                        backgroundColor: colors.TAB_BAR.ACTIVE,
                        shadowColor: theme === 'dark' ? 'rgba(0,0,0,0.7)' : '#000',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: theme === 'dark' ? 0.4 : 0.25,
                        shadowRadius: theme === 'dark' ? 8 : 3.84,
                        elevation: theme === 'dark' ? 8 : 5,
                      },
                    ]}
                    onPress={() => setIsActive(!isActive)}
                  >
                    <MaterialCommunityIcons
                      name={isActive ? 'pause' : 'play'}
                      size={32}
                      color={theme === 'dark' ? colors.BACKGROUND : '#FFFFFF'}
                    />
                  </Pressable>
                  
                  <Pressable
                    style={[
                      styles.resetButton,
                      { 
                        backgroundColor: 'transparent',
                        borderColor: colors.BORDER,
                        borderWidth: 1
                      },
                    ]}
                    onPress={resetExercise}
                  >
                    <MaterialCommunityIcons
                      name="restart"
                      size={22}
                      color={colors.TEXT.PRIMARY}
                    />
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </MotiView>
      </View>
    </Modal>
  );
}

function ExerciseCard({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  const { colors, theme } = useTheme();
  
  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500, delay: exercises.findIndex(e => e.id === exercise.id) * 100 }}
    >
      <Pressable 
        onPress={onPress}
        style={({ pressed }) => [
          styles.exerciseCard,
          {
            backgroundColor: colors.CARD,
            borderRadius: 20,
            shadowColor: theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)',
            shadowOffset: { width: 0, height: theme === 'dark' ? 2 : 1 },
            shadowOpacity: theme === 'dark' ? 0.2 : 0.06,
            shadowRadius: theme === 'dark' ? 10 : 5,
            elevation: theme === 'dark' ? 5 : 2,
            borderWidth: theme === 'dark' ? 0.5 : 0,
            borderColor: colors.BORDER,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            opacity: pressed ? 0.9 : 1,
          }
        ]}
      >
        <View style={styles.exerciseCardContent}>
          <View style={[
            styles.iconContainer,
            { 
              backgroundColor: theme === 'dark' 
                ? `${colors.TAB_BAR.ACTIVE}40` 
                : `${colors.TAB_BAR.ACTIVE}15` 
            }
          ]}>
            <MaterialCommunityIcons
              name={exercise.icon}
              size={30}
              color={colors.TAB_BAR.ACTIVE}
            />
          </View>
          <View style={styles.exerciseInfo}>
            <Text style={[styles.exerciseName, { color: colors.TEXT.PRIMARY }]}>
              {exercise.name}
            </Text>
            <Text style={[styles.exerciseDescription, { color: colors.TEXT.SECONDARY }]}>
              {exercise.description}
            </Text>
            
            <View style={styles.benefitChips}>
              {exercise.benefits.slice(0, 2).map((benefit, index) => (
                <Chip 
                  key={index}
                  style={[styles.benefitChip, { 
                    backgroundColor: theme === 'dark' 
                      ? `${colors.TAB_BAR.ACTIVE}30` 
                      : `${colors.TAB_BAR.ACTIVE}10`
                  }]}
                  textStyle={{ 
                    fontSize: 10, 
                    color: theme === 'dark' ? colors.TEXT.SECONDARY : colors.TEXT.PRIMARY
                  }}
                >
                  {benefit}
                </Chip>
              ))}
            </View>
          </View>
        </View>
      </Pressable>
    </MotiView>
  );
}

export default function Breath() {
  const { colors, theme, palette } = useTheme();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const commonStyles = getCommonStyles(theme, palette);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Title 
            style={[styles.pageTitle, { 
              color: colors.TEXT.PRIMARY,
              fontSize: 28,
              fontWeight: 'bold',
            }]}
          >
            Mindful Breathing
          </Title>
          <Text style={[styles.pageSubtitle, { 
            color: colors.TEXT.SECONDARY,
            fontSize: 16,
            lineHeight: 22,
          }]}>
            Take a moment to breathe and find your balance
          </Text>
        </View>
        
        <RecommendedExercise onSelectExercise={setSelectedExercise} />
        
        {isAuthenticated && <StatsCard />}

        <Text style={[styles.sectionTitle, { 
          color: colors.TEXT.PRIMARY, 
          marginTop: 24,
          fontSize: 20,
          fontWeight: '600',
        }]}>
          Breathing Exercises
        </Text>
        
        <View style={styles.exercisesGrid}>
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onPress={() => setSelectedExercise(exercise)}
            />
          ))}
        </View>

        <Text style={[styles.sectionTitle, { 
          color: colors.TEXT.PRIMARY, 
          marginTop: 24,
          fontSize: 20,
          fontWeight: '600',
        }]}>
          Mood Tracker
        </Text>
        
        <MoodSlider />
      </ScrollView>
      
      <ExerciseModal
        exercise={selectedExercise}
        visible={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  exercisesGrid: {
    paddingHorizontal: 16,
  },
  exerciseCard: {
    marginBottom: 16,
    padding: 16,
  },
  exerciseCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  benefitChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  benefitChip: {
    marginRight: 6,
    marginBottom: 4,
    height: 22,
  },
  moodContainer: {
    margin: 16,
  },
  moodEmoji: {
    alignItems: 'center',
    marginVertical: 16,
  },
  sliderContainer: {
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  gradientTrack: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    marginVertical: 16,
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: -30,
  },
  emojiLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -10,
  },
  moodButton: {
    borderRadius: 8,
    paddingVertical: 4,
  },
  thankYouText: {
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
  moodHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  moodHistoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodTrend: {
    alignItems: 'center',
  },
  notesContainer: {
    marginBottom: 16,
  },
  notesInput: {
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
  },
  exerciseContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  sessionStats: {
    marginBottom: 10,
  },
  circleContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  progressCircle: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  circleContent: {
    alignItems: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resetButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  startButton: {
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  infoContainer: {
    padding: 16,
  },
  benefitsList: {
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  patternInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  patternItem: {
    alignItems: 'center',
  },
  startInfoButton: {
    borderRadius: 8,
    marginTop: 8,
  },
  recommendedCard: {
    padding: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  recommendedContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendedLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  recommendedTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recommendedDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginBottom: 16,
    maxWidth: '80%',
  },
  recommendedIconContainer: {
    marginLeft: 'auto',
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
  },
}); 