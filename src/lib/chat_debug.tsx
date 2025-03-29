// Enhanced chat debugging and logging utility

import { supabase } from './supabase';

/**
 * Validates that the required tables exist in the database
 * @returns An object with validation results
 */
export const validateChatTables = async (): Promise<{ 
  chatsTableExists: boolean;
  chatMessagesTableExists: boolean;
  markReadFunctionExists: boolean;
}> => {
  try {
    console.log("Validating chat tables...");
    
    // Check if tables exist by attempting to query them
    // This is more reliable than checking information_schema
    let chatsTableExists = false;
    let chatMessagesTableExists = false;
    let markReadFunctionExists = false;
    
    // Check chats table by doing a count
    try {
      const { count, error } = await supabase
        .from('chats')
        .select('*', { count: 'exact', head: true });
        
      chatsTableExists = !error;
      console.log(`Chats table check: ${chatsTableExists ? 'exists' : 'missing'}`);
    } catch (e) {
      console.log("Error checking chats table:", e);
    }
    
    // Check chat_messages table by doing a count
    try {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true });
        
      chatMessagesTableExists = !error;
      console.log(`Chat messages table check: ${chatMessagesTableExists ? 'exists' : 'missing'}`);
    } catch (e) {
      console.log("Error checking chat_messages table:", e);
    }
    
    // Check for mark_chat_messages_read function by trying to call it
    try {
      const { error } = await supabase.rpc('mark_chat_messages_read', {
        p_chat_id: '00000000-0000-0000-0000-000000000000', // Dummy ID
        p_user_type: 'client'
      });
      
      markReadFunctionExists = !error || (error && !error.message.includes('function does not exist'));
      console.log(`Mark read function check: ${markReadFunctionExists ? 'exists' : 'missing'}`);
    } catch (e) {
      console.log("Error checking mark_chat_messages_read function:", e);
    }
    
    return {
      chatsTableExists,
      chatMessagesTableExists,
      markReadFunctionExists
    };
  } catch (error) {
    console.error("Error in validateChatTables:", error);
    return {
      chatsTableExists: false,
      chatMessagesTableExists: false,
      markReadFunctionExists: false
    };
  }
};

/**
 * Logs the consultation status with better accuracy
 */
export async function logConsultationStatus() {
  const validation = await validateChatTables();
  
  console.log("======= CONSULTATION DEBUG LOG =======");
  
  if (!validation.chatsTableExists) {
    console.log("❌ CHATS TABLE IS MISSING OR INACCESSIBLE! Check permissions.");
  } else {
    console.log("✅ CHATS TABLE EXISTS AND IS ACCESSIBLE");
  }
  
  if (!validation.chatMessagesTableExists) {
    console.log("❌ CHAT_MESSAGES TABLE IS MISSING OR INACCESSIBLE! Check permissions.");
  } else {
    console.log("✅ CHAT_MESSAGES TABLE EXISTS AND IS ACCESSIBLE");
  }
  
  if (!validation.markReadFunctionExists) {
    console.log("⚠️ mark_chat_messages_read function is missing or inaccessible. Some chat functionality may not work properly.");
  } else {
    console.log("✅ mark_chat_messages_read function exists and is accessible");
  }
  
  if (!validation.chatsTableExists || !validation.chatMessagesTableExists) {
    console.log("❌ CRITICAL: Chat tables appear to be missing or inaccessible! Check database permissions.");
  } else {
    console.log("✅ Chat system appears to be properly configured");
  }
}

/**
 * Inspects a specific consultation and logs details
 */
