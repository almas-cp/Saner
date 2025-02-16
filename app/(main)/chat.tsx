import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Title, Text, List, Avatar, Button, ActivityIndicator, Surface, Divider, Badge } from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { formatDistanceToNow } from 'date-fns';

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

type ChatListItem = {
  connection_id: string;
  other_user_id: string;
  other_user_name: string | null;
  other_user_username: string | null;
  other_user_profile_pic: string | null;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
};

export default function Chat() {
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);

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
      
      const typedData = (data as unknown as ConnectionRequest[]) || [];
      setConnectionRequests(typedData);
    } catch (error) {
      console.error('Error fetching connection requests:', error);
    }
  };

  const fetchChatList = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_chat_list', {
        user_id: user.id
      });

      if (error) throw error;
      setChatList(data || []);
    } catch (error) {
      console.error('Error fetching chat list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectionRequests();
    fetchChatList();

    // Subscribe to changes in connections and messages
    const channel = supabase
      .channel('chat_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
        },
        () => {
          fetchConnectionRequests();
          fetchChatList();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchChatList();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchConnectionRequests(),
      fetchChatList()
    ]).finally(() => setRefreshing(false));
  }, []);

  const handleConnectionResponse = async (connectionId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', connectionId);

      if (error) throw error;
      
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
        {chatList.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.TEXT.SECONDARY }]}>
            No messages yet. Connect with other users to start chatting!
          </Text>
        ) : (
          chatList.map((chat, index) => (
            <MotiView
              key={chat.connection_id}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500, delay: index * 100 }}
            >
              <Surface style={[styles.chatCard, { backgroundColor: colors.SURFACE }]}>
                <List.Item
                  title={chat.other_user_name || 'Anonymous'}
                  description={chat.last_message || 'No messages yet'}
                  left={() => (
                    <Avatar.Image
                      size={48}
                      source={{ uri: chat.other_user_profile_pic || 'https://i.pravatar.cc/300' }}
                    />
                  )}
                  right={() => chat.unread_count > 0 && (
                    <View style={styles.badgeContainer}>
                      <Badge size={24} style={{ backgroundColor: colors.TAB_BAR.ACTIVE }}>
                        {chat.unread_count}
                      </Badge>
                      {chat.last_message_time && (
                        <Text variant="bodySmall" style={[styles.timeText, { color: colors.TEXT.SECONDARY }]}>
                          {formatDistanceToNow(new Date(chat.last_message_time), { addSuffix: true })}
                        </Text>
                      )}
                    </View>
                  )}
                  onPress={() => router.push(`/(main)/chat/${chat.other_user_id}`)}
                  titleStyle={{ color: colors.TEXT.PRIMARY }}
                  descriptionStyle={{ color: colors.TEXT.SECONDARY }}
                  descriptionNumberOfLines={1}
                />
              </Surface>
              {index < chatList.length - 1 && (
                <Divider style={[styles.divider, { backgroundColor: colors.BORDER }]} />
              )}
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
  chatCard: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  badgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 8,
  },
  timeText: {
    fontSize: 12,
    marginTop: 4,
  },
}); 