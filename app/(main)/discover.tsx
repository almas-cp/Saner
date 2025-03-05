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
                    title={
                      <View style={styles.titleContainer}>
                        <Text style={[styles.cardTitle, { color: colors.TEXT.PRIMARY, fontWeight: '600' }]}>
                          {post.title}
                        </Text>
                      </View>
                    }
                    subtitle={
                      <View style={styles.subtitleContainer}>
                        <Text style={[styles.cardSubtitle, { color: colors.TEXT.SECONDARY }]}>
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
                        size={40} 
                        source={{ uri: post.author_profile_pic || 'https://i.pravatar.cc/150' }} 
                      />
                    }
                  />
                  <Card.Content style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 0, position: 'relative' }}>
                    <Text 
                      style={{ 
                        color: colors.TEXT.SECONDARY, 
                        fontSize: 12,
                        position: 'absolute',
                        bottom: 16,
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
}); 