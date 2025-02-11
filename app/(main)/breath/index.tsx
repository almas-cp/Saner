import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';

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
  const [mood, setMood] = useState(0.5);
  
  return (
    <View style={styles.moodContainer}>
      <Text variant="titleMedium" style={styles.moodTitle}>How are you feeling?</Text>
      <View style={styles.sliderContainer}>
        <MaterialCommunityIcons name="emoticon-sad-outline" size={24} color="#FF6B6B" />
        <View style={styles.sliderGradient}>
          <LinearGradient
            colors={['#FF6B6B', '#FFB347', '#4AD66D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          />
          <Slider
            value={mood}
            onValueChange={setMood}
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            minimumTrackTintColor="transparent"
            maximumTrackTintColor="transparent"
            thumbTintColor="#fff"
          />
        </View>
        <MaterialCommunityIcons name="emoticon-happy-outline" size={24} color="#4AD66D" />
      </View>
    </View>
  );
}

function ExerciseCard({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Card 
      style={styles.card}
      onPress={onPress}
      mode="elevated"
    >
      <Card.Content style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '10' }]}>
          <MaterialCommunityIcons 
            name={exercise.icon} 
            size={32} 
            color={theme.colors.primary} 
          />
        </View>
        <Text variant="titleMedium" style={styles.cardTitle}>
          {exercise.name}
        </Text>
        <Text variant="bodySmall" style={styles.cardDescription}>
          {exercise.description}
        </Text>
      </Card.Content>
    </Card>
  );
}

export default function Breath() {
  const handleExercisePress = (exercise: Exercise) => {
    router.push({
      pathname: "/(main)/breath/exercise",
      params: { 
        id: exercise.id,
        name: exercise.name,
        pattern: encodeURIComponent(JSON.stringify(exercise.pattern))
      }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>Breathing Exercises</Text>
        <View style={styles.grid}>
          {exercises.map((exercise) => (
            <View key={exercise.id} style={styles.cardContainer}>
              <ExerciseCard
                exercise={exercise}
                onPress={() => handleExercisePress(exercise)}
              />
            </View>
          ))}
        </View>
      </View>
      <MoodSlider />
    </View>
  );
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  moodContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  moodTitle: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#666',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  sliderGradient: {
    flex: 1,
    height: 36,
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 18,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: cardWidth,
    marginBottom: 16,
  },
  card: {
    elevation: 2,
    borderRadius: 16,
  },
  cardContent: {
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  cardDescription: {
    textAlign: 'center',
    color: '#666',
  },
}); 