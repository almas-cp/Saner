import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { Title, Text, List, Avatar, Button, ActivityIndicator, Surface, Divider, Badge, IconButton } from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { formatDistanceToNow } from 'date-fns';

// Define types
type ConsultationStatus = 'pending' | 'active' | 'completed' | 'cancelled';

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
          is_doctor: boolean;
        };
      };
      consultations: {
        Row: {
          id: string;
          client_id: string;
          professional_id: string;
          status: ConsultationStatus;
          fee_paid: number;
          created_at: string;
        };
      };
      chats: {
        Row: {
          id: string;
          consultation_id: string;
          client_id: string;
          professional_id: string;
          client_name: string;
          professional_name: string;
          last_message: string;
          last_message_time: string;
          unread_client: number;
          unread_professional: number;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};

type ConnectionRequest = Database['public']['Tables']['connections']['Row'] & {
  requester: Database['public']['Tables']['profiles']['Row'];
};

type ConsultationChatItem = {
  id: string;
  consultation_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_profile_pic?: string | null;
  is_professional: boolean;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
};

type RegularChatItem = {
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
  const [regularChats, setRegularChats] = useState<RegularChatItem[]>([]);
  const [consultationChats, setConsultationChats] = useState<ConsultationChatItem[]>([]);
  const [unreadWallECount, setUnreadWallECount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConsultationsLoading, setIsConsultationsLoading] = useState(false);
  const [isDoctor, setIsDoctor] = useState(false);
  const [message, setMessage] = useState('');
  const [loadingWallE, setLoadingWallE] = useState(false);
  const [wallEUnreadCount, setWallEUnreadCount] = useState(0);
  const [isWallEChatOpen, setIsWallEChatOpen] = useState(false);
  const [showConnectionRequests, setShowConnectionRequests] = useState(false);

  const fetchWallEUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from('wall_e_chats')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('role', 'assistant')
        .is('read_at', null);

      if (error) throw error;
      setUnreadWallECount(count || 0);
    } catch (error) {
      console.error('Error fetching Wall-E unread count:', error);
    }
  };

  const fetchConnectionRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await Promise.all([
        fetchWallEUnreadCount(),
        (async () => {
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
        })()
      ]);
    } catch (error) {
      console.error('Error fetching connection requests:', error);
    }
  };

  const fetchConsultationChats = async () => {
    try {
      setIsConsultationsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      console.log('Fetching active consultation chats for user:', user.id);
      
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          consultation_id,
          client_id,
          professional_id,
          client_name,
          professional_name,
          last_message,
          last_message_time,
          unread_client,
          unread_professional,
          created_at,
          updated_at,
          is_active
        `)
        .or(`client_id.eq.${user.id},professional_id.eq.${user.id}`)
        .not('consultation_id', 'is', null)
        .eq('is_active', true) // Only fetch active chats
        .order('last_message_time', { ascending: false });
        
      if (error) {
        console.error('Error fetching consultation chats:', error);
        return;
      }
      
      console.log(`Found ${data?.length || 0} active consultation chats`);
      
      const activeChatItems: ConsultationChatItem[] = [];

      data?.forEach(chat => {
        const isClient = chat.client_id === user.id;
        const otherUserId = isClient ? chat.professional_id : chat.client_id;
        const otherUserName = isClient ? chat.professional_name : chat.client_name;
        const unreadCount = isClient ? chat.unread_client : chat.unread_professional;

        const chatItem: ConsultationChatItem = {
          id: chat.id,
          consultation_id: chat.consultation_id,
          other_user_id: otherUserId,
          other_user_name: otherUserName || 'User',
          is_professional: !isClient,
          last_message: chat.last_message || 'No messages yet',
          last_message_time: chat.last_message_time || chat.updated_at,
          unread_count: unreadCount || 0
        };

        activeChatItems.push(chatItem);
      });
      
      setConsultationChats(activeChatItems);
    } catch (error) {
      console.error('Error in fetchConsultationChats:', error);
    } finally {
      setIsConsultationsLoading(false);
    }
  };

  const fetchRegularChats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch regular chats with a direct query instead of RPC
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          read_at,
          profiles:sender_id(name, username, profile_pic_url),
          receiver:receiver_id(name, username, profile_pic_url)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching regular chats:', error);
        return;
      }

      // Process messages to get unique chats
      const chatMap = new Map<string, RegularChatItem>();
      
      if (data) {
        // Use any type to safely handle the nested structure
        (data as any[]).forEach(message => {
          const isFromCurrentUser = message.sender_id === user.id;
          const otherUserId = isFromCurrentUser ? message.receiver_id : message.sender_id;
          
          if (!chatMap.has(otherUserId)) {
            // Default values
            let otherUserName = 'User';
            let otherUserUsername = null;
            let otherUserProfilePic = null;
            
            try {
              // Safely access nested properties
              if (isFromCurrentUser && message.receiver) {
                otherUserName = message.receiver.name || 'User';
                otherUserUsername = message.receiver.username;
                otherUserProfilePic = message.receiver.profile_pic_url;
              } else if (!isFromCurrentUser && message.profiles) {
                otherUserName = message.profiles.name || 'User';
                otherUserUsername = message.profiles.username;
                otherUserProfilePic = message.profiles.profile_pic_url;
              }
            } catch (e) {
              console.error('Error parsing profile data:', e);
            }
            
            chatMap.set(otherUserId, {
              connection_id: otherUserId, // Using the user ID as a connection ID
              other_user_id: otherUserId,
              other_user_name: otherUserName,
              other_user_username: otherUserUsername,
              other_user_profile_pic: otherUserProfilePic,
              last_message: message.content,
              last_message_time: message.created_at,
              unread_count: (!isFromCurrentUser && !message.read_at) ? 1 : 0
            });
          }
        });
      }
      
      // Convert Map to array
      const formattedChats = Array.from(chatMap.values());
      setRegularChats(formattedChats);
      
      console.log(`Found ${formattedChats.length} regular chats`);
    } catch (error) {
      console.error('Error in fetchRegularChats:', error);
    }
  };

  const fetchAllChatData = async () => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user logged in');
        setLoading(false);
        return;
      }

      await Promise.all([
        fetchConnectionRequests(),
        fetchConsultationChats(),
        fetchRegularChats(),
        checkUserRole()
      ]);
      
    } catch (error) {
      console.error('Error fetching chat data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllChatData();
    fetchWallEUnreadCount();

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
          fetchAllChatData();
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
          fetchAllChatData();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllChatData().finally(() => setRefreshing(false));
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

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_doctor')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error checking user role:', error);
        return;
      }
      
      setIsDoctor(profile?.is_doctor || false);
    } catch (error) {
      console.error('Error in checkUserRole:', error);
    }
  };

  const openConsultationChat = (chat: ConsultationChatItem) => {
    console.log('Opening consultation chat', chat.consultation_id);
    router.push(`/(main)/chat/${chat.consultation_id}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.BACKGROUND, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.TAB_BAR.ACTIVE} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.BACKGROUND }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        style={[styles.scrollContainer, { backgroundColor: colors.BACKGROUND }]}
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
        >
          <Surface style={[styles.wallECard, { backgroundColor: colors.SURFACE }]}>
            <List.Item
              title="Wall-E"
              description="Your Mental Health Support Companion"
              left={() => (
                <Avatar.Icon
                  size={48}
                  icon="robot"
                  style={{ backgroundColor: colors.TAB_BAR.ACTIVE }}
                />
              )}
              right={() => unreadWallECount > 0 && (
                <View style={styles.badgeContainer}>
                  <Badge size={24} style={{ backgroundColor: colors.TAB_BAR.ACTIVE }}>
                    {unreadWallECount}
                  </Badge>
                </View>
              )}
              onPress={() => router.push('/(main)/wall-e')}
              titleStyle={{ color: colors.TEXT.PRIMARY }}
              descriptionStyle={{ color: colors.TEXT.SECONDARY }}
            />
          </Surface>
        </MotiView>
        
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 500, delay: 100 }}
        >
          {isDoctor ? (
            <Surface style={[styles.medicalConsultCard, { 
              backgroundColor: colors.SURFACE,
              borderLeftColor: '#8E44AD'
            }]}>
              <List.Item
                title="Attend Clients"
                description="View and respond to consultation requests from users"
                left={() => (
                  <Avatar.Icon
                    size={48}
                    icon="account-multiple"
                    style={{ backgroundColor: '#8E44AD' }}
                  />
                )}
                right={() => (
                  <View style={styles.consultButtonContainer}>
                    <Button
                      mode="contained"
                      compact
                      style={{ backgroundColor: '#8E44AD' }}
                      labelStyle={{ color: 'white', fontSize: 12 }}
                      onPress={() => {
                        router.push({
                          pathname: '/(main)/professionals',
                          params: { mode: 'professional' }
                        });
                      }}
                    >
                      View Clients
                    </Button>
                  </View>
                )}
                titleStyle={{ color: colors.TEXT.PRIMARY }}
                descriptionStyle={{ color: colors.TEXT.SECONDARY }}
              />
            </Surface>
          ) : (
            <Surface style={[styles.medicalConsultCard, { 
              backgroundColor: colors.SURFACE,
              borderLeftColor: '#4CAF50'
            }]}>
              <List.Item
                title="Consult Medical Professional"
                description="Get expert advice from licensed healthcare providers"
                left={() => (
                  <Avatar.Icon
                    size={48}
                    icon="doctor"
                    style={{ backgroundColor: '#4CAF50' }}
                  />
                )}
                right={() => (
                  <View style={styles.consultButtonContainer}>
                    <Button
                      mode="contained"
                      compact
                      style={{ backgroundColor: '#4CAF50' }}
                      labelStyle={{ color: 'white', fontSize: 12 }}
                      onPress={() => {
                        router.push('/(main)/professionals');
                      }}
                    >
                      Connect
                    </Button>
                  </View>
                )}
                titleStyle={{ color: colors.TEXT.PRIMARY }}
                descriptionStyle={{ color: colors.TEXT.SECONDARY }}
              />
            </Surface>
          )}
        </MotiView>

        {connectionRequests.length > 0 && (
          <View style={styles.section}>
            <Title style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY }]}>
              Connection Requests
            </Title>
            {connectionRequests.map((request, index) => (
              <MotiView
                key={`request-${request.id}`}
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

        <View style={styles.sectionContainer}>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY }]}>
            Medical Consultations
          </Text>
          
          {isConsultationsLoading ? (
            <ActivityIndicator size="small" color={colors.TAB_BAR.ACTIVE} style={styles.loadingIndicator} />
          ) : consultationChats.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.TEXT.SECONDARY }]}>
              No medical consultations yet
            </Text>
          ) : (
            <>
              {consultationChats.map((chat) => (
                <MotiView
                  key={`active-${chat.id}`}
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 500, delay: 100 }}
                >
                  <Surface style={[
                    styles.consultationCard, 
                    { 
                      backgroundColor: colors.SURFACE,
                      borderLeftWidth: 4,
                      borderLeftColor: '#4CAF50'
                    }
                  ]}>
                    <List.Item
                      title={chat.other_user_name}
                      description={
                        <View>
                          <Text 
                            style={{ 
                              color: colors.TEXT.SECONDARY,
                              marginBottom: 2 
                            }}
                            numberOfLines={1}
                          >
                            {chat.last_message}
                          </Text>
                          <Text
                            style={{
                              fontSize: 10,
                              color: '#4CAF50',
                              fontWeight: '500'
                            }}
                          >
                            Medical Consultation
                          </Text>
                        </View>
                      }
                      left={() => (
                        <View style={{ position: 'relative' }}>
                          <Avatar.Image
                            size={48}
                            source={{ uri: chat.other_user_profile_pic || 'https://i.pravatar.cc/300' }}
                          />
                          <View 
                            style={{ 
                              position: 'absolute',
                              bottom: -2,
                              right: -2,
                              backgroundColor: '#4CAF50',
                              borderRadius: 10,
                              width: 20,
                              height: 20,
                              justifyContent: 'center',
                              alignItems: 'center',
                              borderWidth: 2,
                              borderColor: colors.SURFACE
                            }}
                          >
                            <IconButton
                              icon="doctor"
                              size={10}
                              iconColor="#FFF"
                              style={{ margin: 0 }}
                            />
                          </View>
                        </View>
                      )}
                      right={() => chat.unread_count > 0 && (
                        <View style={styles.badgeContainer}>
                          <Badge size={24} style={{ backgroundColor: '#4CAF50' }}>
                            {chat.unread_count}
                          </Badge>
                        </View>
                      )}
                      onPress={() => openConsultationChat(chat)}
                      titleStyle={{ color: colors.TEXT.PRIMARY }}
                      descriptionNumberOfLines={2}
                    />
                  </Surface>
                </MotiView>
              ))}
            </>
          )}
        </View>

        <Title style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY, marginTop: 16 }]}>
          Conversations
        </Title>

        {regularChats.length === 0 ? (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 500, delay: 300 }}
            style={styles.emptyState}
          >
            <Text style={{ color: colors.TEXT.SECONDARY, textAlign: 'center' }}>
              No conversations yet. Start chatting with Wall-E or connect with friends!
            </Text>
          </MotiView>
        ) : (
          regularChats.map((chat, index) => (
            <MotiView
              key={`connection-${chat.connection_id}`}
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
              {index < regularChats.length - 1 && (
                <Divider style={[styles.divider, { backgroundColor: colors.BORDER }]} />
              )}
            </MotiView>
          ))
        )}
        
        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={[styles.messageInputContainer, { 
        backgroundColor: colors.SURFACE,
        borderTopColor: colors.BORDER
      }]}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Search or start a new chat..."
          placeholderTextColor={colors.TEXT.SECONDARY}
          style={[styles.messageInput, { 
            backgroundColor: colors.BACKGROUND,
            color: colors.TEXT.PRIMARY
          }]}
        />
        <IconButton
          icon="magnify"
          size={24}
          iconColor={colors.TAB_BAR.ACTIVE}
          style={styles.sendButton}
          onPress={() => router.push('/(main)/search')}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
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
  emptyState: {
    marginTop: 32,
    marginHorizontal: 32,
    alignItems: 'center',
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
  wallECard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  medicalConsultCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  consultButtonContainer: {
    justifyContent: 'center',
    marginRight: 8,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  messageInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 8,
  },
  consultationCard: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  sectionContainer: {
    padding: 16,
  },
  loadingIndicator: {
    marginVertical: 16
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 16
  }
}); 