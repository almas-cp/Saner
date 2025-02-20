import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Text, Avatar, TextInput, IconButton, Surface, ActivityIndicator } from 'react-native-paper';
import { useTheme } from '../../../src/contexts/theme';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { MotiView } from 'moti';
import { formatDistanceToNow } from 'date-fns';

type Message = {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  read_at: string | null;
};

type Profile = {
  id: string;
  name: string | null;
  username: string | null;
  profile_pic_url: string | null;
};

// Debug logging utility
const logChat = (action: string, details?: any) => {
  if (__DEV__) {
    console.log(`[Chat ${action}]`, details ? details : '');
  }
};

export default function ChatConversation() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const addMessageToList = (message: Message) => {
    setMessages(prev => [...prev, message]);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const fetchMessages = async () => {
    try {
      logChat('Fetching messages');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logChat('No authenticated user found');
        return;
      }
      setCurrentUserId(user.id);
      logChat('Current user', { userId: user.id });

      // Get other user's profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) {
        logChat('Profile fetch error', profileError);
        throw profileError;
      }
      logChat('Other user profile fetched', { userId: id, name: profileData.name });
      setOtherUser(profileData);

      // Get messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (messagesError) {
        logChat('Messages fetch error', messagesError);
        throw messagesError;
      }
      logChat('Messages fetched', { count: messagesData?.length || 0 });
      setMessages(messagesData || []);

      // Mark unread messages as read
      const unreadMessages = messagesData?.filter(m => 
        m.receiver_id === user.id && m.read_at === null
      ) || [];
      
      if (unreadMessages.length > 0) {
        logChat('Marking messages as read', { count: unreadMessages.length });
        const { error: updateError } = await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('receiver_id', user.id)
          .eq('sender_id', id)
          .is('read_at', null);

        if (updateError) {
          logChat('Error marking messages as read', updateError);
          throw updateError;
        }
        logChat('Messages marked as read successfully');
      }
    } catch (error) {
      logChat('Error in fetchMessages', error);
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // Separate effect for subscription to ensure we have currentUserId
  useEffect(() => {
    if (!currentUserId || !id) return;

    // Subscribe to new messages with a unique channel name
    const channelName = `chat_messages_${currentUserId}_${id}`;
    logChat('Setting up real-time subscription', { channelName });

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${currentUserId},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${currentUserId}))`,
        },
        (payload: { eventType: string; new: any }) => {
          logChat('Real-time update received', { 
            eventType: payload.eventType,
            messageId: payload.new?.id,
            senderId: payload.new?.sender_id,
            receiverId: payload.new?.receiver_id
          });
          
          const newMessage = payload.new as Message;
          
          // Check if message already exists (to avoid duplicates)
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id || m.id === `temp-${newMessage.id}`)) {
              return prev;
            }
            return [...prev, newMessage];
          });

          // Auto scroll for new messages
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);

          // Mark message as read if we're the receiver
          if (newMessage.receiver_id === currentUserId) {
            supabase
              .from('messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMessage.id)
              .then(({ error }) => {
                if (error) {
                  logChat('Error marking message as read', error);
                } else {
                  logChat('Message marked as read', { messageId: newMessage.id });
                }
              });
          }
        }
      )
      .subscribe((status) => {
        logChat('Subscription status', { status, channelName });
      });

    return () => {
      logChat('Cleaning up subscription', { channelName });
      supabase.removeChannel(channel);
    };
  }, [id, currentUserId]);

  useEffect(() => {
    if (otherUser) {
      router.setParams({
        headerShown: "0"
      });
    }
  }, [otherUser]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !otherUser) {
      logChat('Send message validation failed', { 
        hasContent: !!newMessage.trim(),
        hasCurrentUser: !!currentUserId,
        hasOtherUser: !!otherUser
      });
      return;
    }

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content: newMessage.trim(),
      sender_id: currentUserId,
      receiver_id: otherUser.id,
      created_at: new Date().toISOString(),
      read_at: null
    };

    // Optimistically add message to UI
    addMessageToList(tempMessage);
    setNewMessage('');

    try {
      logChat('Sending message', { 
        to: otherUser.id,
        contentLength: tempMessage.content.length 
      });

      const { data, error } = await supabase
        .from('messages')
        .insert({
          content: tempMessage.content,
          sender_id: currentUserId,
          receiver_id: otherUser.id,
        })
        .select()
        .single();

      if (error) {
        logChat('Error sending message', error);
        // Remove the temporary message on error
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        throw error;
      }

      const messageData = data as Message;
      logChat('Message sent successfully', { messageId: messageData.id });
      
      // Replace temp message with real one
      setMessages(prev => prev.map(m => 
        m.id === tempMessage.id ? messageData : m
      ));
    } catch (error) {
      logChat('Error in sendMessage', error);
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.BACKGROUND, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.TAB_BAR.ACTIVE} />
      </View>
    );
  }

  if (!otherUser) {
    return (
      <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
        <Text>User not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.BACKGROUND }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          header: () => (
            <Surface style={[styles.header, { backgroundColor: colors.SURFACE }]}>
              <View style={styles.headerContent}>
                <IconButton
                  icon="arrow-left"
                  size={24}
                  iconColor={colors.TEXT.PRIMARY}
                  onPress={() => router.back()}
                />
                <Pressable 
                  style={styles.userInfo}
                  onPress={() => router.push(`/(main)/profile/${otherUser.id}`)}
                >
                  <Avatar.Image
                    size={40}
                    source={{ uri: otherUser.profile_pic_url || 'https://i.pravatar.cc/300' }}
                  />
                  <View style={styles.userTextInfo}>
                    <Text variant="titleMedium" style={{ color: colors.TEXT.PRIMARY }}>
                      {otherUser.name || 'Anonymous'}
                    </Text>
                    <Text variant="bodySmall" style={{ color: colors.TEXT.SECONDARY }}>
                      @{otherUser.username || 'username'}
                    </Text>
                  </View>
                </Pressable>
                <IconButton
                  icon="dots-vertical"
                  size={24}
                  iconColor={colors.TEXT.PRIMARY}
                  onPress={() => {/* Add menu options */}}
                />
              </View>
            </Surface>
          ),
        }}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message, index) => (
          <MotiView
            key={message.id}
            style={[
              styles.messageWrapper,
              message.sender_id === currentUserId ? styles.sentMessage : styles.receivedMessage,
            ]}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: index * 50 }}
          >
            <Surface
              style={[
                styles.messageBubble,
                message.sender_id === currentUserId ? styles.sentBubble : styles.receivedBubble,
                {
                  backgroundColor: message.sender_id === currentUserId 
                    ? colors.TAB_BAR.ACTIVE 
                    : colors.SURFACE,
                },
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  { 
                    color: message.sender_id === currentUserId 
                      ? '#fff'
                      : colors.TEXT.PRIMARY,
                  },
                ]}
              >
                {message.content}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  { 
                    color: message.sender_id === currentUserId 
                      ? 'rgba(255, 255, 255, 0.7)'
                      : colors.TEXT.SECONDARY,
                  },
                ]}
              >
                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
              </Text>
            </Surface>
          </MotiView>
        ))}
      </ScrollView>

      <Surface style={[styles.inputContainer, { backgroundColor: colors.SURFACE }]}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          mode="flat"
          multiline
          style={[styles.input, { backgroundColor: colors.SURFACE }]}
          right={
            <TextInput.Icon
              icon="send"
              onPress={sendMessage}
              disabled={!newMessage.trim()}
              style={styles.sendButton}
            />
          }
        />
      </Surface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  userTextInfo: {
    marginLeft: 12,
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 32,
  },
  messageWrapper: {
    marginBottom: 8,
    maxWidth: '80%',
  },
  sentMessage: {
    alignSelf: 'flex-end',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    elevation: 1,
  },
  sentBubble: {
    borderTopRightRadius: 4,
  },
  receivedBubble: {
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  inputContainer: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  input: {
    fontSize: 16,
    maxHeight: 120,
  },
  sendButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
}); 