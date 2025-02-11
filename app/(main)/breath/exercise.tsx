import { View, StyleSheet, Animated, Dimensions, BackHandler } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function Exercise() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id: string; name: string; pattern: string }>();
  const pattern = JSON.parse(decodeURIComponent(params.pattern));
  
  const [phase, setPhase] = useState<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  const [isActive, setIsActive] = useState(true);
  const [currentScale, setCurrentScale] = useState(0.3);
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  
  const getPhaseTime = (currentPhase: string) => {
    switch (currentPhase) {
      case 'inhale': return pattern.inhale * 1000;
      case 'hold1': return (pattern.hold1 || 0) * 1000;
      case 'exhale': return pattern.exhale * 1000;
      case 'hold2': return (pattern.hold2 || 0) * 1000;
      default: return 0;
    }
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'inhale': return 'Inhale';
      case 'hold1': return 'Hold';
      case 'exhale': return 'Exhale';
      case 'hold2': return 'Hold';
      default: return '';
    }
  };

  const getNextPhase = (currentPhase: typeof phase): typeof phase => {
    switch (currentPhase) {
      case 'inhale':
        return pattern.hold1 ? 'hold1' : 'exhale';
      case 'hold1':
        return 'exhale';
      case 'exhale':
        return pattern.hold2 ? 'hold2' : 'inhale';
      case 'hold2':
        return 'inhale';
      default:
        return 'inhale';
    }
  };

  const animate = () => {
    if (!isActive) return;

    const duration = getPhaseTime(phase);
    if (duration === 0) {
      setPhase(getNextPhase(phase));
      return;
    }

    const config = {
      duration,
      useNativeDriver: true
    };

    let scaleAnimation;
    let opacityAnimation;
    let nextScale = currentScale;

    switch (phase) {
      case 'inhale':
        nextScale = 1;
        scaleAnimation = Animated.timing(scaleAnim, {
          toValue: 1,
          ...config
        });
        opacityAnimation = Animated.timing(opacityAnim, {
          toValue: 1,
          ...config
        });
        break;
      case 'exhale':
        nextScale = 0.3;
        scaleAnimation = Animated.timing(scaleAnim, {
          toValue: 0.3,
          ...config
        });
        opacityAnimation = Animated.timing(opacityAnim, {
          toValue: 0.3,
          ...config
        });
        break;
      default:
        scaleAnimation = Animated.timing(scaleAnim, {
          toValue: currentScale,
          ...config
        });
        opacityAnimation = Animated.timing(opacityAnim, {
          toValue: currentScale,
          ...config
        });
    }

    setCurrentScale(nextScale);
    Animated.parallel([scaleAnimation, opacityAnimation]).start(() => {
      if (isActive) {
        setPhase(getNextPhase(phase));
      }
    });
  };

  useEffect(() => {
    animate();
  }, [phase, isActive]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      setIsActive(false);
      router.back();
      return true;
    });

    return () => {
      backHandler.remove();
      setIsActive(false);
    };
  }, []);

  const circleSize = Math.min(Dimensions.get('window').width, Dimensions.get('window').height) * 0.7;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => {
            setIsActive(false);
            router.back();
          }}
        />
        <Text variant="titleLarge" style={styles.headerText}>{params.name}</Text>
        <IconButton
          icon={isActive ? "pause" : "play"}
          size={24}
          onPress={() => setIsActive(!isActive)}
        />
      </View>
      
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.circle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              borderColor: theme.colors.primary,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        />
        <Text variant="displaySmall" style={styles.phaseText}>
          {getPhaseText()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    borderWidth: 2,
    position: 'absolute',
  },
  phaseText: {
    color: '#fff',
    marginTop: 16,
  },
}); 