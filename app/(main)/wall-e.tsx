import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, IconButton, Surface, ActivityIndicator, Avatar } from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';
import { useRouter } from 'expo-router';
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

export default function WallE() {
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load chat history from local storage
  useEffect(() => {
    loadChatHistory();
    checkAuth();
  }, []);

  // Save chat history when messages change
  useEffect(() => {
    if (messages.length > 1) { // Only save if there are messages beyond the initial one
      saveChatHistory();
    }
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const filePath = `${FileSystem.documentDirectory}wall-e-chat.json`;
      logWallE('Loading chat history', { filePath });
      
      const fileExists = await FileSystem.getInfoAsync(filePath);
      
      if (fileExists.exists) {
        const content = await FileSystem.readAsStringAsync(filePath);
        const savedMessages = JSON.parse(content);
        logWallE('Chat history loaded', { messageCount: savedMessages.length });
        setMessages(savedMessages);
      } else {
        logWallE('No chat history found');
      }
    } catch (error) {
      logWallE('Error loading chat history', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const saveChatHistory = async () => {
    try {
      const filePath = `${FileSystem.documentDirectory}wall-e-chat.json`;
      logWallE('Saving chat history', { messageCount: messages.length });
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(messages));
      logWallE('Chat history saved successfully');
    } catch (error) {
      logWallE('Error saving chat history', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(main)/profile');
        return;
      }
      setCurrentUser(user);
    } catch (error) {
      console.error('Auth error:', error);
      router.replace('/(main)/profile');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isTyping) return;

    logWallE('Sending message', { content: newMessage.trim() });

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Prepare chat history
      const chatHistory = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const prompt = `${SYSTEM_PROMPT}\n\nChat History:\n${chatHistory}\n\nuser: ${newMessage.trim()}`;

      logWallE('Generating content', {
        messageCount: messages.length + 1,
        lastMessage: newMessage.trim()
      });

      // Generate content using Gemini
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      logWallE('API Success Response', {
        responseLength: text.length,
        promptTokens: result.response.promptFeedback
      });

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };

      logWallE('Adding assistant message', {
        messageId: assistantMessage.id,
        contentLength: assistantMessage.content.length,
      });

      setMessages(prev => [...prev, assistantMessage]);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      logWallE('Error in sendMessage', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = async () => {
    try {
      logWallE('Clearing chat history');
      await FileSystem.deleteAsync(`${FileSystem.documentDirectory}wall-e-chat.json`);
      setMessages([INITIAL_MESSAGE]);
      logWallE('Chat history cleared successfully');
    } catch (error) {
      logWallE('Error clearing chat', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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