-- Function to create a unique consultation chat
CREATE OR REPLACE FUNCTION public.create_unique_consultation_chat(
  p_consultation_id UUID,
  p_client_id UUID,
  p_client_name TEXT,
  p_professional_id UUID,
  p_professional_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_chat_id UUID;
  v_existing_chat_id UUID;
BEGIN
  -- Check if a chat already exists for this consultation
  SELECT id INTO v_existing_chat_id
  FROM chats
  WHERE consultation_id = p_consultation_id;
  
  -- If chat already exists, return it
  IF v_existing_chat_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'chat_id', v_existing_chat_id,
      'message', 'Chat already exists for this consultation'
    );
  END IF;
  
  -- Generate a new UUID for the chat
  -- In this case, we'll use the consultation_id as the chat_id for simplicity
  v_chat_id := p_consultation_id;
  
  -- Create the chat record
  INSERT INTO chats (
    id,
    consultation_id,
    client_id,
    professional_id,
    client_name,
    professional_name,
    unread_client,
    unread_professional,
    created_at,
    updated_at,
    is_active
  ) VALUES (
    v_chat_id,
    p_consultation_id,
    p_client_id,
    p_professional_id,
    p_client_name,
    p_professional_name,
    0,
    0,
    NOW(),
    NOW(),
    true
  );
  
  -- Add a system message to start the chat
  INSERT INTO chat_messages (
    id,
    chat_id,
    sender_id,
    sender_type,
    message,
    read,
    created_at
  ) VALUES (
    uuid_generate_v4(),
    v_chat_id,
    'system',
    'system',
    'Consultation started! Dr. ' || p_professional_name || ' has accepted the request. Client: ' || p_client_name || '. Fee paid: 25 coins.',
    true,
    NOW()
  );
  
  -- Update the chat with the last message
  UPDATE chats
  SET 
    last_message = 'Consultation started! Dr. ' || p_professional_name || ' has accepted the request. Client: ' || p_client_name || '. Fee paid: 25 coins.',
    last_message_time = NOW()
  WHERE id = v_chat_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'chat_id', v_chat_id,
    'message', 'Chat created successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Error creating chat: ' || SQLERRM
  );
END;
$function$; 