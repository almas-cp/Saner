import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  RefreshControl,
  SafeAreaView,
  Platform
} from 'react-native';
import { Text, Card, Title, Paragraph, Button, ActivityIndicator, IconButton, Chip } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../src/contexts/theme';
import { getCommonStyles } from '../../../src/styles/commonStyles';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../../src/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

// Define the coin reward amount as a constant
const BREATHING_EXERCISE_COIN_REWARD = 10;

// Define breathing exercise types
type BreathingExercise = {
  id: string;
  name: string;
  description: string;
  pattern: string;
  benefits: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // in minutes
  imageUrl?: string;
  includeMusic?: boolean;
};

// Predefined breathing exercises
const breathingExercises: BreathingExercise[] = [
  {
    id: 'box-breathing',
    name: 'Box Breathing',
    description: 'A technique used to calm the nervous system. Inhale, hold, exhale, and hold for equal counts.',
    pattern: '4-4-4-4',
    benefits: ['Stress reduction', 'Better focus', 'Emotional regulation'],
    difficulty: 'beginner',
    duration: 5,
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGJyZWF0aGluZ3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60'
  },
  {
    id: '4-7-8',
    name: '4-7-8 Breathing',
    description: 'A relaxing breath pattern developed by Dr. Andrew Weil to promote calmness and sleep.',
    pattern: '4-7-8-0',
    benefits: ['Better sleep', 'Anxiety reduction', 'Relaxation'],
    difficulty: 'intermediate',
    duration: 4,
    imageUrl: 'https://images.unsplash.com/photo-1468657988500-aca2be09f4c6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8cmVsYXhlZHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60'
  },
  {
    id: 'deep-breathing',
    name: 'Deep Breathing',
    description: 'Simple deep breathing to increase oxygen flow and induce calmness.',
    pattern: '4-0-6-0',
    benefits: ['Stress reduction', 'Energy boost', 'Mental clarity'],
    difficulty: 'beginner',
    duration: 3,
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZGVlcCUyMGJyZWF0aHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60'
  },
  {
    id: 'alternate-nostril',
    name: 'Alternate Nostril',
    description: 'A yogic breathing practice that brings balance to the mind and body.',
    pattern: '4-4-4-0',
    benefits: ['Balance energy', 'Improve focus', 'Calm nerves'],
    difficulty: 'advanced',
    duration: 7,
    imageUrl: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fHlvZ2F8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60'
  },
  {
    id: 'coherent-breathing',
    name: 'Coherent Breathing',
    description: 'Breathing at a rate of 5 breaths per minute to maximize heart rate variability.',
    pattern: '6-0-6-0',
    benefits: ['Heart health', 'Stress reduction', 'Emotional stability'],
    difficulty: 'intermediate', 
    duration: 6,
    imageUrl: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGhlYXJ0fGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60'
  }
];

// Music tracks for therapy
const musicTracks = [
  { id: 1, name: 'Calm Meditation', description: 'Peaceful ambient tones to promote deep relaxation' },
  { id: 2, name: 'Deep Relaxation', description: 'Slow, gentle melody to release tension and anxiety' },
  { id: 3, name: 'Peaceful Harmony', description: 'Balanced tones to restore inner peace and emotional stability' }, 
  { id: 4, name: 'Tranquil Mind', description: 'Soothing sounds to quiet the mind and enhance meditation' }
];

