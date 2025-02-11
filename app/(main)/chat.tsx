import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Button, FAB, Portal, Dialog, TextInput } from 'react-native-paper';
import { useState } from 'react';
import { useChat } from '../../src/hooks/useChat';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';

export default function Chat() {
  const [addFriendVisible, setAddFriendVisible] = useState(false);
  const [requestsVisible, setRequestsVisible] = useState(false);
  const [username, setUsername] = useState('');
  const { 
    chats, 
    loading, 
    addFriend, 
    error,
    friendRequests,
    acceptFriendRequest,
    rejectFriendRequest 
  } = useChat();

  // Create dynamic styles that depend on friendRequests
  const dynamicStyles = {
    requestFab: {
      backgroundColor: (friendRequests?.length || 0) > 0 ? '#03dac4' : '#6200ee',
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Link href={`/chat/${item.id}`} asChild>
            <Button mode="text" style={styles.chatItem}>
              <View style={styles.chatItemContent}>
                <MaterialCommunityIcons name="account" size={24} color="#666" />
                <View style={styles.chatItemText}>
                  <Text variant="titleMedium">{item.name}</Text>
                  <Text variant="bodySmall" numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                </View>
              </View>
            </Button>
          </Link>
        )}
      />

      {/* Friend Requests Dialog */}
      <Portal>
        <Dialog visible={requestsVisible} onDismiss={() => setRequestsVisible(false)}>
          <Dialog.Title>Friend Requests</Dialog.Title>
          <Dialog.Content>
            {(friendRequests?.length || 0) === 0 ? (
              <Text>No pending friend requests</Text>
            ) : (
              friendRequests?.map(request => (
                <View key={request.id} style={styles.requestItem}>
                  <Text variant="bodyLarge">{request.username}</Text>
                  <View style={styles.requestButtons}>
                    <Button 
                      mode="contained" 
                      onPress={() => acceptFriendRequest(request.id)}
                      style={styles.acceptButton}
                    >
                      Accept
                    </Button>
                    <Button 
                      mode="outlined" 
                      onPress={() => rejectFriendRequest(request.id)}
                      style={styles.rejectButton}
                    >
                      Reject
                    </Button>
                  </View>
                </View>
              ))
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRequestsVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Add Friend Dialog */}
      <Portal>
        <Dialog visible={addFriendVisible} onDismiss={() => setAddFriendVisible(false)}>
          <Dialog.Title>Add Friend</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            {error && <Text style={styles.error}>{error}</Text>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddFriendVisible(false)}>Cancel</Button>
            <Button onPress={async () => {
              await addFriend(username);
              setAddFriendVisible(false);
              setUsername('');
            }}>Send Request</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* FAB Group */}
      <View style={styles.fabContainer}>
        <FAB
          icon="account-multiple"
          label={`Requests (${friendRequests?.length || 0})`}
          style={[styles.fab, dynamicStyles.requestFab]}
          onPress={() => setRequestsVisible(true)}
        />
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => setAddFriendVisible(true)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    gap: 16,
  },
  fab: {
    backgroundColor: '#6200ee',
  },
  chatItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatItemText: {
    marginLeft: 16,
    flex: 1,
  },
  error: {
    color: '#FF6B6B',
    marginTop: 8,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#03dac4',
  },
  rejectButton: {
    borderColor: '#FF6B6B',
  },
}); 