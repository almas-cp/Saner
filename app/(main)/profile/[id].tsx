import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Avatar, Button, ActivityIndicator } from 'react-native-paper';
import { useTheme } from '../../../src/contexts/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { MotiView } from 'moti';

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

type ConnectionStatus = 'none' | 'pending' | 'connected';

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
      if (user) {
        const { data: connectionData, error: connectionError } = await supabase
          .from('connections')
          .select('*')
          .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
          .eq(user.id === id ? 'requester_id' : 'target_id', id)
          .single();

        if (connectionError && connectionError.code !== 'PGRST116') {
          throw connectionError;
        }

        if (connectionData) {
          setConnectionStatus(connectionData.status === 'pending' ? 'pending' : 'connected');
        } else {
          setConnectionStatus('none');
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
        <Text variant="titleMedium" style={{ color: colors.TEXT.SECONDARY }}>
          @{profile.username || 'username'}
        </Text>

        {currentUserId && currentUserId !== profile.id && (
          <Button
            mode="contained"
            onPress={handleConnect}
            disabled={connectionStatus !== 'none'}
            style={[styles.connectButton, { backgroundColor: colors.TAB_BAR.ACTIVE }]}
          >
            {connectionStatus === 'connected' ? 'Connected'
              : connectionStatus === 'pending' ? 'Request Pending'
              : 'Connect'}
          </Button>
        )}
      </MotiView>

      <View style={styles.postsSection}>
        <Text variant="titleLarge" style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY }]}>
          Posts
        </Text>
        {posts.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.TEXT.SECONDARY }]}>
            No posts yet
          </Text>
        ) : (
          posts.map((post) => (
            <MotiView
              key={post.id}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500 }}
              style={[styles.postCard, { backgroundColor: colors.SURFACE }]}
            >
              <Text variant="titleMedium" style={{ color: colors.TEXT.PRIMARY }}>
                {post.title}
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.TEXT.SECONDARY }}>
                {post.content}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.TEXT.SECONDARY, marginTop: 8 }}>
                {new Date(post.created_at).toLocaleDateString()}
              </Text>
            </MotiView>
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
    marginTop: 16,
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
    marginTop: 16,
  },
}); 