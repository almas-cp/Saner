// Test script for consultation chat creation
const { createClient } = require('@supabase/supabase-js');

async function testConsultationChatCreation() {
  // Replace with your actual Supabase URL and anon key
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Please set SUPABASE_URL and SUPABASE_KEY environment variables');
    return;
  }
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Get a sample consultation to use for testing
    const { data: consultations, error: consultationError } = await supabase
      .from('consultations')
      .select('*')
      .eq('status', 'pending')
      .limit(1);
      
    if (consultationError) {
      throw new Error(`Error fetching consultation: ${consultationError.message}`);
    }
    
    if (!consultations || consultations.length === 0) {
      console.log('No pending consultations found for testing. Creating a dummy one for testing...');
      
      // Let's find user IDs to use for creating a test consultation
      const { data: users } = await supabase
        .from('profiles')
        .select('id, name, is_doctor')
        .limit(10);
        
      if (!users || users.length < 2) {
        throw new Error('Not enough users found for testing');
      }
      
      // Find a doctor and a non-doctor
      const doctor = users.find(u => u.is_doctor);
      const client = users.find(u => !u.is_doctor);
      
      if (!doctor || !client) {
        throw new Error('Could not find a doctor and client pair for testing');
      }
      
      // Create a test consultation
      const { data: newConsultation, error: createError } = await supabase
        .from('consultations')
        .insert({
          client_id: client.id,
          professional_id: doctor.id,
          status: 'pending',
          fee_paid: 25,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (createError) {
        throw new Error(`Error creating test consultation: ${createError.message}`);
      }
      
      console.log('Created test consultation:', newConsultation);
      
      // Use this new consultation for testing
      consultations = [newConsultation];
    }
    
    const consultation = consultations[0];
    console.log('Using consultation for testing:', consultation);
    
    // Get user profiles
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', consultation.client_id)
      .single();
      
    const { data: professionalProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', consultation.professional_id)
      .single();
    
    if (!clientProfile || !professionalProfile) {
      throw new Error('Could not find user profiles');
    }
    
    // Call the create_unique_consultation_chat function
    console.log('Calling create_unique_consultation_chat with:', {
      p_consultation_id: consultation.id,
      p_client_id: consultation.client_id,
      p_professional_id: consultation.professional_id,
      p_client_name: clientProfile.name || 'Client',
      p_professional_name: professionalProfile.name || 'Doctor'
    });
    
    const { data: chatResult, error: chatError } = await supabase.rpc(
      'create_unique_consultation_chat',
      {
        p_consultation_id: consultation.id,
        p_client_id: consultation.client_id,
        p_professional_id: consultation.professional_id,
        p_client_name: clientProfile.name || 'Client',
        p_professional_name: professionalProfile.name || 'Doctor'
      }
    );
    
    if (chatError) {
      throw new Error(`Error creating chat: ${chatError.message}`);
    }
    
    console.log('Successfully created consultation chat:', chatResult);
    
    // Verify chat was created by querying the database
    const { data: chatData, error: fetchError } = await supabase
      .from('chats')
      .select('*, chat_messages(*)')
      .eq('id', chatResult.chat_id)
      .single();
      
    if (fetchError) {
      throw new Error(`Error fetching created chat: ${fetchError.message}`);
    }
    
    console.log('Verified chat exists:', {
      id: chatData.id,
      client_id: chatData.client_id,
      professional_id: chatData.professional_id,
      last_message: chatData.last_message,
      message_count: chatData.chat_messages?.length || 0
    });
    
    console.log('TEST PASSED: Consultation chat created successfully');
  } catch (error) {
    console.error('TEST FAILED:', error.message);
  }
}

// Run the test
testConsultationChatCreation().catch(console.error); 