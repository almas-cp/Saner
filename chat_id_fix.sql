-- REAL FINAL FIX: Consultation Chat System
-- This script fixes the issue where the chat UI is looking for the wrong profile

-- 1. First create the send_consultation_message function
CREATE OR REPLACE FUNCTION send_consultation_message(
    p_sender_id UUID,
    p_consultation_id UUID,
    p_message TEXT
) RETURNS JSONB AS $$
DECLARE
    v_result UUID;
    v_chat_id UUID;
    v_client_id UUID;
    v_professional_id UUID;
    v_sender_type TEXT;
BEGIN
    -- Get the chat and consultation details
    SELECT 
        c.id,
        c.client_id,
        c.professional_id
    INTO 
        v_chat_id,
        v_client_id,
        v_professional_id
    FROM 
        chats c
    WHERE 
        c.consultation_id = p_consultation_id;
    
    IF v_chat_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No chat found for this consultation'
        );
    END IF;
    
    -- Determine sender type
    IF p_sender_id = v_client_id THEN
        v_sender_type := 'client';
    ELSIF p_sender_id = v_professional_id THEN
        v_sender_type := 'professional';
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Sender is neither client nor professional in this consultation'
        );
    END IF;
    
    -- Insert the message directly into chat_messages
    INSERT INTO chat_messages (
        chat_id,
        sender_id,
        sender_type,
        message,
        created_at
    ) VALUES (
        v_chat_id,
        p_sender_id,
        v_sender_type,
        p_message,
        now()
    )
    RETURNING id INTO v_result;
    
    -- Update the chat with the last message
    UPDATE chats
    SET 
        last_message = p_message,
        last_message_time = now(),
        unread_client = CASE 
            WHEN v_sender_type = 'client' THEN 0
            ELSE unread_client + 1
        END,
        unread_professional = CASE 
            WHEN v_sender_type = 'professional' THEN 0
            ELSE unread_professional + 1
        END,
        updated_at = now()
    WHERE id = v_chat_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message_id', v_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix database permissions
DO $$
BEGIN
  -- Try to make schema information accessible
  EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA information_schema TO authenticated;';
  EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA pg_catalog TO authenticated;';
EXCEPTION WHEN OTHERS THEN
  -- Ignore permission errors, we can create specific permissions instead
  NULL;
END $$;

-- 3. Create specific permissions for the chat tables
GRANT SELECT, INSERT, UPDATE ON public.chats TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO authenticated;

-- Announce what needs to be fixed in the React code
SELECT 'IMPORTANT: The React code needs to use the correct OTHER USER ID in chat/[id].tsx - see fix below' as message; 