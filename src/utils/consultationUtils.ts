import { supabase } from '../lib/supabase';

/**
 * Sends a message in a consultation chat
 * This uses a special PostgreSQL function to bypass connection checks
 */
export const sendConsultationMessage = async (
  senderId: string,
  consultationId: string,
  message: string
): Promise<{ success: boolean; error?: string; messageId?: string }> => {
  try {
    console.log(`[Consultation] Sending message to consultation ${consultationId}`);
    
    // First, check if the chat is still active
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select('is_active')
      .eq('consultation_id', consultationId)
      .maybeSingle();
      
    if (chatError) {
      console.error('[Consultation] Error checking if chat is active:', chatError);
      return { success: false, error: chatError.message };
    }
    
    // If chat is explicitly set to inactive (ended session)
    if (chatData?.is_active === false) {
      console.log('[Consultation] Cannot send message - consultation session has ended');
      return { 
        success: false, 
        error: 'This consultation session has ended. You cannot send new messages.' 
      };
    }
    
    // Call the database function that handles consultation messages
    const { data, error } = await supabase.rpc('send_consultation_message', {
      p_sender_id: senderId,
      p_consultation_id: consultationId,
      p_message: message
    });
    
    if (error) {
      console.error('[Consultation] Error sending message:', error);
      return { success: false, error: error.message };
    }
    
    console.log('[Consultation] Message sent successfully:', data);
    return { 
      success: true, 
      messageId: data?.message_id
    };
  } catch (error) {
    console.error('[Consultation] Unexpected error sending message:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Checks if a chat is a consultation chat
 */
export const isConsultationChat = async (chatId: string): Promise<boolean> => {
  try {
    // Check if there's a chat with this consultation_id
    const { data, error } = await supabase
      .from('chats')
      .select('consultation_id')
      .eq('consultation_id', chatId)
      .maybeSingle();
      
    if (error) {
      console.error('[Consultation] Error checking if chat is consultation:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('[Consultation] Error in isConsultationChat:', error);
    return false;
  }
};

/**
 * Fetches consultation chat messages
 */
export const fetchConsultationMessages = async (consultationId: string) => {
  try {
    console.log(`[Consultation] Fetching messages for consultation ${consultationId}`);
    
    // Use the get_consultation_messages RPC function for better reliability
    const { data, error } = await supabase.rpc('get_consultation_messages', {
      p_consultation_id: consultationId
    });
    
    if (error) {
      console.log(`[Consultation] RPC function failed, falling back to direct query:`, error);
      
      // Fallback to direct query if RPC fails
      const { data: directData, error: directError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', consultationId)
        .order('created_at', { ascending: true });
        
      if (directError) {
        console.error('[Consultation] Error fetching messages:', directError);
        return { messages: [], error: directError.message };
      }
      
      console.log(`[Consultation] Retrieved ${directData?.length || 0} messages via direct query`);
      return { messages: directData || [], error: null };
    }
    
    console.log(`[Consultation] Retrieved ${data?.length || 0} messages via RPC`);
    return { messages: data || [], error: null };
  } catch (error) {
    console.error('[Consultation] Error in fetchConsultationMessages:', error);
    return { messages: [], error: 'Failed to fetch messages' };
  }
};

/**
 * Gets sender type (client or professional) for the current user in a consultation
 */
export const getSenderType = async (
  userId: string, 
  consultationId: string
): Promise<'client' | 'professional' | null> => {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('client_id, professional_id')
      .eq('consultation_id', consultationId)
      .maybeSingle();
      
    if (error || !data) {
      console.error('[Consultation] Error getting sender type:', error);
      return null;
    }
    
    if (data.client_id === userId) {
      return 'client';
    } else if (data.professional_id === userId) {
      return 'professional';
    } else {
      return null;
    }
  } catch (error) {
    console.error('[Consultation] Error in getSenderType:', error);
    return null;
  }
};

/**
 * Ends a consultation session (doctors only)
 * This marks the consultation as completed and adds a final system message
 */
export const endConsultationSession = async (
  doctorId: string,
  consultationId: string,
  customMessage?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`[Consultation] Doctor ${doctorId} is ending consultation ${consultationId}`);
    
    const message = customMessage || 'The doctor has ended this consultation session. Thank you for using our service.';
    
    // Call the database function to end the session
    const { data, error } = await supabase.rpc('end_consultation_session', {
      p_consultation_id: consultationId,
      p_doctor_id: doctorId,
      p_end_message: message
    });
    
    if (error) {
      console.error('[Consultation] Error ending session:', error);
      return { success: false, error: error.message };
    }
    
    console.log('[Consultation] Session ended successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('[Consultation] Unexpected error ending session:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}; 