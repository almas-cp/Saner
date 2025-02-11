import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/auth';

type Chat = {
  id: string;
  name: string;
  username: string;
  lastMessage: string;
};

type FriendRequest = {
  id: string;
  username: string;
  name: string;
};

export function useChat() {
  const { session } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  useEffect(() => {
    if (session) {
      fetchChats();
      fetchFriendRequests();
      const subscription = supabase
        .channel('any')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, 
          () => fetchChats()
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, 
          () => {
            fetchChats();
            fetchFriendRequests();
          }
        )
        .subscribe();

      return () => subscription.unsubscribe();
    }
  }, [session]);

  async function fetchChats() {
    try {
      // First get all friendships
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${session!.user.id},user2_id.eq.${session!.user.id}`);

      if (friendshipsError) throw friendshipsError;

      // Then get user details for each friendship
      const chatPromises = friendships.map(async (friendship) => {
        const friendId = friendship.user1_id === session!.user.id 
          ? friendship.user2_id 
          : friendship.user1_id;

        // Get friend's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, username')
          .eq('id', friendId)
          .single();

        // Get latest message
        const { data: messages } = await supabase
          .from('messages')
          .select('content')
          .or(`and(sender_id.eq.${session!.user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${session!.user.id})`)
          .order('created_at', { ascending: false })
          .limit(1);

        return {
          id: friendship.id,
          name: profile?.name || 'Unknown',
          username: profile?.username || 'unknown',
          lastMessage: messages?.[0]?.content || 'No messages yet'
        };
      });

      const chatsData = await Promise.all(chatPromises);
      setChats(chatsData);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFriendRequests() {
    try {
      const { data: requests, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user1:user1_id(
            profiles (
              username,
              name
            )
          )
        `)
        .eq('user2_id', session!.user.id)
        .eq('status', 'pending');

      if (error) throw error;

      setFriendRequests(
        requests.map(req => ({
          id: req.id,
          username: req.user1.profiles[0].username,
          name: req.user1.profiles[0].name
        }))
      );
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  }

  async function acceptFriendRequest(requestId: string) {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;
      
      await Promise.all([fetchChats(), fetchFriendRequests()]);
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  }

  async function rejectFriendRequest(requestId: string) {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
      
      await fetchFriendRequests();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  }

  async function addFriend(username: string) {
    try {
      setError(null);

      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', username)
        .single();

      if (userError || !user) {
        throw new Error(`User "${username}" not found`);
      }

      if (user.id === session!.user.id) {
        throw new Error('Cannot add yourself as friend');
      }

      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert({
          user1_id: session!.user.id,
          user2_id: user.id,
          status: 'pending'
        });

      if (friendshipError) {
        if (friendshipError.code === '23505') {
          throw new Error('Friend request already sent');
        }
        throw friendshipError;
      }

      await fetchChats();
    } catch (error: any) {
      console.error('Error adding friend:', error);
      setError(error.message);
    }
  }

  return {
    chats,
    loading,
    error,
    addFriend,
    friendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
  };
}