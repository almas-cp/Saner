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
  phone_number: string | null;
  gender: string | null;
  date_of_birth: string | null;
  is_doctor: boolean | null;
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

  const formattedDateOfBirth = profile.date_of_birth 
    ? new Date(profile.date_of_birth).toLocaleDateString() 
    : null;

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
      <View style={styles.header}>
        <View style={styles.profileInfo}>
          <Avatar.Image
            size={100}
            source={{ uri: profile.profile_pic_url || 'https://i.pravatar.cc/300' }}
          />
          <View style={styles.nameSection}>
            <Text variant="headlineSmall" style={{ color: colors.TEXT.PRIMARY, fontWeight: 'bold' }}>
              {profile.name}
            </Text>
            <Text variant="titleMedium" style={{ color: colors.TEXT.SECONDARY }}>
              @{profile.username}
            </Text>
            {profile.is_doctor && (
              <Chip
                icon="medical-bag"
                mode="flat"
                style={{ 
                  marginTop: 8,
                  backgroundColor: '#E0F2F1',
                }}
                textStyle={{ color: '#00897B' }}
              >
                Healthcare Professional
              </Chip>
            )}
          </View>
        </View>

        {renderConnectionStatus()}
      </View>

      <Divider style={{ marginVertical: 16 }} />

      {/* Profile details section */}
      <View style={styles.detailsSection}>
        <Text variant="titleMedium" style={{ color: colors.TEXT.PRIMARY, marginBottom: 12 }}>
          Profile Information
        </Text>

        {profile.gender && (
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="gender-male-female" size={24} color={colors.TEXT.SECONDARY} />
            <Text style={{ color: colors.TEXT.PRIMARY, marginLeft: 12 }}>
              {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
            </Text>
          </View>
        )}

        {formattedDateOfBirth && (
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="calendar" size={24} color={colors.TEXT.SECONDARY} />
            <Text style={{ color: colors.TEXT.PRIMARY, marginLeft: 12 }}>
              {formattedDateOfBirth}
            </Text>
          </View>
        )}

        {profile.phone_number && (
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="phone" size={24} color={colors.TEXT.SECONDARY} />
            <Text style={{ color: colors.TEXT.PRIMARY, marginLeft: 12 }}>
              {profile.phone_number}
            </Text>
          </View>
        )}
      </View>

      <Divider style={{ marginVertical: 16 }} />

      {/* Posts section */}
      <Text variant="titleMedium" style={{ color: colors.TEXT.PRIMARY, marginHorizontal: 16, marginBottom: 12 }}>
        Posts
      </Text>

      {posts.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="post-outline" size={48} color={colors.TEXT.SECONDARY} />
          <Text style={{ color: colors.TEXT.SECONDARY, marginTop: 8, textAlign: 'center' }}>
            No posts yet
          </Text>
        </View>
      ) : (
        <View style={styles.postsContainer}>
          {posts.map(post => (
            <Pressable
              key={post.id}
              style={({ pressed }) => [
                styles.postItem,
                { 
                  backgroundColor: colors.CARD,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => router.push(`/(main)/discover/${post.id}`)}
            >
              <Text 
                numberOfLines={1} 
                style={{ 
                  color: colors.TEXT.PRIMARY, 
                  fontWeight: '600',
                  fontSize: 16,
                }}
              >
                {post.title}
              </Text>
              <Text 
                numberOfLines={2} 
                style={{ 
                  color: colors.TEXT.SECONDARY,
                  fontSize: 14,
                  marginTop: 4,
                }}
              >
                {post.content}
              </Text>
              <Text 
                style={{ 
                  color: colors.TEXT.TERTIARY,
                  fontSize: 12,
                  marginTop: 8,
                }}
              >
                {new Date(post.created_at).toLocaleDateString()}
              </Text>
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
  header: {
    padding: 16,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameSection: {
    marginLeft: 16,
    flex: 1,
  },
  connectionInfo: {
    marginTop: 16,
    alignItems: 'flex-start',
  },
  detailsSection: {
    paddingHorizontal: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  postsContainer: {
    padding: 16,
    gap: 12,
  },
  postItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
});