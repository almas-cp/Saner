// Enhanced chat debugging and logging utility

import { supabase } from './supabase';

/**
 * Debug function to validate chat tables exist
 */
export async function validateChatTables(): Promise<{ valid: boolean; details: string[] }> {
  const details: string[] = [];
  let valid = true;
  
  // Check if chats table exists
  const { data: chatsTable, error: chatsError } = await supabase
    .from('information_schema.tables')
    .select('*')
    .eq('table_schema', 'public')
    .eq('table_name', 'chats')
    .single();
    
  if (chatsError || !chatsTable) {
    details.push('❌ CHATS TABLE IS MISSING! You need to run chat_tables.sql');
    valid = false;
  } else {
    details.push('✅ Chats table exists');
  }
  
  // Check if chat_messages table exists
  const { data: messagesTable, error: messagesError } = await supabase
    .from('information_schema.tables')
    .select('*')
    .eq('table_schema', 'public')
    .eq('table_name', 'chat_messages')
    .single();
    
  if (messagesError || !messagesTable) {
    details.push('❌ CHAT_MESSAGES TABLE IS MISSING! You need to run chat_tables.sql');
    valid = false;
  } else {
    details.push('✅ Chat messages table exists');
  }
  
  // Check if mark_chat_messages_read function exists
  const { data: functionData, error: functionError } = await supabase
    .from('information_schema.routines')
    .select('*')
    .eq('routine_schema', 'public')
    .eq('routine_name', 'mark_chat_messages_read')
    .single();
    
  if (functionError || !functionData) {
    details.push('⚠️ mark_chat_messages_read function is missing. Some chat functionality may not work properly.');
  } else {
    details.push('✅ Chat functions exist');
  }
  
  return { valid, details };
}

/**
 * Debug function to inspect a specific consultation
 */
