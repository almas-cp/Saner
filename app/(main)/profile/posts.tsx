import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Text, ActivityIndicator, Card, Avatar } from 'react-native-paper';
import { useTheme } from '../../../src/contexts/theme';
import { useState, useEffect } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { useRouter } from 'expo-router';

type Post = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author_name: string;
  author_username: string;
  author_profile_pic: string;
};

export default function MyPosts() {
  const { colors } = useTheme();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(main)/profile');
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.BACKGROUND, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.TAB_BAR.ACTIVE} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.BACKGROUND }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.TAB_BAR.ACTIVE]}
          tintColor={colors.TAB_BAR.ACTIVE}
        />
      }
    >
      <Text 
        variant="headlineMedium" 
        style={[styles.title, { color: colors.TEXT.PRIMARY }]}
      >
        My Posts
      </Text>

      {posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text 
            variant="bodyLarge" 
            style={{ color: colors.TEXT.SECONDARY, textAlign: 'center' }}
          >
            You haven't created any posts yet.{'\n'}
            Share your thoughts with the community!
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
                  subtitle={new Date(post.created_at).toLocaleDateString()}
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
  );
}

const styles = StyleSheet.create({
  container: {
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
    marginTop: 40,
  },
  postsGrid: {
    padding: 16,
    gap: 16,
  },
  postCard: {
    borderRadius: 12,
    overflow: 'hidden',
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