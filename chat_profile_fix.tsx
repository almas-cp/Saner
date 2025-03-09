/**
 * Safely fetches a profile with fallback to prevent "no rows" errors
 */
const fetchProfileSafely = async (userId: string): Promise<any> => {
  try {
    // First try to fetch the profile directly
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle instead of single
      
    if (error) {
      console.log(`[Chat] Error fetching profile for ${userId}:`, error);
      return null;
    }
    
    if (data) {
      return data;
    }
    
    // If no data, create a fallback profile object
    console.log(`[Chat] Profile not found for ${userId}, using fallback`);
    return {
      id: userId,
      name: 'User',
      username: 'unknown',
      profile_pic_url: null,
      is_doctor: false,
    };
  } catch (error) {
    console.error(`[Chat] Unexpected error fetching profile for ${userId}:`, error);
    return null;
  }
};

// Usage in your fetchMessages function:
const fetchMessages = async () => {
  setIsLoading(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setCurrentUser(user);
    
    // For consultation chats
    if (isConsultation) {
      // Get the chat data
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .maybeSingle(); // Using maybeSingle to avoid errors
      
      if (chatError || !chatData) {
        console.log('[Chat] Error fetching chat:', chatError);
        setIsLoading(false);
        return;
      }
      
      // Determine if user is client or professional
      const isUserClient = chatData.client_id === user.id;
      const otherUserId = isUserClient ? chatData.professional_id : chatData.client_id;
      
      // Use the safe fetch function instead of direct query
      const otherUserData = await fetchProfileSafely(otherUserId);
      if (otherUserData) {
        setOtherUser(otherUserData);
      }
      
      // Rest of your existing code for fetching messages
      // ...
    }
    
    // For regular chats
    else {
      // Use the safe fetch for regular chats too
      const otherUserId = connectionId; // or however you get the other user ID
      const otherUserData = await fetchProfileSafely(otherUserId);
      if (otherUserData) {
        setOtherUser(otherUserData);
      }
      
      // Rest of your existing code
      // ...
    }
  } catch (error) {
    console.error('[Chat] Error in fetchMessages:', error);
  } finally {
    setIsLoading(false);
  }
}; 