export async function inspectConsultation(consultationId: string) {
  try {
    console.log(`Inspecting consultation: ${consultationId}`);
    
    // Get consultation details
    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', consultationId)
      .single();
    
    if (consultationError || !consultation) {
      console.log(`❌ Consultation not found: ${consultationId}`);
      console.log("Error:", consultationError?.message);
      return;
    }
    
    console.log(`✅ Found consultation: ${consultationId}`);
    console.log(`    Status: ${consultation.status}`);
    console.log(`    Client ID: ${consultation.client_id}`);
    console.log(`    Professional ID: ${consultation.professional_id}`);
    
    // Get client profile
    const { data: clientProfile, error: clientError } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', consultation.client_id)
      .maybeSingle();
    
    if (clientError || !clientProfile) {
      console.log("❌ Client profile not found");
    } else {
      console.log(`✅ Client profile found: ${clientProfile.name}`);
    }
    
    // Get professional profile
    const { data: professionalProfile, error: professionalError } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', consultation.professional_id)
      .maybeSingle();
    
    if (professionalError || !professionalProfile) {
      console.log("❌ Professional profile not found");
    } else {
      console.log(`✅ Professional profile found: ${professionalProfile.name}`);
    }
    
    // Check for chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('consultation_id', consultationId)
      .maybeSingle();
    
    if (chatError || !chat) {
      console.log("❌ No chat found for this consultation");
    } else {
      console.log(`✅ Chat found with id: ${chat.id}`);
      console.log(`    Is active: ${chat.is_active === false ? 'No (completed)' : 'Yes (active)'}`);
      
      // Check for messages
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: false });
      
      if (messagesError) {
        console.log("❌ Error fetching messages");
      } else {
        console.log(`✅ Found ${messages?.length || 0} messages in this chat`);
        if (messages && messages.length > 0) {
          console.log(`    Latest message: ${messages[0].message.substring(0, 50)}${messages[0].message.length > 50 ? '...' : ''}`);
        }
      }
    }
  } catch (error) {
    console.error("Error in inspectConsultation:", error);
  }
}

/**
 * Creates a chat for a consultation with improved error handling
 */
export async function createConsultationChat(
  consultationId: string,
  clientId: string,
  professionalId: string
) {
  try {
    console.log(`Attempting to create chat for consultation: ${consultationId}`);
    
    // First check if chat already exists
    const { data: existingChat, error: checkError } = await supabase
      .from('chats')
      .select('id')
      .eq('consultation_id', consultationId)
      .maybeSingle();
    
    if (existingChat) {
      console.log(`✅ Chat already exists for this consultation with id: ${existingChat.id}`);
      return { success: true, chatId: existingChat.id };
    }
    
    // Get both user profiles
    const { data: clientProfile, error: clientError } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', clientId)
      .maybeSingle();
    
    const { data: professionalProfile, error: professionalError } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', professionalId)
      .maybeSingle();
    
    if (clientError || professionalError) {
      console.log("❌ Error fetching user profiles");
      return { success: false, error: "Couldn't fetch user profiles" };
    }
    
    if (!clientProfile || !professionalProfile) {
      console.log("❌ One or both user profiles not found");
      return { success: false, error: "One or both user profiles not found" };
    }
    
    console.log("✅ Successfully retrieved profiles");
    console.log(`Client: ${clientProfile.name}`);
    console.log(`Professional: ${professionalProfile.name}`);
    
    // Create chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        id: consultationId, // Use same ID for simplicity
        consultation_id: consultationId,
        client_id: clientId,
        professional_id: professionalId,
        client_name: clientProfile.name || 'Client',
        professional_name: professionalProfile.name || 'Doctor',
        last_message: 'Consultation started! Fee paid: 25 coins.',
        last_message_time: new Date().toISOString(),
        unread_client: 1,
        unread_professional: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      })
      .select()
      .single();
    
    if (chatError) {
      console.log("❌ Error creating chat:", chatError);
      
      // Check specific error codes
      if (chatError.code === '23505') {
        console.log("This appears to be a duplicate key error - chat might already exist");
        
        // Try to find the existing chat
        const { data: existingChat } = await supabase
          .from('chats')
          .select('id')
          .eq('consultation_id', consultationId)
          .maybeSingle();
          
        if (existingChat) {
          console.log(`Found existing chat with id: ${existingChat.id}`);
          return { success: true, chatId: existingChat.id };
        }
      }
      
      return { success: false, error: chatError.message };
    }
    
    console.log(`✅ Successfully created chat room for consultation ${consultationId}`);
    
    // Create initial system message
    try {
      const { data: message, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chat.id,
          sender_id: 'system',
          sender_type: 'system',
          message: `Consultation started! Dr. ${professionalProfile.name} has accepted the request. Client: ${clientProfile.name}. Fee paid: 25 coins.`,
          created_at: new Date().toISOString(),
          read: false
        })
        .select()
        .single();
      
      if (messageError) {
        console.log("⚠️ Created chat but failed to add welcome message:", messageError);
      } else {
        console.log(`✅ Added initial system message to chat ${chat.id}`);
      }
    } catch (e) {
      console.log("⚠️ Error adding welcome message:", e);
    }
    
    console.log("✅ Chat creation successful");
    return { success: true, chatId: chat.id };
  } catch (error) {
    console.error("Error in createConsultationChat:", error);
    return { success: false, error: "Unexpected error creating chat" };
  }
} 