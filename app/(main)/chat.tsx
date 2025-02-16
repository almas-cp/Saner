import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Title, Text, List, Avatar, Button, ActivityIndicator, Surface, Divider } from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';

type Database = {
  public: {
    Tables: {
      connections: {
        Row: {
          id: string;
          requester_id: string;
          target_id: string;
          status: 'pending' | 'accepted' | 'rejected';
          created_at: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          name: string | null;
          username: string | null;
          profile_pic_url: string | null;
        };
      };
    };
  };
};

type ConnectionRequest = Database['public']['Tables']['connections']['Row'] & {
  requester: Database['public']['Tables']['profiles']['Row'];
};

export default function Chat() {
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);

  const fetchConnectionRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('connections')
        .select(`
          id,
          requester_id,
          target_id,
          status,
          created_at,
          requester:profiles!connections_requester_id_fkey (
            id,
            name,
            username,
            profile_pic_url
          )
        `)
        .eq('target_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Safely type the response data
      const typedData = (data as unknown as ConnectionRequest[]) || [];
      setConnectionRequests(typedData);
    } catch (error) {
      console.error('Error fetching connection requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectionRequests();

    // Subscribe to changes in the connections table
    const channel = supabase
      .channel('connections_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
        },
        () => {
          fetchConnectionRequests();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConnectionRequests().finally(() => setRefreshing(false));
  }, []);

  const handleConnectionResponse = async (connectionId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', connectionId);

      if (error) throw error;
      
      // Remove the request from the list
      setConnectionRequests(prev => prev.filter(req => req.id !== connectionId));
    } catch (error) {
      console.error('Error responding to connection request:', error);
    }
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
      {connectionRequests.length > 0 && (
        <View style={styles.section}>
          <Title style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY }]}>
            Connection Requests
          </Title>
          {connectionRequests.map((request, index) => (
            <MotiView
              key={request.id}
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'timing', duration: 500, delay: index * 100 }}
            >
              <Surface style={[styles.requestCard, { backgroundColor: colors.SURFACE }]}>
                <View style={styles.requestHeader}>
                  <Avatar.Image
                    size={48}
                    source={{ uri: request.requester.profile_pic_url || 'https://i.pravatar.cc/300' }}
                  />
                  <View style={styles.requestInfo}>
                    <Text variant="titleMedium" style={{ color: colors.TEXT.PRIMARY }}>
                      {request.requester.name || 'Anonymous'}
                    </Text>
                    <Text variant="bodyMedium" style={{ color: colors.TEXT.SECONDARY }}>
                      @{request.requester.username || 'username'}
                    </Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <Button
                    mode="contained"
                    onPress={() => handleConnectionResponse(request.id, true)}
                    style={[styles.actionButton, { backgroundColor: colors.TAB_BAR.ACTIVE }]}
                  >
                    Accept
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => handleConnectionResponse(request.id, false)}
                    style={styles.actionButton}
                  >
                    Decline
                  </Button>
                </View>
              </Surface>
              {index < connectionRequests.length - 1 && (
                <Divider style={[styles.divider, { backgroundColor: colors.BORDER }]} />
              )}
            </MotiView>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Title style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY }]}>
          Messages
        </Title>
        <Text style={[styles.emptyText, { color: colors.TEXT.SECONDARY }]}>
          No messages yet
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  requestCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  requestInfo: {
    marginLeft: 12,
    flex: 1,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    minWidth: 100,
  },
  divider: {
    marginVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
  },
}); 