import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Text, Avatar, Button, ActivityIndicator, Chip, Divider } from 'react-native-paper';
import { useTheme } from '../../../src/contexts/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type ProfileData = {
  id: string;
  name: string | null;
  username: string | null;
  profile_pic_url: string | null;
};

type Post = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
};

type ConnectionStatus = 'none' | 'pending' | 'accepted' | 'rejected';

export default function UserProfile() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('none');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Get posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData);

      // Check connection status
      if (user && user.id !== id) {
        const { data: connectionData, error: connectionError } = await supabase
          .from('connections')
          .select('*')
          .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
          .or(`requester_id.eq.${id},target_id.eq.${id}`);

        if (connectionError) {
          throw connectionError;
        }

        // Find the connection between the current user and the profile owner
        const connection = connectionData?.find(conn => 
          (conn.requester_id === user.id && conn.target_id === id) || 
          (conn.target_id === user.id && conn.requester_id === id)
        );

        if (connection) {
          setConnectionStatus(connection.status as ConnectionStatus);
          setConnectionId(connection.id);
        } else {
          setConnectionStatus('none');
          setConnectionId(null);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile().finally(() => setRefreshing(false));
  }, [id]);

  const handleConnect = async () => {
    if (!currentUserId || !profile) return;

    try {
      const { error } = await supabase
        .from('connections')
        .insert({
          requester_id: currentUserId,
          target_id: profile.id,
          status: 'pending'
        });

      if (error) throw error;
      setConnectionStatus('pending');
    } catch (error) {
      console.error('Error sending connection request:', error);
    }
  };

  const handleCancelRequest = async () => {
    if (!connectionId) return;
    
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);
        
      if (error) throw error;
      setConnectionStatus('none');
      setConnectionId(null);
    } catch (error) {
      console.error('Error canceling connection request:', error);
    }
  };

  const handleMessage = () => {
    if (!profile) return;
    router.push(`/(main)/chat/${profile.id}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.BACKGROUND, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.TAB_BAR.ACTIVE} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
        <Text>Profile not found</Text>
      </View>
    );
  }

  const renderConnectionStatus = () => {
    if (!currentUserId || currentUserId === profile.id) return null;
    
    switch (connectionStatus) {
      case 'accepted':
        return (
          <View style={styles.connectionInfo}>
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
            
            <Button 
              mode="outlined" 
              icon="chat-outline"
              onPress={handleMessage}
              style={{ 
                marginTop: 12,
                borderColor: colors.TAB_BAR.ACTIVE,
                borderRadius: 20,
              }}
              contentStyle={{ paddingHorizontal: 8 }}
            >
              Message
            </Button>
          </View>
        );
      case 'pending':
        // Check if the current user is the requester or the target
        return (
          <View style={styles.connectionInfo}>
            <Chip 
              icon="clock-outline" 
              mode="outlined"
              style={{ 
                borderColor: '#FF9800',
                marginBottom: 12,
              }}
              textStyle={{ color: '#FF9800' }}
            >
              Request Pending
            </Chip>
            
            <Button 
              mode="outlined" 
              icon="close"
              onPress={handleCancelRequest}
              style={{ 
                borderColor: '#F44336',
                borderRadius: 20,
              }}
              textColor="#F44336"
              contentStyle={{ paddingHorizontal: 8 }}
            >
              Cancel Request
            </Button>
          </View>
        );
      case 'rejected':
        return null; // Don't show anything if the request was rejected
      default:
        return (
          <Button
            mode="contained"
            icon="account-plus"
            onPress={handleConnect}
            style={[styles.connectButton, { backgroundColor: colors.TAB_BAR.ACTIVE }]}
          >
            Connect
          </Button>
        );
    }
  };

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
      <MotiView
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 500 }}
        style={styles.header}
      >
        <Avatar.Image
          size={80}
          source={{ uri: profile.profile_pic_url || 'https://i.pravatar.cc/300' }}
          style={styles.avatar}
        />
        <Text variant="headlineMedium" style={{ color: colors.TEXT.PRIMARY }}>
          {profile.name || 'Anonymous'}
        </Text>
        <Text variant="titleMedium" style={{ color: colors.TEXT.SECONDARY, marginBottom: 16 }}>
          @{profile.username || 'username'}
        </Text>

        {renderConnectionStatus()}
      </MotiView>

      <Divider style={{ marginVertical: 8 }} />

      <View style={styles.postsSection}>
        <Text variant="titleLarge" style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY }]}>
          Posts
        </Text>
        {posts.length === 0 ? (
          <View style={styles.emptyPosts}>
            <MaterialCommunityIcons 
              name="post-outline" 
              size={48} 
              color={colors.TEXT.SECONDARY} 
              style={{ opacity: 0.6, marginBottom: 8 }}
            />
            <Text style={[styles.emptyText, { color: colors.TEXT.SECONDARY }]}>
              No posts yet
            </Text>
          </View>
        ) : (
          posts.map((post) => (
            <Pressable
              key={post.id}
              style={({ pressed }) => [
                { 
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }]
                }
              ]}
              onPress={() => router.push(`/(main)/discover/${post.id}`)}
            >
              <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 500 }}
                style={[styles.postCard, { backgroundColor: colors.SURFACE }]}
              >
                <Text variant="titleMedium" style={{ color: colors.TEXT.PRIMARY }}>
                  {post.title}
                </Text>
                <Text variant="bodyMedium" style={{ color: colors.TEXT.SECONDARY }}>
                  {post.content.length > 150 ? `${post.content.substring(0, 150)}...` : post.content}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.TEXT.SECONDARY, marginTop: 8 }}>
                  {new Date(post.created_at).toLocaleDateString()}
                </Text>
              </MotiView>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatar: {
    marginBottom: 16,
  },
  connectButton: {
    marginTop: 8,
    borderRadius: 20,
    paddingHorizontal: 24,
  },
  postsSection: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  postCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  emptyText: {
    textAlign: 'center',
  },
  emptyPosts: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  connectionInfo: {
    alignItems: 'center',
    marginTop: 8,
  },
}); 