export default function RelaxIndex() {
  const router = useRouter();
  const { theme, colors, palette } = useTheme();
  const commonStyles = getCommonStyles(theme, palette);
  const params = useLocalSearchParams();
  
  const [refreshing, setRefreshing] = useState(false);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication and fetch past sessions
  useEffect(() => {
    checkAuth();
    fetchPastSessions();
  }, []);
  
  // Check for refresh_coins param which indicates we just completed an exercise
  useEffect(() => {
    if (params.refresh_coins === 'true') {
      console.log('Detected return from exercise with coin reward');
    }
  }, [params.refresh_coins, params.timestamp]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
    
    if (user) {
      fetchPastSessions();
    } else {
      setLoadingHistory(false);
    }
  };

  const fetchPastSessions = async () => {
    try {
      setLoadingHistory(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingHistory(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('breath_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      setPastSessions(data || []);
    } catch (error) {
      console.error('Error fetching past sessions:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startExercise = (exercise: BreathingExercise) => {
    router.push({
      pathname: '/(main)/relax/exercise',
      params: {
        name: exercise.name,
        pattern: exercise.pattern,
        includeMusic: exercise.includeMusic ? 'true' : 'false'
      }
    });
  };

  const startMusicTherapy = (pattern: string, trackId: number) => {
    router.push({
      pathname: '/(main)/relax/exercise',
      params: {
        name: `${musicTracks[trackId-1].name} Therapy`,
        pattern: pattern,
        includeMusic: 'true',
        selectedTrack: trackId.toString()
      }
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPastSessions();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'beginner': return '#4CAF50';
      case 'intermediate': return '#FF9800';
      case 'advanced': return '#F44336';
      default: return '#2196F3';
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.BACKGROUND }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.TAB_BAR.ACTIVE]}
            tintColor={colors.TAB_BAR.ACTIVE}
          />
        }
      >
        <LinearGradient
          colors={['#4a6fa1', colors.BACKGROUND]}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>Breathing Exercises</Text>
          <Text style={styles.headerSubtitle}>
            Find peace and balance through mindful breathing
          </Text>
        </LinearGradient>
        
        <View style={styles.container}>
          <Text style={[commonStyles.heading, { color: colors.TEXT.PRIMARY, marginBottom: 16 }]}>
            Exercises
          </Text>
          
          <View style={styles.exercisesList}>
            {breathingExercises.map((exercise, index) => (
              <MotiView
                key={exercise.id}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: index * 100, type: 'timing' }}
              >
                <Card 
                  style={[
                    styles.exerciseCard, 
                    { backgroundColor: colors.CARD, marginBottom: 16 }
                  ]}
                  onPress={() => startExercise(exercise)}
                >
                  {exercise.imageUrl && (
                    <Card.Cover
                      source={{ uri: exercise.imageUrl }}
                      style={styles.cardImage}
                    />
                  )}
                  <Card.Content style={{ paddingVertical: 16 }}>
                    <Title style={{ color: colors.TEXT.PRIMARY }}>{exercise.name}</Title>
                    <Chip 
                      style={{ 
                        alignSelf: 'flex-start', 
                        marginTop: 8, 
                        backgroundColor: getDifficultyColor(exercise.difficulty) + '20',
                      }}
                      textStyle={{ color: getDifficultyColor(exercise.difficulty) }}
                    >
                      {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
                    </Chip>
                    <Paragraph style={{ color: colors.TEXT.SECONDARY, marginTop: 8 }}>
                      {exercise.description}
                    </Paragraph>
                    <Text style={{ color: colors.TEXT.SECONDARY, marginTop: 8 }}>
                      Pattern: {exercise.pattern.split('-').join(' - ')}
                    </Text>
                    <View style={styles.metadataRow}>
                      {/* Coin reward display */}
                      <View style={styles.coinRewardContainer}>
                        <Text style={[styles.coinRewardText, { color: colors.TEXT.SECONDARY }]}>
                          Reward:
                        </Text>
                        <View style={styles.coinBadge}>
                          <Text style={styles.coinEmoji}>💰</Text>
                          <Text style={styles.coinAmount}>{BREATHING_EXERCISE_COIN_REWARD}</Text>
                        </View>
                      </View>
                      
                      {/* Duration display */}
                      <View style={styles.durationContainer}>
                        <MaterialCommunityIcons 
                          name="clock-outline" 
                          size={16} 
                          color={colors.TEXT.SECONDARY} 
                          style={{marginRight: 4}} 
                        />
                        <Text style={[styles.durationText, { color: colors.TEXT.SECONDARY }]}>
                          {exercise.duration} min
                        </Text>
                      </View>
                    </View>
                    <View style={styles.benefitsContainer}>
                      {exercise.benefits.map((benefit, i) => (
                        <Chip 
                          key={i} 
                          style={styles.benefitChip}
                          textStyle={{ fontSize: 12 }}
                        >
                          {benefit}
                        </Chip>
                      ))}
                    </View>
                    {exercise.includeMusic && (
                      <View style={styles.musicIndicator}>
                        <MaterialCommunityIcons 
                          name="music-note" 
                          size={16} 
                          color={colors.TEXT.SECONDARY} 
                        />
                        <Text style={{ color: colors.TEXT.SECONDARY, fontSize: 12 }}>
                          Includes Music Therapy
                        </Text>
                      </View>
                    )}
                  </Card.Content>
                  <Card.Actions>
                    <Button 
                      mode="contained" 
                      onPress={() => startExercise(exercise)}
                      style={{ backgroundColor: colors.TAB_BAR.ACTIVE }}
                      labelStyle={{ color: '#fff' }}
                    >
                      Start
                    </Button>
                  </Card.Actions>
                </Card>
              </MotiView>
            ))}
          </View>
          
          {/* Music Therapy Section */}
          <Text style={[commonStyles.heading, { color: colors.TEXT.PRIMARY, marginTop: 24, marginBottom: 16 }]}>
            Music Therapy
          </Text>
          
          <View style={styles.musicTherapyContainer}>
            <Card style={[styles.therapyInfoCard, { backgroundColor: colors.CARD }]}>
              <Card.Content>
                <Title style={{ color: colors.TEXT.PRIMARY }}>Enhance Your Practice</Title>
                <Paragraph style={{ color: colors.TEXT.SECONDARY, marginTop: 8 }}>
                  Combine soothing music with breathing techniques for enhanced relaxation and stress relief.
                  Music therapy can help deepen your practice and create a more immersive experience.
                </Paragraph>
                
                <View style={styles.benefitsRow}>
                  <View style={styles.benefitItem}>
                    <MaterialCommunityIcons name="brain" size={24} color={colors.TAB_BAR.ACTIVE} />
                    <Text style={[styles.benefitText, { color: colors.TEXT.SECONDARY }]}>Reduces Stress</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <MaterialCommunityIcons name="heart-pulse" size={24} color={colors.TAB_BAR.ACTIVE} />
                    <Text style={[styles.benefitText, { color: colors.TEXT.SECONDARY }]}>Lowers Blood Pressure</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <MaterialCommunityIcons name="sleep" size={24} color={colors.TAB_BAR.ACTIVE} />
                    <Text style={[styles.benefitText, { color: colors.TEXT.SECONDARY }]}>Improves Sleep</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
            
            <Text style={[commonStyles.subheading, { color: colors.TEXT.PRIMARY, marginTop: 16, marginBottom: 8 }]}>
              Choose a Music Therapy Session
            </Text>
            
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.musicTracksContainer}
            >
              {musicTracks.map((track) => (
                <MotiView
                  key={track.id}
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: track.id * 100, type: 'timing' }}
                >
                  <Card 
                    style={[styles.musicTrackCard, { backgroundColor: colors.CARD }]}
                    onPress={() => startMusicTherapy('4-2-6-2', track.id)}
                  >
                    <Card.Content>
                      <View style={styles.trackHeader}>
                        <MaterialCommunityIcons name="music-note" size={28} color={colors.TAB_BAR.ACTIVE} />
                        <Text style={[styles.trackNumber, { color: colors.TEXT.SECONDARY }]}>Track {track.id}</Text>
                      </View>
                      <Title style={{ color: colors.TEXT.PRIMARY, fontSize: 16, marginTop: 8 }}>{track.name}</Title>
                      <Paragraph style={{ color: colors.TEXT.SECONDARY, fontSize: 12, marginTop: 4 }}>
                        {track.description}
                      </Paragraph>
                      <View style={styles.patternContainer}>
                        <MaterialCommunityIcons name="weather-windy" size={14} color={colors.TEXT.SECONDARY} />
                        <Text style={{ color: colors.TEXT.SECONDARY, fontSize: 12, marginLeft: 4 }}>
                          Pattern: 4 - 2 - 6 - 2
                        </Text>
                      </View>
                      <Button 
                        mode="contained" 
                        style={[styles.startMusicButton, { backgroundColor: colors.TAB_BAR.ACTIVE }]}
                        labelStyle={{ color: '#fff', fontSize: 12 }}
                        onPress={() => startMusicTherapy('4-2-6-2', track.id)}
                      >
                        Start
                      </Button>
                    </Card.Content>
                  </Card>
                </MotiView>
              ))}
            </ScrollView>
          </View>
          
          {isAuthenticated && (
            <>
              <Text style={[commonStyles.heading, { color: colors.TEXT.PRIMARY, marginTop: 24, marginBottom: 16 }]}>
                Recent Sessions
              </Text>
              
              {loadingHistory ? (
                <ActivityIndicator 
                  size="small"
                  color={colors.TAB_BAR.ACTIVE}
                  style={{ marginVertical: 20 }}
                />
              ) : pastSessions.length > 0 ? (
                <View style={styles.sessionsContainer}>
                  {pastSessions.map((session, index) => (
                    <MotiView
                      key={session.id}
                      from={{ opacity: 0, translateY: 10 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      transition={{ delay: index * 100, type: 'timing' }}
                    >
                      <Card style={[styles.sessionCard, { backgroundColor: colors.CARD }]}>
                        <Card.Content>
                          <View style={styles.sessionHeader}>
                            <Title style={{ color: colors.TEXT.PRIMARY, fontSize: 16 }}>
                              {session.exercise_name}
                            </Title>
                            <Text style={{ color: colors.TEXT.SECONDARY, fontSize: 12 }}>
                              {formatDate(session.created_at)}
                            </Text>
                          </View>
                          <View style={styles.sessionDetails}>
                            <View style={styles.sessionDetail}>
                              <MaterialCommunityIcons name="clock-outline" size={16} color={colors.TEXT.SECONDARY} />
                              <Text style={{ color: colors.TEXT.SECONDARY, marginLeft: 4 }}>
                                {formatDuration(session.duration_seconds)}
                              </Text>
                            </View>
                            <View style={styles.sessionDetail}>
                              <MaterialCommunityIcons name="playlist-check" size={16} color={colors.TEXT.SECONDARY} />
                              <Text style={{ color: colors.TEXT.SECONDARY, marginLeft: 4 }}>
                                Pattern: {session.pattern?.split('-').join(' - ') || 'Custom'}
                              </Text>
                            </View>
                          </View>
                        </Card.Content>
                      </Card>
                    </MotiView>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons 
                    name="history" 
                    size={40} 
                    color={colors.TEXT.SECONDARY} 
                    style={{ opacity: 0.5, marginBottom: 12 }}
                  />
                  <Text style={{ color: colors.TEXT.SECONDARY, textAlign: 'center' }}>
                    No breathing sessions yet.{'\n'}Complete an exercise to see your history.
                  </Text>
                </View>
              )}
            </>
          )}
          
          {!isAuthenticated && (
            <View style={styles.authPrompt}>
              <MaterialCommunityIcons 
                name="account-outline" 
                size={32} 
                color={colors.TEXT.SECONDARY} 
              />
              <Text style={[styles.authPromptText, { color: colors.TEXT.SECONDARY }]}>
                Sign in to track your breathing sessions
              </Text>
              <Button 
                mode="contained"
                style={{ backgroundColor: colors.TAB_BAR.ACTIVE, marginTop: 12 }}
                labelStyle={{ color: '#fff' }}
                onPress={() => router.push('/profile')}
              >
                Go to Profile
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 20 : 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  exercisesList: {
    marginBottom: 20,
  },
  exerciseCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  cardImage: {
    height: 160,
  },
  benefitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  benefitChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  sessionsContainer: {
    gap: 12,
  },
  sessionCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionDetails: {
    gap: 8,
  },
  sessionDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  authPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginVertical: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderStyle: 'dashed',
  },
  authPromptText: {
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  coinRewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinRewardText: {
    fontSize: 14,
    marginRight: 4,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  coinEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  coinAmount: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#996515',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 14,
  },
  musicIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(0,0,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  musicTherapyContainer: {
    marginBottom: 24,
  },
  therapyInfoCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  benefitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    flexWrap: 'wrap',
  },
  benefitItem: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  musicTracksContainer: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  musicTrackCard: {
    width: 200,
    marginRight: 12,
    borderRadius: 12,
    elevation: 2,
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackNumber: {
    fontSize: 14,
    opacity: 0.7,
  },
  patternContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  startMusicButton: {
    marginTop: 8,
    paddingVertical: 2,
  },
});
