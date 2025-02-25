import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Title, FAB, Card, Text, ActivityIndicator, Portal, Modal, Button, Avatar } from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../src/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';

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
};

export default function Discover() {
  const { colors } = useTheme();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPosts();
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
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
      console.log('Fetching posts...');
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      console.log('Posts data:', posts);
      
      // Transform the data to match our Post type
      const transformedPosts = posts?.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content || '',
        image_url: post.image_url,
        created_at: post.created_at,
        user_id: post.user_id,
        author_name: post.author_name || 'Anonymous',
        author_username: post.author_username || '',
        author_profile_pic: post.author_profile_pic || ''
      })) || [];
      
      console.log('Transformed posts:', transformedPosts);
      setPosts(transformedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, []);

  if (loading) {
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
        contentContainerStyle={{ paddingBottom: 100 }}
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
        <Title style={[styles.title, { color: colors.TEXT.PRIMARY }]}>
          Discover
        </Title>

        {posts.length === 0 ? (
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
          <View style={styles.postsGrid}>
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
                  }}
                >
                  {post.image_url && (
                    <Card.Cover 
                      source={{ uri: post.image_url }} 
                      style={{
                        height: 140,
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                      }}
                    />
                  )}
                  <Card.Title
                    title={post.title}
                    subtitle={`by ${post.author_name}`}
                    titleStyle={[styles.cardTitle, { color: colors.TEXT.PRIMARY, fontWeight: '600' }]}
                    subtitleStyle={[styles.cardSubtitle, { color: colors.TEXT.SECONDARY }]}
                    left={(props) => 
                      <Avatar.Image 
                        {...props}
                        size={40} 
                        source={{ uri: post.author_profile_pic || 'https://i.pravatar.cc/150' }} 
                      />
                    }
                  />
                  <Card.Content style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 0 }}>
                    <Text 
                      style={{ color: colors.TEXT.SECONDARY }}
                      numberOfLines={2}
                    >
                      {post.content.substring(0, 100)}{post.content.length > 100 ? '...' : ''}
                    </Text>
                  </Card.Content>
                </Card>
              </Pressable>
            ))}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    marginTop: 8,
  },
  postsGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  postCard: {
    marginBottom: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  modalContainer: {
    padding: 24,
    margin: 20,
    borderRadius: 16,
  },
  // Add additional styles as needed
}); 