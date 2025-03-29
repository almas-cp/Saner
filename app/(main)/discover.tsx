import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Title, FAB, Card, Text, ActivityIndicator, Portal, Modal, Button, Avatar, IconButton, Chip } from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../src/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';

type BreathingExercise = {
  id: string;
  name: string;
  description: string;
  pattern: string;
  benefits: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  imageUrl?: string;
};

const todaysBreathingExercises: BreathingExercise[] = [
  {
    id: 'box-breathing',
    name: 'Box Breathing',
    description: 'A technique used to calm the nervous system. Inhale, hold, exhale, and hold for equal counts.',
    pattern: '4-4-4-4',
    benefits: ['Stress reduction', 'Better focus'],
    difficulty: 'beginner',
    duration: 5,
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGJyZWF0aGluZ3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60'
  },
  {
    id: 'deep-breathing',
    name: 'Deep Breathing',
    description: 'Simple deep breathing to increase oxygen flow and induce calmness.',
    pattern: '4-0-6-0',
    benefits: ['Stress reduction', 'Energy boost'],
    difficulty: 'beginner',
    duration: 3,
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZGVlcCUyMGJyZWF0aHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60'
  }
];

const BREATHING_EXERCISE_COIN_REWARD = 10;

type Post = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  author_name: string;
  author_username: string;
  author_profile_pic: string;
  author_is_doctor: boolean;
};

