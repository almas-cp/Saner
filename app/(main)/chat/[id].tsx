import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Text, Avatar, TextInput, IconButton, Surface, ActivityIndicator } from 'react-native-paper';
import { useTheme } from '../../../src/contexts/theme';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { MotiView } from 'moti';
import { formatDistanceToNow } from 'date-fns';
import { 
  sendConsultationMessage, 
  isConsultationChat,
  fetchConsultationMessages,
  getSenderType 
} from '../../../src/utils/consultationUtils';

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

/**
 * Gets the other user's ID from a consultation chat
 * In consultation chats, the id parameter is the consultation ID, not the other user's ID
 */
const getOtherUserIdFromConsultation = async (consultationId: string, currentUserId: string): Promise<string | null> => {
  try {
    // Get the chat details using the consultation_id
    const { data: chatData, error } = await supabase
      .from('chats')
      .select('client_id, professional_id')
      .eq('consultation_id', consultationId)
      .maybeSingle();
      
    if (error || !chatData) {
      logChat('Error getting chat participants', error);
      return null;
    }
    
    // Determine who the other user is
    if (chatData.client_id === currentUserId) {
      return chatData.professional_id;
    } else if (chatData.professional_id === currentUserId) {
      return chatData.client_id;
    }
    
    return null;
  } catch (error) {
    logChat('Error in getOtherUserIdFromConsultation', error);
    return null;
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

      // Check if this is a consultation chat
      const isConsultation = await isConsultationChat(id as string);
      
      if (isConsultation) {
        logChat('This is a consultation chat');
        
        // For consultation chats, we need to get the actual other user ID
        const otherUserId = await getOtherUserIdFromConsultation(id as string, user.id);
        
        if (!otherUserId) {
          logChat('Could not determine the other user in this consultation');
          setLoading(false);
          return;
        }
        
        // Now get the other user's profile using the correct ID
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUserId)
          .maybeSingle();

        if (profileError) {
          logChat('Profile fetch error', profileError);
          console.error('Error fetching profile:', profileError);
        }

        // Create a fallback profile if none exists
        const safeProfileData = profileData || {
          id: otherUserId,
          name: 'User',
          username: null,
          profile_pic_url: null
        };
        
        logChat('Other user profile', { 
          userId: otherUserId, 
          name: safeProfileData.name,
          exists: !!profileData 
        });
        
        setOtherUser(safeProfileData);
        
        // Get consultation chat messages
        const { messages, error: messagesError } = await fetchConsultationMessages(id as string);
        
        if (messagesError) {
          logChat('Error fetching consultation messages', messagesError);
        } else {
          logChat('Messages fetched', { count: messages.length });
          
          // Transform to the format needed by UI
          const formattedMessages = messages.map(msg => ({
            id: msg.id,
            content: msg.message,
            sender_id: msg.sender_id,
            receiver_id: 'consultation', // Doesn't matter for consultation chats
            created_at: msg.created_at,
            read_at: msg.read ? new Date().toISOString() : null
          }));
          
          setMessages(formattedMessages);
        }
        
        // Rest of your existing consultation code...
      } else {
        // Standard chat code
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (profileError) {
          logChat('Profile fetch error', profileError);
          console.error('Error fetching profile:', profileError);
        }

        // Create a fallback profile if none exists
        const safeProfileData = profileData || {
          id: id as string,
          name: 'User',
          username: null,
          profile_pic_url: null
        };
        
        logChat('Other user profile', { 
          userId: id, 
          name: safeProfileData.name,
          exists: !!profileData 
        });
        
        setOtherUser(safeProfileData);

        // Get regular messages
        // Rest of your regular chat code...
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

  // Modify the useEffect for real-time subscription to handle consultation chats
  useEffect(() => {
    if (!currentUserId || !id) return;

    const setupSubscription = async () => {
      // Check if this is a consultation chat
      const isConsultation = await isConsultationChat(id as string);
      
      // Create a unique channel name
      const channelName = `chat_messages_${currentUserId}_${id}`;
      logChat('Setting up real-time subscription', { channelName, isConsultation });

      let channel;
      
      if (isConsultation) {
        // For consultation chats, subscribe to chat_messages table using the CHAT ID
        // First we need to get the actual chat ID
        const { data: chatData } = await supabase
          .from('chats')
          .select('id')
          .eq('consultation_id', id as string)
          .maybeSingle();
          
        if (!chatData) {
          logChat('Error: Could not find chat ID for consultation', { consultation_id: id });
          return () => {};
        }
        
        const chatId = chatData.id;
        logChat('Found chat ID for consultation', { 
          consultation_id: id, 
          chat_id: chatId 
        });
        
        // Now subscribe to insert events on the chat_messages table for this chat
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `chat_id=eq.${chatId}`,
            },
            (payload: { eventType: string; new: any }) => {
              logChat('Consultation chat update received', { 
                eventType: payload.eventType,
                messageId: payload.new?.id,
                senderId: payload.new?.sender_id,
                message: payload.new?.message?.substring(0, 20) + '...'
              });
              
              // Format the message for our UI
              const newMessage = {
                id: payload.new.id,
                content: payload.new.message,
                sender_id: payload.new.sender_id,
                receiver_id: 'consultation', // Placeholder
                created_at: payload.new.created_at,
                read_at: payload.new.read ? new Date().toISOString() : null
              };
              
              // Add to messages if not already there
              setMessages(prev => {
                if (prev.some(m => m.id === newMessage.id)) {
                  return prev;
                }
                
                // Add the new message and sort by created_at
                const updatedMessages = [...prev, newMessage].sort((a, b) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
                
                // Auto scroll after adding new message
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
                
                return updatedMessages;
              });
            }
          )
          .subscribe((status) => {
            logChat('Consultation subscription status', { status, channelName });
          });
      } else {
        // Regular chat subscription (existing code)
        channel = supabase
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
              logChat('Regular chat update received', { 
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
            logChat('Regular subscription status', { status, channelName });
          });
      }

      return () => {
        logChat('Cleaning up subscription', { channelName });
        if (channel) supabase.removeChannel(channel);
      };
    };

    // Set up the subscription
    const cleanup = setupSubscription();
    
    // Clean up when component unmounts
    return () => {
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
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
    try {
      logChat('Sending message', { 
        to: otherUser.id,
        contentLength: newMessage.trim().length 
      });

      if (!newMessage.trim() || !currentUserId) {
        logChat('Cannot send message', { 
          hasContent: !!newMessage.trim(),
          hasCurrentUser: !!currentUserId,
          hasOtherUser: !!otherUser
        });
        return;
      }

      // Check if this is a consultation chat
      const isConsultation = await isConsultationChat(id as string);
      
      if (isConsultation) {
        logChat('Sending consultation message');
        
        // This is a consultation chat, use the special function
        const result = await sendConsultationMessage(
          currentUserId,
          id as string,
          newMessage.trim()
        );
        
        if (!result.success) {
          logChat('Error sending consultation message', result.error);
          console.error('Error sending consultation message:', result.error);
          return;
        }
        
        logChat('Consultation message sent successfully', { messageId: result.messageId });
        setNewMessage('');
        return;
      }
      
      // If not a consultation chat, proceed with regular messaging
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
        // Regular message sending logic
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
    } catch (error) {
      logChat('Unexpected error in sendMessage', error);
      console.error('Unexpected error sending message:', error);
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