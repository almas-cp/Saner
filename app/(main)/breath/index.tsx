import { View, StyleSheet, Dimensions, Pressable, Modal, Animated, ScrollView, SafeAreaView } from 'react-native';
import { Text, Title, Subheading, Caption, IconButton, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../src/contexts/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import React, { useState, useRef, useEffect } from 'react';
import { COLORS } from '../../../src/styles/theme';

type Exercise = {
  id: string;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  description: string;
  pattern: {
    inhale: number;
    hold1?: number;
    exhale: number;
    hold2?: number;
  };
};

const exercises: Exercise[] = [
  {
    id: 'box',
    name: 'Box Breathing',
    icon: 'square-outline',
    description: 'Inhale, hold, exhale, hold - each for 4 seconds',
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
    pattern: {
      inhale: 2,
      exhale: 2
    }
  }
];

function MoodSlider() {
  const { colors } = useTheme();
  const [mood, setMood] = useState(50);
  const [submitted, setSubmitted] = useState(false);

  const getMoodEmoji = (value: number) => {
    if (value < 30) return { icon: 'emoticon-sad-outline' as const, color: '#FF6B6B', text: 'Not great' };
    if (value < 70) return { icon: 'emoticon-neutral-outline' as const, color: '#FFB347', text: 'Okay' };
    return { icon: 'emoticon-happy-outline' as const, color: '#4AD66D', text: 'Great' };
  };

  const currentMood = getMoodEmoji(mood);
  
  const handleSubmit = () => {
    setSubmitted(true);
  };

  return (
    <View style={[
      styles.moodContainer, 
      { 
        backgroundColor: colors.CARD,
        borderRadius: 20,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        shadowColor: colors.TEXT.PRIMARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 0.5,
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
        <MaterialCommunityIcons
          name={currentMood.icon}
          size={48}
          color={currentMood.color}
          style={{ marginBottom: 8 }}
        />
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
          <Text style={{ color: colors.TEXT.SECONDARY }}>😊</Text>
        </View>
      </View>
      
      {!submitted ? (
        <Button
          onPress={handleSubmit}
          mode="contained"
          style={[styles.moodButton, { backgroundColor: colors.TAB_BAR.ACTIVE }]}
        >
          Log Mood
        </Button>
      ) : (
        <Text style={[styles.thankYouText, { color: colors.TAB_BAR.ACTIVE }]}>
          Thanks for sharing! 🙏
        </Text>
      )}
    </View>
  );
}

function ExerciseModal({ exercise, visible, onClose }: { 
  exercise: Exercise | null, 
  visible: boolean, 
  onClose: () => void 
}) {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  const [timeLeft, setTimeLeft] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [currentScale, setCurrentScale] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [totalCycles, setTotalCycles] = useState(0);

  useEffect(() => {
    const listener = progressAnim.addListener(({ value }) => {
      setCurrentScale(value);
    });
    return () => progressAnim.removeListener(listener);
  }, []);

  const startExercise = () => {
    setHasStarted(true);
    setIsActive(true);
    setPhase('inhale');
    setTotalCycles(0);
    progressAnim.setValue(0);
  };

  const resetExercise = () => {
    setIsActive(false);
    setHasStarted(false);
    setPhase('inhale');
    setTimeLeft(0);
    setTotalCycles(0);
    progressAnim.setValue(0);
  };

  useEffect(() => {
    if (!visible) {
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
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.SURFACE }]}>
          <View style={styles.modalHeader}>
            <Title style={{ color: colors.TEXT.PRIMARY }}>{exercise.name}</Title>
            <IconButton
              icon="close"
              size={24}
              onPress={onClose}
              iconColor={colors.TEXT.PRIMARY}
            />
          </View>

          <View style={styles.exerciseContent}>
            <View style={[styles.circleContainer, { borderColor: colors.TAB_BAR.ACTIVE }]}>
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
                      outputRange: [0.3, 0.15],
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
              <Pressable
                style={[
                  styles.controlButton,
                  { backgroundColor: colors.TAB_BAR.ACTIVE },
                ]}
                onPress={startExercise}
              >
                <MaterialCommunityIcons
                  name="play"
                  size={32}
                  color={colors.BACKGROUND}
                />
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.controlButton,
                  { backgroundColor: colors.TAB_BAR.ACTIVE },
                ]}
                onPress={() => setIsActive(!isActive)}
              >
                <MaterialCommunityIcons
                  name={isActive ? 'pause' : 'play'}
                  size={32}
                  color={colors.BACKGROUND}
                />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ExerciseCard({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  const { colors } = useTheme();
  
  return (
    <Pressable 
      onPress={onPress}
      style={({ pressed }) => [
        styles.exerciseCard,
        {
          backgroundColor: colors.CARD,
          borderRadius: 20,
          shadowColor: colors.TEXT.PRIMARY,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
          borderWidth: 0.5,
          borderColor: colors.BORDER,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.9 : 1,
        }
      ]}
    >
      <View style={styles.exerciseCardContent}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: colors.TAB_BAR.ACTIVE + '20' }
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
        </View>
      </View>
    </Pressable>
  );
}

export default function Breath() {
  const { colors } = useTheme();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Title 
            style={[styles.pageTitle, { color: colors.TEXT.PRIMARY }]}
          >
            Breathing Exercises
          </Title>
          <Text style={[styles.pageSubtitle, { color: colors.TEXT.SECONDARY }]}>
            Calm your mind with these guided exercises
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY }]}>
          Exercises
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

        <Text style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY, marginTop: 24 }]}>
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
  exerciseContent: {
    alignItems: 'center',
    paddingVertical: 20,
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
}); 