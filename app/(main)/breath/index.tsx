import { View, StyleSheet, Dimensions, Pressable, Modal, Animated } from 'react-native';
import { Text, Title, Subheading, Caption, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../src/contexts/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import React, { useState, useRef, useEffect } from 'react';

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
  const [mood, setMood] = React.useState(0.5);

  const getMoodEmoji = (value: number) => {
    if (value < 0.3) return { icon: 'emoticon-sad-outline' as const, color: '#FF6B6B', text: 'Not great' };
    if (value < 0.7) return { icon: 'emoticon-neutral-outline' as const, color: '#FFB347', text: 'Okay' };
    return { icon: 'emoticon-happy-outline' as const, color: '#4AD66D', text: 'Great' };
  };

  const currentMood = getMoodEmoji(mood);
  
  return (
    <View style={[styles.moodContainer, { backgroundColor: colors.SURFACE }]}>
      <View style={styles.moodHeader}>
        <Subheading style={[styles.moodTitle, { color: colors.TEXT.PRIMARY }]}>
          How are you feeling?
        </Subheading>
        <Caption style={[styles.moodValue, { color: currentMood.color }]}>
          {currentMood.text}
        </Caption>
      </View>

      <View style={styles.sliderContainer}>
        <MaterialCommunityIcons 
          name="emoticon-sad-outline" 
          size={24} 
          color="#FF6B6B"
          style={styles.moodIcon}
        />
        <View style={styles.sliderWrapper}>
          <LinearGradient
            colors={['#FF6B6B', '#FFB347', '#4AD66D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          />
          <Slider
            style={styles.slider}
            value={mood}
            onValueChange={setMood}
            minimumValue={0}
            maximumValue={1}
            minimumTrackTintColor="transparent"
            maximumTrackTintColor="transparent"
            thumbTintColor="#fff"
            tapToSeek={true}
          />
        </View>
        <MaterialCommunityIcons 
          name="emoticon-happy-outline" 
          size={24} 
          color="#4AD66D"
          style={styles.moodIcon}
        />
      </View>

      <View style={styles.moodIndicator}>
        <MaterialCommunityIcons 
          name={currentMood.icon}
          size={32}
          color={currentMood.color}
          style={styles.currentMoodIcon}
        />
      </View>
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
                <Title style={{ color: colors.TEXT.PRIMARY }}>{timeLeft}s</Title>
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
      style={({ pressed }) => [
        styles.card,
        { 
          backgroundColor: colors.CARD,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        }
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.SURFACE }]}>
        <MaterialCommunityIcons 
          name={exercise.icon} 
          size={32} 
          color={colors.TAB_BAR.ACTIVE}
        />
      </View>
      <Subheading 
        style={[styles.cardTitle, { color: colors.TEXT.PRIMARY }]}
      >
        {exercise.name}
      </Subheading>
      <Caption 
        style={[styles.cardDescription, { color: colors.TEXT.SECONDARY }]}
      >
        {exercise.description}
      </Caption>
    </Pressable>
  );
}

export default function Breath() {
  const { colors } = useTheme();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
      <View style={styles.content}>
        <Title 
          style={[styles.title, { color: colors.TEXT.PRIMARY }]}
        >
          Breathing Exercises
        </Title>
        <View style={styles.grid}>
          {exercises.map((exercise) => (
            <View key={exercise.id} style={styles.cardContainer}>
              <ExerciseCard
                exercise={exercise}
                onPress={() => setSelectedExercise(exercise)}
              />
            </View>
          ))}
        </View>
      </View>
      <MoodSlider />
      
      <ExerciseModal
        exercise={selectedExercise}
        visible={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />
    </View>
  );
}

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_SPACING = 12;
const CARD_SIZE = (width - (GRID_PADDING * 2) - GRID_SPACING) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: GRID_PADDING,
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: GRID_SPACING,
  },
  cardContainer: {
    width: CARD_SIZE,
    height: CARD_SIZE,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    textAlign: 'center',
  },
  moodContainer: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  moodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  moodTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  moodValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  moodIcon: {
    width: 24,
    height: 24,
  },
  sliderWrapper: {
    flex: 1,
    height: 40,
    marginHorizontal: 12,
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 18,
    height: 4,
    borderRadius: 2,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  moodIndicator: {
    alignItems: 'center',
    marginTop: 8,
  },
  currentMoodIcon: {
    marginTop: 4,
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