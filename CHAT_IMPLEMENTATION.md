# Chat Implementation for Medical Consultations

This document explains how to implement the chat functionality for the medical consultation system, ensuring proper tagging of client/doctor roles.

## Database Setup

First, run the `chat_tables.sql` file in your Supabase SQL Editor. This will:

1. Create two essential tables:
   - `chats`: Tracks chat rooms between clients and professionals
   - `chat_messages`: Stores all individual messages

2. Set up proper Row Level Security (RLS) policies to ensure:
   - Clients can only access their own chats
   - Professionals can only access chats where they're the professional
   - Both parties can add messages to chats they're part of

3. Create a helper function for marking messages as read

## Understanding the Chat Integration

The consultation system and chat are now integrated in the following way:

1. **Chat Creation**: When a professional accepts a consultation (by clicking "Accept"), the system:
   - Updates the consultation status to 'active'
   - Creates a new chat entry in the `chats` table
   - Creates a first system message indicating the start of the conversation

2. **User/Doctor Tagging**: The system maintains clear roles by:
   - Storing `client_id` and `professional_id` separately
   - Having a `sender_type` field for each message ('client', 'professional', or 'system')
   - Storing names of both participants for easy display

3. **Chat Interface**: When displaying chats:
   - For doctors: Show "Client: [ClientName]" under consultations
   - For clients: Show "Dr. [DoctorName]" under consultations

## Displaying Chats in Your App

### 1. Create a Chat List Component

In your chats page, fetch and display the active chats:

```typescript
const fetchChats = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Get profile to determine if user is a doctor
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_doctor')
    .eq('id', user.id)
    .single();
  
  const isDoctor = profile?.is_doctor || false;
  
  // Fetch chats
  const { data: chats } = await supabase
    .from('chats')
    .select('*')
    .eq(isDoctor ? 'professional_id' : 'client_id', user.id)
    .order('last_message_time', { ascending: false });
    
  // Set to state
  setChats(chats || []);
};
```

### 2. Style Chat Items

For each chat in the list, show the appropriate role label:

```jsx
{chats.map(chat => (
  <Card key={chat.id} onPress={() => openChat(chat.id)}>
    <Card.Title 
      title={isDoctor ? chat.client_name : `Dr. ${chat.professional_name}`} 
      subtitle={
        <View style={styles.roleLabel}>
          <Text style={styles.roleText}>
            {isDoctor ? "Client" : "Doctor"}
          </Text>
        </View>
      }
    />
    <Card.Content>
      <Text numberOfLines={1}>{chat.last_message}</Text>
      <Text style={styles.timestamp}>
        {formatTimeAgo(chat.last_message_time)}
      </Text>
    </Card.Content>
  </Card>
))}
```

### 3. Chat Detail Screen

When a user opens a chat, display the conversation and handle sending messages:

```typescript
const sendMessage = async (message: string) => {
  if (!message.trim()) return;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  // Determine if user is client or professional
  const isClient = user.id === chat.client_id;
  
  // Send message
  await supabase.from('chat_messages').insert({
    chat_id: chat.id,
    sender_id: user.id,
    sender_type: isClient ? 'client' : 'professional',
    message: message.trim(),
    created_at: new Date().toISOString()
  });
  
  // Update last message in chat
  await supabase.from('chats').update({
    last_message: message.trim(),
    last_message_time: new Date().toISOString(),
    unread_client: isClient ? 0 : (chat.unread_client + 1),
    unread_professional: isClient ? (chat.unread_professional + 1) : 0,
    updated_at: new Date().toISOString()
  }).eq('id', chat.id);
  
  // Clear input and refresh messages
  setInputMessage('');
  fetchMessages();
};
```

## Testing the Integration

Test the full consultation-to-chat flow:

1. **As a Client**:
   - Find a doctor in the professionals list
   - Request a consultation and pay
   - Wait for the doctor to accept

2. **As a Doctor**:
   - View pending consultations
   - Accept a consultation
   - Verify it creates a chat

3. **Both Users**:
   - Check that the chat appears in the chats list
   - Verify the correct role labels show (Client/Doctor)
   - Exchange messages and confirm they appear properly

## Troubleshooting

If chats don't appear after a consultation is accepted:

1. Check the browser console for any errors in the `handleConsultationRequest` function
2. Verify the chat tables exist in your database
3. Check that RLS policies allow the current user to see the chats
4. Try refreshing the app (the `onRefresh` function should fetch new data)

Remember to run the `chat_tables.sql` script before testing this functionality! 