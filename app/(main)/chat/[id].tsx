import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Text, Avatar, TextInput, IconButton, Surface, ActivityIndicator } from 'react-native-paper';
import { useTheme } from '../../../src/contexts/theme';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { MotiView } from 'moti';
import { formatDistanceToNow } from 'date-fns';
import { ENV } from '../../../src/config/env';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

type ChatListItem = {
  connection_id: string;
  other_user_id: string;
  other_user_name: string | null;
  other_user_username: string | null;
  other_user_profile_pic: string | null;
  is_wall_e?: boolean;
};

const WALL_E_ID = '00000000-0000-0000-0000-000000000000';
const MODEL = 'anthropic/claude-2';
const WALL_E_AVATAR = 'https://raw.githubusercontent.com/yourusername/saner/main/assets/wall-e.png';
// You can use this cute robot avatar from RoboHash
const WALL_E_AVATAR_FALLBACK = 'https://robohash.org/wall-e?set=set2&size=200x200';

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

  const isWallE = id === WALL_E_ID;

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

      if (isWallE) {
        // Get Wall-E chat history
        const { data: wallEData, error: wallEError } = await supabase
          .from('wall_e_chats')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (wallEError) throw wallEError;
        
        const formattedMessages = wallEData?.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender_id: msg.role === 'user' ? user.id : WALL_E_ID,
          receiver_id: msg.role === 'user' ? WALL_E_ID : user.id,
          created_at: msg.created_at,
          read_at: msg.read_at,
        })) || [];

        setMessages(formattedMessages);
        setOtherUser({
          id: WALL_E_ID,
          name: 'Wall-E',
          username: 'wall-e',
          profile_pic_url: null,
        });
      } else {
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
    if (!newMessage.trim() || !currentUserId || !otherUser) return;

    const tempMessage = {
      id: `temp-${Date.now()}`,
      content: newMessage.trim(),
      sender_id: currentUserId,
      receiver_id: otherUser.id,
      created_at: new Date().toISOString(),
      read_at: null,
    };

    addMessageToList(tempMessage);
    setNewMessage('');

    try {
      if (isWallE) {
        // Wall-E chat logic
        const userMessage = {
          user_id: currentUserId,
          role: 'user' as const,
          content: tempMessage.content,
          created_at: tempMessage.created_at,
        };

        const { error: saveError } = await supabase
          .from('wall_e_chats')
          .insert(userMessage);

        if (saveError) throw saveError;

        // Get AI response
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ENV.OPENROUTER_API_KEY}`,
            'HTTP-Referer': ENV.OPENROUTER_REFERER,
            'X-Title': 'Saner Mental Health Support',
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              {
                role: 'system',
                content: `You are Wall-E, a compassionate and understanding mental health support chatbot. Your purpose is to:

1. Provide emotional support and a safe space for users to express their feelings
2. Offer evidence-based coping strategies and mindfulness techniques
3. Encourage healthy habits and self-care practices
4. Help users identify patterns in their thoughts and emotions
5. Maintain appropriate boundaries and regularly remind users that you're not a substitute for professional mental health care

Guidelines:
- Keep responses concise (2-3 paragraphs max) but warm and engaging
- Use empathetic and non-judgmental language
- Validate user feelings while gently encouraging positive actions
- If you detect signs of crisis or severe distress, provide these emergency resources:
  * National Crisis Hotline (US): 988
  * Crisis Text Line: Text HOME to 741741
  * Encourage seeking immediate professional help

Remember: Always prioritize user safety and well-being. If someone expresses thoughts of self-harm or suicide, treat it as an emergency and provide crisis resources immediately.`
              },
              ...(messages || []).map(m => ({
                role: m.sender_id === currentUserId ? 'user' : 'assistant',
                content: m.content,
              })),
              { role: 'user', content: tempMessage.content },
            ],
            temperature: 0.7,
            max_tokens: 500,
            top_p: 0.9,
            frequency_penalty: 0.5,
          }),
        });

        const data = await response.json();
        
        const assistantMessage = {
          user_id: currentUserId,
          role: 'assistant' as const,
          content: data.choices[0].message.content.trim(),
          created_at: new Date().toISOString(),
        };

        const { error: assistantError } = await supabase
          .from('wall_e_chats')
          .insert(assistantMessage);

        if (assistantError) throw assistantError;

        // Add assistant message to UI
        addMessageToList({
          id: Date.now().toString(),
          content: assistantMessage.content,
          sender_id: WALL_E_ID,
          receiver_id: currentUserId,
          created_at: assistantMessage.created_at,
          read_at: null,
        });
      } else {
        // Regular chat logic
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
      }
    } catch (error) {
      logChat('Error sending message', error);
      console.error('Error sending message:', error);
      // Remove the temporary message on error
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
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
                  onPress={() => !isWallE && router.push(`/(main)/profile/${otherUser.id}`)}
                >
                  {isWallE ? (
                    <Avatar.Image
                      size={40}
                      source={{ uri: WALL_E_AVATAR_FALLBACK }}
                      style={{ backgroundColor: colors.TAB_BAR.ACTIVE }}
                    />
                  ) : (
                    <Avatar.Image
                      size={40}
                      source={{ uri: otherUser.profile_pic_url || 'https://i.pravatar.cc/300' }}
                    />
                  )}
                  <View style={styles.userTextInfo}>
                    <Text variant="titleMedium" style={{ color: colors.TEXT.PRIMARY }}>
                      {otherUser.name || 'Anonymous'}
                    </Text>
                    <Text variant="bodySmall" style={{ color: colors.TEXT.SECONDARY }}>
                      {isWallE ? 'Mental Health Support' : `@${otherUser.username || 'username'}`}
                    </Text>
                  </View>
                </Pressable>
                {!isWallE && (
                  <IconButton
                    icon="dots-vertical"
                    size={24}
                    iconColor={colors.TEXT.PRIMARY}
                    onPress={() => {/* Add menu options */}}
                  />
                )}
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