export default function Discover() {
  const { colors } = useTheme();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchPosts();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
    if (user) {
      setCurrentUserId(user.id);
    } else {
      setCurrentUserId(null);
    }
  };

  const handleCreatePost = () => {
    if (isAuthenticated) {
      router.push('/(main)/discover/create');
    } else {
      setShowAuthModal(true);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      console.log('Fetching posts...');
      
      // Get all posts regardless of connection status
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            name,
            username,
            profile_pic_url,
            is_doctor
          )
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      
      const transformedPosts = processPostsData(posts);
      setPosts(transformedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const processPostsData = (posts: any[]) => {
    return posts?.map(post => {
      return {
        id: post.id,
        title: post.title,
        content: post.content || '',
        image_url: post.image_url,
        created_at: post.created_at,
        user_id: post.user_id,
        author_name: post.profiles?.name || post.author_name || 'Anonymous',
        author_username: post.profiles?.username || post.author_username || '',
        author_profile_pic: post.profiles?.profile_pic_url || post.author_profile_pic || '',
        author_is_doctor: post.profiles?.is_doctor || false
      };
    }) || [];
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, []);

  if (loading && posts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.BACKGROUND, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.TAB_BAR.ACTIVE} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.TAB_BAR.ACTIVE]}
            tintColor={colors.TAB_BAR.ACTIVE}
            progressBackgroundColor={colors.CARD}
          />
        }
      >
        <View style={styles.headerContainer}>
          <Title style={[styles.title, { color: colors.TEXT.PRIMARY }]}>
            Discover
          </Title>
          
          <IconButton
            icon="magnify"
            size={24}
            iconColor={colors.TEXT.PRIMARY}
            onPress={() => router.push('/(main)/search')}
            style={{
              marginLeft: 8,
              backgroundColor: 'rgba(150, 150, 150, 0.1)', 
              borderRadius: 20,
            }}
          />
        </View>

        {loading && (
          <ActivityIndicator 
            size="small" 
            color={colors.TAB_BAR.ACTIVE}
            style={{ marginVertical: 16 }} 
          />
        )}

        {posts.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="post-outline"
              size={48}
              color={colors.TEXT.SECONDARY}
              style={{ marginBottom: 12, opacity: 0.6 }}
            />
            <Text variant="bodyLarge" style={{ color: colors.TEXT.SECONDARY, textAlign: 'center' }}>
              No posts yet. Be the first to share!
            </Text>
          </View>
        ) : (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY }]}>Latest Posts</Text>
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContainer}
            >
              {posts.map((post) => (
                <Pressable
                  key={post.id}
                  style={({ pressed }) => [
                    styles.postCard,
                    { 
                      opacity: pressed ? 0.9 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }]
                    }
                  ]}
                  onPress={() => router.push(`/(main)/discover/${post.id}`)}
                >
                  <Card 
                    style={{ 
                      backgroundColor: colors.CARD,
                      borderRadius: 16,
                      overflow: 'hidden',
                      elevation: 2,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      marginBottom: 4,
                      width: 250,
                    }}
                  >
                    {post.image_url && (
                      <Card.Cover 
                        source={{ uri: post.image_url }} 
                        style={{
                          height: 120,
                          borderTopLeftRadius: 16,
                          borderTopRightRadius: 16,
                        }}
                      />
                    )}
                    <Card.Title
                      title={
                        <View style={styles.titleContainer}>
                          <Text 
                            style={[styles.cardTitle, { color: colors.TEXT.PRIMARY, fontWeight: '600' }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {post.title}
                          </Text>
                        </View>
                      }
                      subtitle={
                        <View style={styles.subtitleContainer}>
                          <Text 
                            style={[styles.cardSubtitle, { color: colors.TEXT.SECONDARY }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            by {post.author_name}
                          </Text>
                          {post.author_is_doctor && (
                            <MaterialCommunityIcons name="check-decagram" size={16} color="#1DA1F2" style={{marginLeft: 4}} />
                          )}
                        </View>
                      }
                      titleStyle={{marginBottom: 0, paddingBottom: 0}}
                      subtitleStyle={{marginTop: 0, paddingTop: 0}}
                      left={(props) => 
                        <Avatar.Image 
                          {...props}
                          size={36} 
                          source={{ uri: post.author_profile_pic || 'https://i.pravatar.cc/150' }} 
                        />
                      }
                    />
                    <Card.Content style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 0, position: 'relative', height: 40 }}>
                      <Text 
                        style={{ 
                          color: colors.TEXT.SECONDARY, 
                          fontSize: 11,
                          position: 'absolute',
                          bottom: 12,
                          right: 16,
                          fontStyle: 'italic',
                          opacity: 0.8
                        }}
                      >
                        {new Date(post.created_at).toLocaleDateString()}
                      </Text>
                    </Card.Content>
                  </Card>
                </Pressable>
              ))}
            </ScrollView>
            
            <Text style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY, marginTop: 20 }]}>Today's Breathing Exercises</Text>
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContainer}
            >
              {todaysBreathingExercises.map((exercise) => (
                <Pressable
                  key={exercise.id}
                  style={({ pressed }) => [
                    styles.exerciseCard,
                    { 
                      opacity: pressed ? 0.9 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }]
                    }
                  ]}
                  onPress={() => router.push({
                    pathname: '/(main)/breath/exercise',
                    params: {
                      name: exercise.name,
                      pattern: exercise.pattern
                    }
                  })}
                >
                  <Card 
                    style={{ 
                      backgroundColor: colors.CARD,
                      borderRadius: 16,
                      overflow: 'hidden',
                      elevation: 2,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      width: 200,
                    }}
                  >
                    {exercise.imageUrl && (
                      <Card.Cover 
                        source={{ uri: exercise.imageUrl }} 
                        style={{
                          height: 100,
                          borderTopLeftRadius: 16,
                          borderTopRightRadius: 16,
                        }}
                      />
                    )}
                    <Card.Content style={{ padding: 12 }}>
                      <View style={styles.exerciseHeader}>
                        <Text style={[styles.exerciseName, { color: colors.TEXT.PRIMARY }]}>
                          {exercise.name}
                        </Text>
                        <View style={styles.difficultyBadge}>
                          <Text style={styles.difficultyText}>
                            {exercise.difficulty}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.exerciseMetaRow}>
                        {/* Duration */}
                        <View style={styles.durationContainer}>
                          <MaterialCommunityIcons 
                            name="clock-outline" 
                            size={14} 
                            color={colors.TEXT.SECONDARY} 
                            style={{marginRight: 2}} 
                          />
                          <Text style={[styles.durationText, { color: colors.TEXT.SECONDARY }]}>
                            {exercise.duration} min
                          </Text>
                        </View>
                        
                        {/* Reward */}
                        <View style={styles.coinRewardContainer}>
                          <Text style={{ color: colors.TEXT.SECONDARY, fontSize: 11 }}>
                            +{BREATHING_EXERCISE_COIN_REWARD}
                          </Text>
                          <Text style={styles.coinEmoji}>💰</Text>
                        </View>
                      </View>
                      
                      <View style={styles.benefitsContainer}>
                        {exercise.benefits.map((benefit, i) => (
                          <Chip 
                            key={i} 
                            style={styles.benefitChip}
                            textStyle={{ fontSize: 10 }}
                          >
                            {benefit}
                          </Chip>
                        ))}
                      </View>
                    </Card.Content>
                  </Card>
                </Pressable>
              ))}
            </ScrollView>
            
            <Text style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY, marginTop: 20 }]}>Consult a Professional</Text>
            <Card 
              style={{
                backgroundColor: colors.CARD,
                borderRadius: 16,
                overflow: 'hidden',
                elevation: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                marginTop: 8,
                marginBottom: 24,
              }}
            >
              <LinearGradient
                colors={['#6B4DE6', '#9B7EFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.consultBanner}
              >
                <View style={styles.consultBannerContent}>
                  <View style={styles.consultTextContainer}>
                    <Text style={styles.consultTitle}>Need personalized guidance?</Text>
                    <Text style={styles.consultSubtitle}>
                      Connect with healthcare professionals for personalized advice tailored to your specific needs.
                    </Text>
                  </View>
                  <View style={styles.consultImageContainer}>
                    <MaterialCommunityIcons name="doctor" size={60} color="rgba(255,255,255,0.85)" />
                  </View>
                </View>
              </LinearGradient>
              <Card.Content style={{ padding: 16 }}>
                <View style={styles.consultFeatures}>
                  <View style={styles.consultFeatureItem}>
                    <MaterialCommunityIcons name="message-text-outline" size={22} color={colors.TAB_BAR.ACTIVE} style={styles.consultFeatureIcon} />
                    <Text style={[styles.consultFeatureText, { color: colors.TEXT.SECONDARY }]}>Private messaging</Text>
                  </View>
                  <View style={styles.consultFeatureItem}>
                    <MaterialCommunityIcons name="certificate-outline" size={22} color={colors.TAB_BAR.ACTIVE} style={styles.consultFeatureIcon} />
                    <Text style={[styles.consultFeatureText, { color: colors.TEXT.SECONDARY }]}>Verified professionals</Text>
                  </View>
                  <View style={styles.consultFeatureItem}>
                    <MaterialCommunityIcons name="lock-outline" size={22} color={colors.TAB_BAR.ACTIVE} style={styles.consultFeatureIcon} />
                    <Text style={[styles.consultFeatureText, { color: colors.TEXT.SECONDARY }]}>Secure & confidential</Text>
                  </View>
                </View>
                <Button
                  mode="contained"
                  style={[styles.consultButton, { backgroundColor: colors.TAB_BAR.ACTIVE }]}
                  onPress={() => router.push('/(main)/professionals')}
                >
                  Find a Professional
                </Button>
              </Card.Content>
            </Card>
          </View>
        )}
      </ScrollView>

      <FAB
        style={[
          styles.fab, 
          { 
            backgroundColor: colors.TAB_BAR.ACTIVE,
          }
        ]}
        icon="plus"
        color="#FFF"
        onPress={handleCreatePost}
      />

      <Portal>
        <Modal
          visible={showAuthModal}
          onDismiss={() => setShowAuthModal(false)}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: colors.SURFACE }
          ]}
        >
          <Text 
            variant="headlineSmall" 
            style={{ 
              color: colors.TEXT.PRIMARY, 
              marginBottom: 16,
              fontWeight: 'bold',
              textAlign: 'center'
            }}
          >
            Sign In Required
          </Text>
          <Text 
            style={{ 
              color: colors.TEXT.SECONDARY, 
              marginBottom: 24,
              textAlign: 'center',
              lineHeight: 22
            }}
          >
            Please sign in to create a new post and share with the community.
          </Text>
          <Button 
            mode="contained" 
            onPress={() => {
              setShowAuthModal(false);
              router.push('/(main)/profile');
            }}
            style={{ 
              borderRadius: 8,
              paddingVertical: 6,
              backgroundColor: colors.TAB_BAR.ACTIVE
            }}
          >
            Go to Sign In
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  postsGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  postCard: {
    marginRight: 12,
    position: 'relative',
  },
  cardTitle: {
    fontSize: 16,
  },
  cardSubtitle: {
    fontSize: 14,
  },
  cardImage: {
    height: 150,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 70,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  modalContainer: {
    padding: 24,
    marginHorizontal: 24,
    borderRadius: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  horizontalScrollContainer: {
    paddingRight: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  exerciseCard: {
    marginRight: 12,
    position: 'relative',
  },
  breathingExercisesContainer: {
    marginTop: 8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
  },
  difficultyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
  },
  difficultyText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  exerciseDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  exerciseMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 12,
  },
  coinRewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinEmoji: {
    fontSize: 12,
    marginRight: 2,
  },
  coinAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B7791F',
  },
  benefitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  benefitChip: {
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 12,
    height: 24,
  },
  consultBanner: {
    height: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  consultBannerContent: {
    flexDirection: 'row',
    height: '100%',
  },
  consultTextContainer: {
    flex: 3,
    justifyContent: 'center',
  },
  consultImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  consultTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  consultSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 18,
  },
  consultFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  consultFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 10,
  },
  consultFeatureIcon: {
    marginRight: 8,
  },
  consultFeatureText: {
    fontSize: 13,
  },
  consultButton: {
    borderRadius: 8,
    paddingVertical: 4,
  },
}); 