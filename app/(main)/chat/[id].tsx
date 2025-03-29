import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable, Alert, RefreshControl } from 'react-native';
import { Text, Avatar, TextInput, IconButton, Surface, ActivityIndicator, Menu, Divider, Dialog, Portal, Button } from 'react-native-paper';
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
  getSenderType,
  endConsultationSession
} from '../../../src/utils/consultationUtils';
import { Appbar } from 'react-native-paper';
import { Badge } from 'react-native-paper';

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [isConsultationChatState, setIsConsultationChatState] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [isChatActive, setIsChatActive] = useState(true);
  const [isDoctor, setIsDoctor] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isConfirmDialogVisible, setIsConfirmDialogVisible] = useState(false);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'client' | 'doctor' | null>(null);
  const [otherUserName, setOtherUserName] = useState<string>('User');
  const scrollViewRef = useRef<ScrollView>(null);
  const [sessionEndingLoading, setSessionEndingLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  const [refreshing, setRefreshing] = useState(false);

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
      
      // Store current user ID for use in other functions
      setCurrentUserId(user.id);
      logChat('Current user', { userId: user.id });
      
      // Check if this is a consultation chat using the proper utility function
      const isConsultation = await isConsultationChat(id as string);
      logChat(isConsultation ? 'This is a consultation chat' : 'This is a regular chat');
      
      if (isConsultation) {
        // Get the chat status and details
        const { data, error } = await supabase
          .from('chats')
          .select(`
            id,
            consultation_id,
            is_active,
            client_id,
            professional_id,
            consultations:consultation_id(status)
          `)
          .eq('consultation_id', id)
          .single();
        
        if (error) {
          logChat('Error fetching chat', { error });
          return;
        }
        
        // Fix - Get the status from the nested object using a safer approach
        let consultationStatus = 'unknown';
        
        if (data?.consultations) {
          // Add debug log to see the actual structure
          console.log('Consultation data structure:', JSON.stringify(data.consultations));
          
          try {
            // Use type assertion with any to bypass TypeScript's checks
            const consultationsData = data.consultations as any;
            if (Array.isArray(consultationsData) && consultationsData.length > 0) {
              consultationStatus = consultationsData[0].status;
            } else if (typeof consultationsData === 'object') {
              consultationStatus = consultationsData.status;
            }
          } catch (err) {
            console.error('Error extracting consultation status:', err);
          }
        }
        
        logChat('Consultation status check', { consultationStatus });
        
        // Store the chat data for use in endConsultationSession
        setSelectedChat({
          id: data.id,
          is_consultation: true,
          consultation_id: data.consultation_id,
          is_active: data.is_active,
          client_id: data.client_id,
          professional_id: data.professional_id
        });
        
        // Check consultation status and active flag
        const isConsultationActive = 
          data?.is_active === true && 
          consultationStatus !== 'completed' && 
          consultationStatus !== 'ended';
        
        logChat('Chat status check', { 
          is_active: data?.is_active, 
          consultation_status: consultationStatus,
          isConsultationActive
        });
        
        setIsConsultationChatState(true);
        setIsChatActive(isConsultationActive);
        
        // Determine if current user is a doctor
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('is_doctor')
          .eq('id', user.id)
          .single();
        
        setIsDoctor(userProfile?.is_doctor || false);
        
        // For consultation chats, we need to get the actual other user ID
        // If the user is the client, the other user is the professional
        let otherUserId;
        if (data.client_id === user.id) {
          otherUserId = data.professional_id;
          setCurrentUserRole('client');
        } else {
          otherUserId = data.client_id;
          setCurrentUserRole('doctor');
        }
        
        if (!otherUserId) {
          logChat('Could not determine the other user in this consultation');
          setLoading(false);
          return;
        }
        
        // Store the other user ID for message rendering
        setOtherUserId(otherUserId);
        
        // Now get the other user's profile
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
        setOtherUserName(safeProfileData.name || 'User');
        
        // Get consultation chat messages
        const { messages: fetchedMessages, error: messagesError } = await fetchConsultationMessages(id);
        
        if (messagesError) {
          logChat('Error fetching consultation messages', messagesError);
        } else {
          logChat('Messages fetched', { count: fetchedMessages.length });
          
          // Fix: Map the database message format to the UI expected format
          const formattedMessages = fetchedMessages.map(msg => {
            // Debug log for message content
            logChat('Formatting message', {
              id: msg.id,
              message: msg.message,
              content: msg.content,
              finalContent: msg.message || msg.content
            });
            
            return {
              id: msg.id,
              content: msg.message || msg.content, // Handle both message and content fields
              sender_id: msg.sender_id,
              receiver_id: msg.sender_type === 'client' ? data.professional_id : data.client_id,
              created_at: msg.created_at,
              read_at: msg.read ? new Date(msg.created_at).toISOString() : null
            };
          });
          
          setMessages(formattedMessages);
        }
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
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });
          
        if (messagesError) {
          logChat('Error fetching regular messages', messagesError);
          console.error('Error fetching regular messages:', messagesError);
          return;
        }
        
        // Convert to proper Message format and ensure sorting
        const formattedMessages = messagesData?.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          receiver_id: msg.receiver_id,
          created_at: msg.created_at,
          read_at: msg.read_at
        })) || [];
        
        // Sort messages by timestamp
        formattedMessages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        logChat('Regular messages fetched', { 
          count: formattedMessages.length,
          firstMessage: formattedMessages.length > 0 ? formattedMessages[0].content : 'none'
        });
        
        setMessages(formattedMessages);
        
        // Mark unread messages as read if we're the recipient
        const unreadMessages = messagesData?.filter(
          msg => msg.receiver_id === user.id && !msg.read_at
        ) || [];
        
        if (unreadMessages.length > 0) {
          logChat('Marking messages as read', { count: unreadMessages.length });
          
          for (const msg of unreadMessages) {
            await supabase
              .from('messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', msg.id);
          }
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

  // Modify the useEffect for real-time subscription to handle consultation chats
  useEffect(() => {
    if (!currentUserId || !id) return;

    const setupSubscription = async () => {
      // Check if this is a consultation chat
      const isConsultation = await isConsultationChat(id as string);
      
      // Create a unique channel name
      const channelName = `chat_messages_${currentUserId}_${id}`;
      logChat('Setting up real-time subscription', { channelName, isConsultation });
      
      // First clean up any existing subscriptions to avoid duplicates
      supabase.removeAllChannels();

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
                message: payload.new?.message,
                content: payload.new?.content,
                finalContent: payload.new?.message || payload.new?.content
              });
              
              // Format the message for our UI
              const newMessage = {
                id: payload.new.id,
                content: payload.new.message || payload.new.content, // Handle both message and content fields
                sender_id: payload.new.sender_id,
                receiver_id: 'consultation', // Placeholder
                created_at: payload.new.created_at,
                read_at: payload.new.read ? new Date().toISOString() : null
              };
              
              // Add to messages if not already there (avoid duplicates with temp messages)
              setMessages(prev => {
                // Check if we have this message or a temp version of it
                if (prev.some(m => 
                  m.id === newMessage.id || 
                  (m.id.startsWith('temp-') && m.content === newMessage.content)
                )) {
                  // If we already have this message content in a temp message,
                  // replace the temp message with the real one
                  return prev.map(m => 
                    (m.id.startsWith('temp-') && m.content === newMessage.content) 
                      ? newMessage 
                      : m
                  );
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
                receiverId: payload.new?.receiver_id,
                content: payload.new?.content
              });
              
              const newMessage = payload.new as Message;
              
              // Check if message already exists (to avoid duplicates)
              setMessages(prev => {
                // Check if we have this message or a temp version of it
                if (prev.some(m => 
                  m.id === newMessage.id || 
                  (m.id.startsWith('temp-') && m.content === newMessage.content)
                )) {
                  // If we already have this message content in a temp message,
                  // replace the temp message with the real one
                  return prev.map(m => 
                    (m.id.startsWith('temp-') && m.content === newMessage.content) 
                      ? newMessage 
                      : m
                  );
                }
                
                // Add new message and ensure proper sorting
                const updatedMessages = [...prev, newMessage].sort((a, b) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
                
                // Auto scroll for new messages
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
                
                return updatedMessages;
              });

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
    if (!newMessage.trim()) return;
    
    try {
      // Clear input and focus
      const textToSend = newMessage;
      setNewMessage('');
      textInputRef.current?.focus();
      
      // Get the user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }
      
      // Create a temporary message for immediate display
      const tempId = `temp-${Date.now()}`;
      const tempMessage: Message = {
        id: tempId,
        content: textToSend,
        sender_id: user.id,
        receiver_id: otherUser?.id || '',
        created_at: new Date().toISOString(),
        read_at: null
      };
      
      // Add the temporary message to the UI immediately
      setMessages(prev => [...prev, tempMessage]);
      
      // Scroll to the new message
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      if (isConsultationChatState) {
        // CRITICAL FIX: Check BOTH is_active AND consultation status
        const { data, error } = await supabase
          .from('chats')
          .select(`
            is_active,
            consultations:consultation_id(status)
          `)
          .eq('consultation_id', id)
          .single();
        
        if (error) {
          console.error('Error checking chat status:', error);
          return;
        }
        
        // Extract status from first array item
        const consultationStatus = data?.consultations?.[0]?.status;
        
        // Check if consultation is ended
        const isSessionEnded = 
          data?.is_active === false || 
          consultationStatus === 'completed';
        
        if (isSessionEnded) {
          logChat('Cannot send message: consultation session is ended', {
            is_active: data?.is_active,
            consultation_status: consultationStatus
          });
          
          // Remove the temporary message since we can't send it
          setMessages(prev => prev.filter(m => m.id !== tempId));
          
          setIsChatActive(false); // Update UI state
          Alert.alert(
            'Session Ended',
            'This consultation session has ended and is now read-only.'
          );
          return;
        }
        
        // Send message in consultation
        logChat('Sending consultation message');
        const { success, messageId, error: sendError } = await sendConsultationMessage(
          id as string,
          user.id,
          textToSend
        );
        
        if (sendError || !success) {
          console.error('Error sending consultation message:', sendError);
          
          // Remove the temporary message since sending failed
          setMessages(prev => prev.filter(m => m.id !== tempId));
          
          Alert.alert('Error', 'Failed to send message');
        } else {
          logChat('Consultation message sent successfully', { messageId });
          
          // The real message will be added by the subscription
          // Remove the temporary message to prevent duplicates
          setTimeout(() => {
            setMessages(prev => prev.filter(m => m.id !== tempId));
          }, 1000); // Give the subscription time to receive the real message
        }
      } else {
        // Regular message sending logic
        try {
          const { data, error } = await supabase
            .from('messages')
            .insert({
              content: textToSend,
              sender_id: user.id,
              receiver_id: otherUser?.id,
            })
            .select()
            .single();

          if (error) {
            console.error('Error sending message:', error);
            
            // Remove the temporary message since sending failed
            setMessages(prev => prev.filter(m => m.id !== tempId));
            
            throw error;
          }

          console.log('Message sent successfully');
          
          // The real message will be added by the subscription
          // Remove the temporary message to prevent duplicates
          setTimeout(() => {
            setMessages(prev => prev.filter(m => m.id !== tempId));
          }, 1000); // Give the subscription time to receive the real message
        } catch (error) {
          console.error('Error in regular message sending:', error);
          Alert.alert('Error', 'Failed to send message');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  // Replace the handleEndSession function to not use the problematic endConsultationSession
  const handleEndSession = async () => {
    try {
      // Check if user is a doctor
      if (!isDoctor) {
        Alert.alert('Not Authorized', 'Only doctors can end consultation sessions');
        return;
      }
      
      // Check if there is a selected chat
      if (!selectedChat?.consultation_id) {
        console.error('No consultation ID found');
        return;
      }
      
      // Use our updated endConsultationSession function
      endConsultationSession();
    } catch (error) {
      console.error('Error in handleEndSession:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  // Replace the endConsultationSession function with this implementation
  const endConsultationSession = async () => {
    try {
      // First, check if this is a consultation chat
      if (!selectedChat?.is_consultation || !selectedChat?.consultation_id) {
        console.log('This is not a consultation chat or consultation_id is missing', selectedChat);
        Alert.alert('Error', 'Could not identify this as a consultation chat.');
        return;
      }

      console.log('Attempting to end consultation', {
        chatId: selectedChat.id,
        consultationId: selectedChat.consultation_id,
        isConsultation: selectedChat.is_consultation
      });

      // Confirm with the user
      Alert.alert(
        "End Consultation",
        "Are you sure you want to end this consultation? This will permanently delete all chat data.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "End and Delete",
            style: "destructive",
            onPress: async () => {
              setIsLoadingMessages(true);
              
              try {
                console.log('Calling delete_consultation with ID:', selectedChat.consultation_id);
                
                // Call the function to delete the consultation and related data
                const { data, error } = await supabase.rpc(
                  'delete_consultation',
                  { p_consultation_id: selectedChat.consultation_id }
                );
                
                console.log('Delete consultation response:', { data, error });
                
                if (error) {
                  console.error('Error deleting consultation:', error);
                  Alert.alert('Error', 'Failed to delete consultation. Please try again.');
                } else if (data && data.success) {
                  console.log('Consultation deleted successfully:', data);
                  Alert.alert('Success', 'Consultation has been ended and deleted.');
                  
                  // Navigate back to the chat list
                  router.push('/(main)/chat');
                } else {
                  console.error('Unknown response when deleting consultation:', data);
                  Alert.alert('Error', 'Received unexpected response. Please check if the consultation was deleted.');
                }
              } catch (err) {
                console.error('Exception when deleting consultation:', err);
                Alert.alert('Error', 'An unexpected error occurred while deleting the consultation.');
              } finally {
                setIsLoadingMessages(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in endConsultationSession:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, []);

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
                  onPress={() => router.push('/(main)/chat')}
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
                    {isConsultationChatState && (
                      <Text variant="labelSmall" style={{ color: colors.TAB_BAR.ACTIVE }}>
                        Medical Consultation
                      </Text>
                    )}
                  </View>
                </Pressable>

                {/* Add menu button for doctors in consultation chats */}
                {isConsultationChatState && isDoctor && (
                  <Menu
                    visible={isMenuVisible}
                    onDismiss={() => setIsMenuVisible(false)}
                    anchor={
                      <IconButton
                        icon="dots-vertical"
                        size={24}
                        iconColor={colors.TEXT.PRIMARY}
                        onPress={() => setIsMenuVisible(true)}
                      />
                    }
                  >
                    <Menu.Item 
                      onPress={() => {
                        setIsMenuVisible(false);
                        setIsConfirmDialogVisible(true);
                      }} 
                      title="End Session" 
                      leadingIcon="exit-run"
                    />
                  </Menu>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.TAB_BAR.ACTIVE]}
            tintColor={colors.TAB_BAR.ACTIVE}
          />
        }
      >
        {messages.map((message, index) => {
          // Properly determine if message is from the current user
          const isCurrentUserMessage = message.sender_id === currentUserId;
          const isSystemMessage = message.sender_id === 'system';
          const isConsultationMessage = isConsultationChatState;
          
          // Add debug info to help troubleshoot message display issues
          if (index === 0) {
            console.log('Message display debug:', {
              currentUserId,
              otherUserId,
              messageFrom: message.sender_id?.substring(0, 8),
              isCurrent: isCurrentUserMessage,
              isConsultation: isConsultationChatState
            });
          }
          
          if (isSystemMessage) {
            return (
              <MotiView
                key={message.id}
                style={styles.systemMessageWrapper}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 300, delay: index * 50 }}
              >
                <Text style={[styles.systemMessageText, { color: colors.TEXT.SECONDARY }]}>
                  {message.content}
                </Text>
              </MotiView>
            );
          }
          
          return (
            <MotiView
              key={message.id}
              style={[
                styles.messageWrapper,
                isCurrentUserMessage ? styles.sentMessage : styles.receivedMessage,
              ]}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 300, delay: index * 50 }}
            >
              <Surface
                style={[
                  styles.messageBubble,
                  isCurrentUserMessage ? styles.sentBubble : styles.receivedBubble,
                  {
                    backgroundColor: isCurrentUserMessage 
                      ? (isConsultationMessage ? '#4CAF50' : colors.TAB_BAR.ACTIVE)
                      : (isConsultationMessage ? '#E8F5E9' : colors.SURFACE),
                    borderWidth: isConsultationMessage ? 1 : 0,
                    borderColor: isConsultationMessage ? '#4CAF50' : 'transparent',
                  },
                ]}
              >
                {isConsultationMessage && (
                  <View style={styles.consultationIndicator}>
                    <Text 
                      style={[
                        styles.consultationLabel, 
                        { color: isCurrentUserMessage ? '#FFFFFF' : '#4CAF50' }
                      ]}
                    >
                      {isCurrentUserMessage ? 'You (Medical)' : 'Medical'}
                    </Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.messageText,
                    { 
                      color: isCurrentUserMessage 
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
                      color: isCurrentUserMessage 
                        ? 'rgba(255, 255, 255, 0.7)'
                        : colors.TEXT.SECONDARY,
                    },
                  ]}
                >
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </Text>
              </Surface>
            </MotiView>
          );
        })}
      </ScrollView>

      <Surface style={[styles.inputContainer, { backgroundColor: colors.SURFACE }]}>
        <View style={styles.inputContainer}>
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder={isChatActive ? "Type a message..." : "This session has ended"}
            placeholderTextColor={colors.TEXT.SECONDARY}
            style={[
              styles.input, 
              { 
                backgroundColor: colors.SURFACE,
                color: colors.TEXT.PRIMARY,
                opacity: isChatActive ? 1 : 0.6
              }
            ]}
            multiline
            editable={isChatActive}
            ref={textInputRef}
          />
          <IconButton
            icon="send"
            size={24}
            iconColor={colors.TAB_BAR.ACTIVE}
            style={[
              styles.sendButton,
              { opacity: isChatActive ? 1 : 0.4 }
            ]}
            disabled={!isChatActive || !newMessage.trim()}
            onPress={sendMessage}
          />
        </View>
      </Surface>

      {/* Add confirmation dialog */}
      <Portal>
        <Dialog visible={isConfirmDialogVisible} onDismiss={() => setIsConfirmDialogVisible(false)}>
          <Dialog.Title>End Consultation Session</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to end this consultation session? 
              This will permanently delete all chat and consultation data.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsConfirmDialogVisible(false)}>Cancel</Button>
            <Button 
              onPress={handleEndSession} 
              loading={sessionEndingLoading}
              disabled={sessionEndingLoading}
            >
              End & Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    elevation: 4,
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
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
  },
  messageWrapper: {
    marginBottom: 8,
  },
  sentMessage: {
    alignSelf: 'flex-end',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: '80%',
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
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  sendButton: {
    marginLeft: 8,
    borderRadius: 20,
  },
  systemMessageWrapper: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 16,
    padding: 8,
    paddingHorizontal: 12,
    marginVertical: 8, 
    maxWidth: '80%',
  },
  systemMessageText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#666',
  },
  consultationIndicator: {
    marginBottom: 4,
    opacity: 0.8,
  },
  consultationLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
}); 