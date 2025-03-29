-- SQL fix for chat system

-- Create the missing create_unique_consultation_chat function
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

-- Grant proper permissions to the new function
GRANT EXECUTE ON FUNCTION public.create_unique_consultation_chat TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_unique_consultation_chat TO anon;

-- Verify functions exist
SELECT 'create_unique_consultation_chat exists: ' || EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'create_unique_consultation_chat' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
) AS result;

SELECT 'send_consultation_message exists: ' || EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'send_consultation_message' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
) AS result;

-- Add missing indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'chats' AND indexname = 'chats_consultation_id_idx'
  ) THEN
    CREATE INDEX chats_consultation_id_idx ON chats(consultation_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'chat_messages' AND indexname = 'chat_messages_chat_id_idx'
  ) THEN
    CREATE INDEX chat_messages_chat_id_idx ON chat_messages(chat_id);
  END IF;
END $$; 