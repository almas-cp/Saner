import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Appbar, Avatar, Badge, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { supabase } from '../../../src/lib/supabase';

type CompletedChatMessage = {
  id: string;
  completed_chat_id: string;
  sender_id: string;
  sender_type: 'client' | 'doctor' | 'system';
  message: string;
  created_at: string;
  read: boolean;
};

export default function CompletedChatView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [messages, setMessages] = useState<CompletedChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatDetails, setChatDetails] = useState<{
    client_name: string;
    professional_name: string;
    client_id: string;
    professional_id: string;
  } | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'client' | 'doctor' | null>(null);
  const [otherUserName, setOtherUserName] = useState('');
  
  useEffect(() => {
    fetchCompletedChatDetails();
    fetchCompletedMessages();
  }, [id]);
  
  const fetchCompletedChatDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }
      
      // Get the completed chat details
      const { data: chatData, error: chatError } = await supabase
        .from('completed_chats')
        .select('client_name, professional_name, client_id, professional_id')
        .eq('id', id)
        .single();
      
      if (chatError || !chatData) {
        console.error('Error fetching completed chat details:', chatError);
        return;
      }
      
      setChatDetails(chatData);
      
      // Determine user role and the other user's name
      if (user.id === chatData.client_id) {
        setCurrentUserRole('client');
        setOtherUserName(chatData.professional_name);
      } else if (user.id === chatData.professional_id) {
        setCurrentUserRole('doctor');
        setOtherUserName(chatData.client_name);
      }
      
    } catch (error) {
      console.error('Error in fetchCompletedChatDetails:', error);
    }
  };
  
  const fetchCompletedMessages = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('completed_chat_messages')
        .select('*')
        .eq('completed_chat_id', id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching completed chat messages:', error);
        return;
      }
      
      setMessages(data as CompletedChatMessage[]);
    } catch (error) {
      console.error('Error in fetchCompletedMessages:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const renderMessage = ({ item }: { item: CompletedChatMessage }) => {
    const isCurrentUser = 
      (currentUserRole === 'client' && item.sender_type === 'client') || 
      (currentUserRole === 'doctor' && item.sender_type === 'doctor');
    
    const isSystem = item.sender_type === 'system';
    
    if (isSystem) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.message}</Text>
        </View>
      );
    }
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        <View style={styles.messageContent}>
          <Text style={styles.messageText}>{item.message}</Text>
          <Text style={styles.messageTime}>
            {format(new Date(item.created_at), 'h:mm a')}
          </Text>
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{otherUserName}</Text>
          {currentUserRole && (
            <Badge style={styles.roleBadge}>
              {currentUserRole === 'client' ? 'Your Doctor' : 'Your Client'}
            </Badge>
          )}
        </View>
        <Badge style={styles.archivedBadge}>Archived</Badge>
      </Appbar.Header>
      
      <Divider />
      
      <View style={styles.archivedBanner}>
        <Text style={styles.archivedText}>
          This consultation has been completed and archived. The chat history is read-only.
        </Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          inverted={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  archivedBadge: {
    backgroundColor: '#9e9e9e',
    marginRight: 8,
  },
  archivedBanner: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  archivedText: {
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 8,
    borderRadius: 16,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
  },
  systemMessageContainer: {
    alignSelf: 'center',
    marginVertical: 8,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  systemMessageText: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
  },
  messageContent: {
    padding: 12,
  },
  messageText: {
    fontSize: 16,
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
}); 