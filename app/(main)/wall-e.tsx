import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, IconButton, Surface, ActivityIndicator, Avatar } from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';
import { useRouter, Redirect } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../src/lib/supabase';
import { MotiView } from 'moti';
import { formatDistanceToNow } from 'date-fns';
import { ENV } from '../../src/config/env';
import * as FileSystem from 'expo-file-system';
import { GoogleGenerativeAI } from '@google/generative-ai';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  user_id?: string;
};

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const INITIAL_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Hello! I'm Wall-E, your mental health support companion. I'm here to listen and help you navigate through your thoughts and feelings. While I'm not a replacement for professional help, I can offer support and coping strategies. How are you feeling today?",
  timestamp: new Date().toISOString(),
};

const SYSTEM_PROMPT = `You are Wall-E, a compassionate and understanding mental health support chatbot. Your purpose is to:

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

Remember: Always prioritize user safety and well-being. If someone expresses thoughts of self-harm or suicide, treat it as an emergency and provide crisis resources immediately.`;

// Debug logging utility with timestamp
const logWallE = (action: string, details?: any) => {
  if (__DEV__) {
    const timestamp = new Date().toISOString();
    console.log(`[Wall-E ${timestamp}] ${action}`, details ? JSON.stringify(details, null, 2) : '');
  }
};

