import { View, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Avatar, Button, Chip, Divider } from 'react-native-paper';
import { useTheme } from '../../../src/contexts/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

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

type ConnectionStatus = 'accepted' | 'pending' | 'rejected' | null;

export default function ArticleView() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(null);
  const [isAuthor, setIsAuthor] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchPost();
  }, [id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchPost = async () => {
    if (!id) return;
    
    try {
      console.log('Fetching post...');
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            name,
            username,
            profile_pic_url
          )
        `)
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
        author_name: post.profiles?.name || post.author_name || 'Anonymous',
        author_username: post.profiles?.username || post.author_username || '',
        author_profile_pic: post.profiles?.profile_pic_url || post.author_profile_pic || ''
      };
      
      console.log('Transformed post:', transformedPost);
      setPost(transformedPost);
      
      // Check if current user is the author
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === post.user_id) {
        setIsAuthor(true);
      }

      // Check connection status if user is logged in and not the author
      if (user && user.id !== post.user_id) {
        const { data: connections, error: connectionsError } = await supabase
          .from('connections')
          .select('*')
          .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
          .or(`requester_id.eq.${post.user_id},target_id.eq.${post.user_id}`);
          
        if (connectionsError) throw connectionsError;
        
        const connection = connections.find(conn => 
          (conn.requester_id === user.id && conn.target_id === post.user_id) ||
          (conn.target_id === user.id && conn.requester_id === post.user_id)
        );
        
        if (connection) {
          setConnectionStatus(connection.status as ConnectionStatus);
        }
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!currentUserId || !post) return;
    
    try {
      // If there's already a connection request, don't create a new one
      if (connectionStatus) return;
      
      const { data, error } = await supabase
        .from('connections')
        .insert({
          requester_id: currentUserId,
          target_id: post.user_id,
          status: 'pending'
        });
        
      if (error) throw error;
      
      // Update local state
      setConnectionStatus('pending');
    } catch (error) {
      console.error('Error connecting with user:', error);
    }
  };

  const handleMessage = async () => {
    if (!currentUserId || !post) return;
    
    try {
      // Check if there's an accepted connection between users
      const { data: connections, error: connectionsError } = await supabase
        .from('connections')
        .select('*')
        .or(`and(requester_id.eq.${currentUserId},target_id.eq.${post.user_id}),and(requester_id.eq.${post.user_id},target_id.eq.${currentUserId})`)
        .eq('status', 'accepted')
        .single();

      if (connectionsError || !connections) {
        alert('You need to connect with this user before starting a chat.');
        return;
      }

      // Navigate to chat with this user
      router.push(`/(main)/chat/${post.user_id}`);
    } catch (error) {
      console.error('Error checking connection:', error);
      alert('You need to connect with this user before starting a chat.');
    }
  };

  const handleViewProfile = () => {
    if (!post) return;
    
    // Navigate to user profile
    router.push(`/(main)/profile/${post.user_id}`);
  };

  const renderConnectionButton = () => {
    if (!currentUserId || isAuthor) return null;
    
    switch (connectionStatus) {
      case 'accepted':
        return (
          <Chip 
            icon="account-check" 
            mode="outlined" 
            style={{ 
              borderColor: '#4CAF50',
              marginRight: 8,
            }}
            textStyle={{ color: '#4CAF50' }}
          >
            Connected
          </Chip>
        );
      case 'pending':
        return (
          <Chip 
            icon="clock-outline" 
            mode="outlined" 
            style={{ 
              borderColor: '#FF9800',
              marginRight: 8,
            }}
            textStyle={{ color: '#FF9800' }}
          >
            Pending
          </Chip>
        );
      case 'rejected':
        return null;
      default:
        return (
          <Button 
            mode="outlined" 
            icon="account-plus"
            onPress={handleConnect}
            style={{ 
              borderColor: colors.TAB_BAR.ACTIVE,
              marginRight: 8,
            }}
            textColor={colors.TAB_BAR.ACTIVE}
          >
            Connect
          </Button>
        );
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
    <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
      <ScrollView>
        {post.image_url && (
          <Image 
            source={{ uri: post.image_url }} 
            style={styles.headerImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.contentContainer}>
          <Text 
            variant="headlineMedium" 
            style={[styles.title, { color: colors.TEXT.PRIMARY }]}
          >
            {post.title}
          </Text>
          
          <View style={styles.authorContainer}>
            <TouchableOpacity onPress={handleViewProfile}>
              <Avatar.Image 
                size={50} 
                source={{ uri: post.author_profile_pic || 'https://i.pravatar.cc/150' }} 
                style={styles.authorAvatar}
              />
            </TouchableOpacity>
            
            <View style={styles.authorInfo}>
              <TouchableOpacity onPress={handleViewProfile}>
                <Text 
                  variant="titleMedium" 
                  style={[styles.authorName, { color: colors.TEXT.PRIMARY }]}
                >
                  {post.author_name}
                </Text>
              </TouchableOpacity>
              
              {post.author_username && (
                <Text 
                  variant="bodyMedium" 
                  style={[styles.username, { color: colors.TEXT.SECONDARY }]}
                >
                  @{post.author_username}
                </Text>
              )}
            </View>

            {currentUserId && post.user_id !== currentUserId && (
              <View style={styles.actionButtons}>
                {renderConnectionButton()}
                
                {connectionStatus === 'accepted' && (
                  <Button 
                    mode="outlined" 
                    icon="chat"
                    onPress={handleMessage}
                    style={{ 
                      borderColor: colors.TAB_BAR.ACTIVE,
                    }}
                    textColor={colors.TAB_BAR.ACTIVE}
                  >
                    Message
                  </Button>
                )}
              </View>
            )}
          </View>
          
          <Text 
            variant="bodySmall" 
            style={[styles.date, { color: colors.TEXT.SECONDARY }]}
          >
            {format(new Date(post.created_at), 'MMMM d, yyyy')}
          </Text>
          
          <Divider style={[styles.divider, { backgroundColor: colors.BORDER }]} />
          
          <Text 
            style={[styles.content, { color: colors.TEXT.PRIMARY }]}
          >
            {post.content}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerImage: {
    width: '100%',
    height: 250,
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorAvatar: {
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontWeight: 'bold',
  },
  username: {
    opacity: 0.8,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  date: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
}); 