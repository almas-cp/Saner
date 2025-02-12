import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, ActivityIndicator, Avatar } from 'react-native-paper';
import { useTheme } from '../../../src/contexts/theme';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../src/lib/supabase';

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

export default function ArticleView() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    if (!id) return;
    
    try {
      console.log('Fetching post...');
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      if (postError) throw postError;

      console.log('Post data:', post);

      // Transform the data to match our Post type
      const transformedPost = {
        id: post.id,
        title: post.title,
        content: post.content,
        image_url: post.image_url,
        created_at: post.created_at,
        user_id: post.user_id,
        author_name: post.author_name || 'Anonymous',
        author_username: post.author_username || '',
        author_profile_pic: post.author_profile_pic || ''
      };
      
      console.log('Transformed post:', transformedPost);
      setPost(transformedPost);
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.BACKGROUND, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.TAB_BAR.ACTIVE} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
        <View style={styles.errorContainer}>
          <Text variant="bodyLarge" style={{ color: colors.TEXT.SECONDARY }}>
            Post not found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
      {post.image_url && (
        <Image
          source={{ uri: post.image_url }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.content}>
        <Text variant="headlineLarge" style={[styles.title, { color: colors.TEXT.PRIMARY }]}>
          {post.title}
        </Text>

        <View style={styles.authorContainer}>
          {post.author_profile_pic ? (
            <Avatar.Image
              size={40}
              source={{ uri: post.author_profile_pic }}
            />
          ) : (
            <Avatar.Icon
              size={40}
              icon="account"
            />
          )}
          <View style={styles.authorInfo}>
            <Text variant="titleMedium" style={{ color: colors.TEXT.PRIMARY }}>
              {post.author_name}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.TEXT.SECONDARY }}>
              Posted on {new Date(post.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <Text 
          variant="bodyLarge" 
          style={[styles.postContent, { color: colors.TEXT.PRIMARY }]}
        >
          {post.content}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  coverImage: {
    width: '100%',
    height: 240,
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  authorInfo: {
    marginLeft: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  postContent: {
    lineHeight: 24,
  },
}); 