// Add UUID generation function
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function WallE() {
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Check authentication status
  useEffect(() => {
    checkAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        router.replace('/(main)/profile');
      } else if (event === 'SIGNED_IN') {
        setIsAuthenticated(true);
        setCurrentUser(session?.user || null);
        if (session?.user) {
          loadChatHistory(session.user.id);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logWallE('No authenticated user found');
        setIsAuthenticated(false);
        setCurrentUser(null);
        return;
      }
      setCurrentUser(user);
      setIsAuthenticated(true);
      await loadChatHistory(user.id);
    } catch (error) {
      console.error('Auth error:', error);
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  // If authentication status is known and user is not authenticated, redirect to profile
  if (!loading && !isAuthenticated) {
    return <Redirect href="/(main)/profile" />;
  }

  const loadChatHistory = async (userId: string) => {
    try {
      logWallE('Loading chat history from Supabase', { userId });
      
      const { data, error } = await supabase
        .from('wall_e_chats')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.created_at,
          user_id: msg.user_id
        }));
        logWallE('Chat history loaded', { messageCount: formattedMessages.length });
        setMessages([INITIAL_MESSAGE, ...formattedMessages]);

        // Mark all assistant messages as read
        const assistantMessageIds = data
          .filter(msg => msg.role === 'assistant' && !msg.read_at)
          .map(msg => msg.id);

        if (assistantMessageIds.length > 0) {
          const { error: updateError } = await supabase
            .from('wall_e_chats')
            .update({ read_at: new Date().toISOString() })
            .in('id', assistantMessageIds);

          if (updateError) {
            logWallE('Error marking messages as read', { error: updateError });
          }
        }
      } else {
        logWallE('No chat history found');
        setMessages([INITIAL_MESSAGE]);
      }
    } catch (error) {
      logWallE('Error loading chat history', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setMessages([INITIAL_MESSAGE]);
    }
  };

  const saveMessageToSupabase = async (message: Message) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('wall_e_chats')
        .insert({
          id: message.id,
          user_id: currentUser.id,
          role: message.role,
          content: message.content,
          created_at: message.timestamp
        });

      if (error) throw error;
      logWallE('Message saved to Supabase', { messageId: message.id });
    } catch (error) {
      logWallE('Error saving message to Supabase', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const clearChat = async () => {
    if (!currentUser) return;

    try {
      logWallE('Clearing chat history');
      const { error } = await supabase
        .from('wall_e_chats')
        .delete()
        .eq('user_id', currentUser.id);

      if (error) throw error;
      setMessages([INITIAL_MESSAGE]);
      logWallE('Chat history cleared successfully');
    } catch (error) {
      logWallE('Error clearing chat', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isTyping || !currentUser) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsTyping(true);

    try {
      // Create and save user message
      const userMessage: Message = {
        id: generateUUID(),
        role: 'user',
        content: messageContent,
        timestamp: new Date().toISOString(),
        user_id: currentUser.id
      };

      // Save user message to Supabase first
      const { data: savedUserMessage, error: saveError } = await supabase
        .from('wall_e_chats')
        .insert({
          user_id: currentUser.id,
          role: userMessage.role,
          content: userMessage.content
        })
        .select()
        .single();

      if (saveError) {
        throw new Error(`Failed to save user message: ${saveError.message}`);
      }

      // Update message with saved ID from database
      userMessage.id = savedUserMessage.id;
      setMessages(prev => [...prev, userMessage]);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Prepare chat history for AI
      const chatHistory = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const prompt = `${SYSTEM_PROMPT}\n\nChat History:\n${chatHistory}\n\nuser: ${messageContent}`;

      // Generate AI response
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Save assistant message to Supabase
      const { data: savedAssistantMessage, error: assistantSaveError } = await supabase
        .from('wall_e_chats')
        .insert({
          user_id: currentUser.id,
          role: 'assistant',
          content: text.trim()
        })
        .select()
        .single();

      if (assistantSaveError) {
        throw new Error(`Failed to save assistant message: ${assistantSaveError.message}`);
      }

      // Create assistant message with saved ID
      const assistantMessage: Message = {
        id: savedAssistantMessage.id,
        role: 'assistant',
        content: text.trim(),
        timestamp: savedAssistantMessage.created_at,
        user_id: currentUser.id
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('Error in sendMessage:', error);
      
      try {
        // Save error message to Supabase
        const { data: savedErrorMessage, error: errorSaveError } = await supabase
          .from('wall_e_chats')
          .insert({
            user_id: currentUser.id,
            role: 'assistant',
            content: "I apologize, but I'm having trouble responding right now. Please try again in a moment."
          })
          .select()
          .single();

        if (errorSaveError) throw errorSaveError;

        const errorMessage: Message = {
          id: savedErrorMessage.id,
          role: 'assistant',
          content: savedErrorMessage.content,
          timestamp: savedErrorMessage.created_at,
          user_id: currentUser.id
        };

        setMessages(prev => [...prev, errorMessage]);
      } catch (saveError) {
        console.error('Error saving error message:', saveError);
      }
    } finally {
      setIsTyping(false);
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
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.BACKGROUND }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Surface style={[styles.header, { backgroundColor: colors.SURFACE }]}>
        <View style={styles.headerContent}>
          <Avatar.Icon
            size={40}
            icon="robot"
            style={{ backgroundColor: colors.TAB_BAR.ACTIVE }}
          />
          <View style={styles.headerInfo}>
            <Text variant="titleMedium" style={{ color: colors.TEXT.PRIMARY }}>
              Wall-E
            </Text>
            <Text variant="bodySmall" style={{ color: colors.TEXT.SECONDARY }}>
              Mental Health Support
            </Text>
          </View>
          <IconButton
            icon="delete"
            size={24}
            iconColor={colors.TEXT.SECONDARY}
            onPress={clearChat}
          />
        </View>
      </Surface>

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
              message.role === 'user' ? styles.sentMessage : styles.receivedMessage,
            ]}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: index * 50 }}
          >
            <Surface
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.sentBubble : styles.receivedBubble,
                {
                  backgroundColor: message.role === 'user' 
                    ? colors.TAB_BAR.ACTIVE 
                    : colors.SURFACE,
                },
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  { 
                    color: message.role === 'user' 
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
                    color: message.role === 'user' 
                      ? 'rgba(255, 255, 255, 0.7)'
                      : colors.TEXT.SECONDARY,
                  },
                ]}
              >
                {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
              </Text>
            </Surface>
          </MotiView>
        ))}
        {isTyping && (
          <MotiView
            style={[styles.messageWrapper, styles.receivedMessage]}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
          >
            <Surface style={[styles.messageBubble, styles.receivedBubble, { backgroundColor: colors.SURFACE }]}>
              <Text style={[styles.messageText, { color: colors.TEXT.PRIMARY }]}>
                Wall-E is typing...
              </Text>
            </Surface>
          </MotiView>
        )}
      </ScrollView>

      <Surface style={[styles.inputContainer, { backgroundColor: colors.SURFACE }]}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type your message..."
          mode="flat"
          multiline
          disabled={isTyping}
          style={[styles.input, { backgroundColor: colors.SURFACE }]}
          right={
            <TextInput.Icon
              icon="send"
              onPress={sendMessage}
              disabled={!newMessage.trim() || isTyping}
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
    padding: 16,
  },
  headerInfo: {
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