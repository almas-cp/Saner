// Enhanced validation for chat tables that doesn't require test rows

import { supabase } from './supabase';

/**
 * Improved function to validate chat tables existence
 * This version checks if tables exist in information_schema instead of querying data
 */
export async function validateChatTables(): Promise<{ valid: boolean; details: string[] }> {
  const details: string[] = [];
  let valid = true;
  
  try {
    // Check if chats table exists through information_schema
    const { data: chatsTable, error: chatsError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'chats')
      .single();
      
    if (chatsError || !chatsTable) {
      details.push('❌ CHATS TABLE IS MISSING! You need to run the fixed_chat_tables.sql script');
      valid = false;
    } else {
      details.push('✅ Chats table exists');
    }
    
    // Check if chat_messages table exists through information_schema
    const { data: messagesTable, error: messagesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'chat_messages')
      .single();
      
    if (messagesError || !messagesTable) {
      details.push('❌ CHAT_MESSAGES TABLE IS MISSING! You need to run the fixed_chat_tables.sql script');
      valid = false;
    } else {
      details.push('✅ Chat messages table exists');
    }
    
    // Check if mark_chat_messages_read function exists
    const { data: functionData, error: functionError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_name', 'mark_chat_messages_read')
      .single();
      
    if (functionError || !functionData) {
      details.push('⚠️ mark_chat_messages_read function is missing. Some chat functionality may not work properly.');
    } else {
      details.push('✅ Chat functions exist');
    }
    
    // Check if sender_id is TEXT type in chat_messages table
    const { data: columnData, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'chat_messages')
      .eq('column_name', 'sender_id')
      .single();
    
    if (columnError || !columnData) {
      details.push('⚠️ Could not verify sender_id column type');
    } else if (columnData.data_type !== 'text') {
      details.push('❌ sender_id column is not TEXT type! System messages will fail.');
      valid = false;
    } else {
      details.push('✅ sender_id column is TEXT type, system messages will work');
    }
    
  } catch (error) {
    console.error('Error validating chat tables:', error);
    details.push('❌ Error during validation: ' + JSON.stringify(error));
    valid = false;
  }
  
  return { valid, details };
}

/**
 * Full diagnostic report for chat setup
 */
export async function logChatDiagnostics(): Promise<void> {
  console.log("======= CHAT SYSTEM DIAGNOSTIC LOG =======");
  
  // Validate tables
  const tableStatus = await validateChatTables();
  tableStatus.details.forEach(detail => console.log(detail));
  
  if (!tableStatus.valid) {
    console.log("❌ CRITICAL: Chat tables are not properly set up!");
    console.log("Please run the fixed_chat_tables.sql script in your Supabase SQL Editor");
    console.log("If you're still having issues, make sure sender_id in chat_messages is TEXT type, not UUID");
    return;
  }
  
  // If tables exist, show basic stats
  try {
    // Count existing chats
    const { data: chatsCount, error: chatsError } = await supabase
      .from('chats')
      .select('id', { count: 'exact', head: true });
      
    if (chatsError) {
      console.log("❌ Error counting chats:", chatsError);
    } else {
      console.log(`✅ Found ${chatsCount?.count || 0} chats in the database`);
    }
    
    // Count existing messages
    const { data: msgsCount, error: msgsError } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true });
      
    if (msgsError) {
      console.log("❌ Error counting messages:", msgsError);
    } else {
      console.log(`✅ Found ${msgsCount?.count || 0} chat messages in the database`);
    }
    
    console.log("✅ Chat system appears to be set up correctly");
  } catch (error) {
    console.error("Error during chat diagnostics:", error);
  }
  
  console.log("=========================================");
}

/**
 * Test system message sending
 * This helps verify if the system message functionality works
 */
export async function testSystemMessage(chatId: string): Promise<boolean> {
  try {
    console.log(`Testing system message in chat ${chatId}...`);
    
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        sender_id: 'system',
        sender_type: 'system',
        message: 'This is a test system message. If you see this, system messages are working!',
        created_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('❌ System message test failed:', error);
      if (error.code === '22P02') {
        console.log('The sender_id column is not TEXT type. You need to run fixed_chat_tables.sql');
      }
      return false;
    }
    
    console.log('✅ System message sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error in system message test:', error);
    return false;
  }
} 