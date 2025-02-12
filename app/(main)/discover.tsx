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
            <Text variant="bodyLarge" style={{ color: colors.TEXT.SECONDARY }}>
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
                  { opacity: pressed ? 0.9 : 1 }
                ]}
                onPress={() => router.push(`/(main)/discover/${post.id}`)}
              >
                <Card style={{ backgroundColor: colors.CARD }}>
                  {post.image_url && (
                    <Card.Cover 
                      source={{ uri: post.image_url }} 
                      style={styles.cardImage}
                    />
                  )}
                  <Card.Title
                    title={post.title}
                    subtitle={`by ${post.author_name}`}
                    titleStyle={[styles.cardTitle, { color: colors.TEXT.PRIMARY }]}
                    subtitleStyle={[styles.cardSubtitle, { color: colors.TEXT.SECONDARY }]}
                    left={(props) => 
                      post.author_profile_pic ? (
                        <Avatar.Image 
                          {...props} 
                          size={40} 
                          source={{ uri: post.author_profile_pic }} 
                        />
                      ) : (
                        <Avatar.Icon 
                          {...props} 
                          size={40} 
                          icon="account" 
                        />
                      )
                    }
                  />
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[
          styles.fab, 
          { 
            backgroundColor: colors.TAB_BAR.ACTIVE,
            opacity: isAuthenticated ? 1 : 0.8 
          }
        ]}
        onPress={handleCreatePost}
        color={colors.BACKGROUND}
      />

      <Portal>
        <Modal
          visible={showAuthModal}
          onDismiss={() => setShowAuthModal(false)}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: colors.SURFACE }
          ]}
        >
          <View style={styles.modalIcon}>
            <MaterialCommunityIcons
              name="account-lock"
              size={48}
              color={colors.TAB_BAR.ACTIVE}
            />
          </View>
          <Text
            variant="titleLarge"
            style={[styles.modalTitle, { color: colors.TEXT.PRIMARY }]}
          >
            Sign in to Create Post
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.modalText, { color: colors.TEXT.SECONDARY }]}
          >
            Please sign in to share your thoughts with the community.
          </Text>
          <Button
            mode="contained"
            onPress={() => {
              setShowAuthModal(false);
              router.push('/(main)/profile');
            }}
            style={[styles.modalButton, { backgroundColor: colors.TAB_BAR.ACTIVE }]}
          >
            Go to Sign In
          </Button>
          <Button
            mode="text"
            onPress={() => setShowAuthModal(false)}
          >
            Maybe Later
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
  },
  title: {
    marginHorizontal: 16,
    marginVertical: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  postsGrid: {
    padding: 16,
    gap: 16,
  },
  postCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    margin: 20,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButton: {
    width: '100%',
    marginBottom: 8,
  },
  cardImage: {
    height: 200,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 14,
  },
}); 