export async function inspectConsultation(consultationId: string): Promise<{ valid: boolean; details: string[] }> {
  const details: string[] = [];
  let valid = true;
  
  console.log(`Inspecting consultation: ${consultationId}`);
  
  // Get consultation details
  const { data: consultation, error: consultError } = await supabase
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .single();
    
  if (consultError || !consultation) {
    details.push(`❌ Consultation ${consultationId} not found: ${consultError?.message || 'Unknown error'}`);
    valid = false;
    return { valid, details };
  }
  
  details.push(`✅ Found consultation: ${consultationId}`);
  details.push(`   Status: ${consultation.status}`);
  details.push(`   Client ID: ${consultation.client_id}`);
  details.push(`   Professional ID: ${consultation.professional_id}`);
  
  // Check client profile
  const { data: clientProfile, error: clientError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', consultation.client_id)
    .single();
    
  if (clientError) {
    details.push(`❌ Client profile not found: ${clientError.message}`);
    valid = false;
  } else {
    details.push(`✅ Client profile found: ${clientProfile.name || 'No name'}`);
  }
  
  // Check professional profile
  const { data: profProfile, error: profError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', consultation.professional_id)
    .single();
    
  if (profError) {
    details.push(`❌ Professional profile not found: ${profError.message}`);
    valid = false;
  } else {
    details.push(`✅ Professional profile found: ${profProfile.name || 'No name'}`);
  }
  
  // Check if chat already exists
  const { data: chatData, error: chatError } = await supabase
    .from('chats')
    .select('*')
    .eq('consultation_id', consultationId);
    
  if (chatError) {
    details.push(`❌ Error checking for existing chat: ${chatError.message}`);
  } else if (chatData && chatData.length > 0) {
    details.push(`⚠️ Chat already exists for this consultation (${chatData.length} found)`);
  } else {
    details.push(`✅ No existing chat found for this consultation`);
  }
  
  return { valid, details };
}

/**
 * Log consultation status with detailed debugging
 */
export async function logConsultationStatus(): Promise<void> {
  console.log("======= CONSULTATION DEBUG LOG =======");
  
  // Validate chat tables first
  const tableStatus = await validateChatTables();
  tableStatus.details.forEach(detail => console.log(detail));
  
  if (!tableStatus.valid) {
    console.log("❌ CRITICAL: Chat tables are missing! Run chat_tables.sql");
    return;
  }
  
  // Check consultations
  const { data: consultations, error: consultError } = await supabase
    .from('consultations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (consultError) {
    console.error("Error fetching consultations:", consultError);
    return;
  }
  
  console.log(`Found ${consultations?.length || 0} recent consultations`);
  
  // Log chat info
  const { data: chats, error: chatsError } = await supabase
    .from('chats')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (chatsError) {
    console.error("Error fetching chats:", chatsError);
  } else {
    console.log(`Found ${chats?.length || 0} chats in the database`);
  }
  
  console.log("========================================");
}

/**
 * Enhanced function to create a chat room with better error handling and logging
 * Use this to replace the chat creation code in handleConsultationRequest
 */
export async function createConsultationChat(
  consultationId: string,
  clientId: string,
  professionalId: string,
  clientName: string,
  professionalName: string,
  feePaid: number
): Promise<{ success: boolean; error: any }> {
  console.log(`Attempting to create chat for consultation: ${consultationId}`);
  console.log(`Client: ${clientName} (${clientId})`);
  console.log(`Professional: ${professionalName} (${professionalId})`);
  
  try {
    // First check if chat already exists
    const { data: existingChat, error: checkError } = await supabase
      .from('chats')
      .select('id')
      .eq('consultation_id', consultationId)
      .maybeSingle();
      
    if (checkError) {
      console.error('❌ Error checking for existing chat:', checkError);
      return { success: false, error: checkError };
    }
    
    if (existingChat) {
      console.log(`⚠️ Chat already exists for consultation ${consultationId}, skipping creation`);
      return { success: true, error: null };
    }
    
    // Create a chat room entry
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .insert({
        id: consultationId, // Use consultation ID as chat ID for simplicity
        consultation_id: consultationId,
        client_id: clientId,
        professional_id: professionalId,
        client_name: clientName || 'Anonymous Client',
        professional_name: professionalName || 'Medical Professional',
        last_message: `Consultation started! Fee paid: ${feePaid} coins.`,
        last_message_time: new Date().toISOString(),
        unread_client: 1,
        unread_professional: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (chatError) {
      console.error('❌ Error creating chat room:', chatError);
      
      // Log specific error details
      if (chatError.code === '23505') {
        console.log('Duplicate key error - chat may already exist with this ID');
      } else if (chatError.code === '42501') {
        console.log('Permission denied - check RLS policies for chats table');
      } else if (chatError.code === '42P01') {
        console.log('Relation does not exist - chats table is missing!');
      }
      
      return { success: false, error: chatError };
    }
    
    console.log(`✅ Successfully created chat room for consultation ${consultationId}`);
    
    // Create first system message - USING 'system' as sender_id (which is now TEXT, not UUID)
    const { error: msgError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: consultationId,
        sender_id: 'system', // This is now allowed since sender_id is TEXT
        sender_type: 'system',
        message: `Consultation started! Dr. ${professionalName} has accepted the request. Client: ${clientName}. Fee paid: ${feePaid} coins.`,
        created_at: new Date().toISOString()
      });
      
    if (msgError) {
      console.error('⚠️ Created chat room but failed to add first message:', msgError);
      
      if (msgError.code === '42P01') {
        console.log('Relation does not exist - chat_messages table is missing!');
      } else if (msgError.code === '22P02') {
        console.log('Invalid input syntax - check if sender_id is TEXT type, not UUID');
      }
      
      // Return success anyway since the chat was created
      return { success: true, error: { messageError: msgError } };
    }
    
    console.log(`✅ Added initial system message to chat ${consultationId}`);
    return { success: true, error: null };
    
  } catch (error) {
    console.error('❌ Unexpected error creating chat room:', error);
    return { success: false, error };
  }
} 