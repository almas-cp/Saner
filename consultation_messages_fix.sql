-- COMPLETE FIX for consultation chat messages
-- This creates a new function to handle consultation messages properly

-- First, modify the existing validation function to check if we're in consultation mode
CREATE OR REPLACE FUNCTION public.validate_message_connection()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Add a special bypass for system-managed chat purposes
    -- This will check if the receiver_id is a valid consultation ID
    IF EXISTS (
        SELECT 1 FROM consultations 
        WHERE id = NEW.receiver_id 
        AND status = 'active'
    ) THEN
        -- Allow sending messages to consultation IDs directly
        RETURN NEW;
    END IF;
    
    -- Check if there's an active consultation between these users
    IF EXISTS (
        SELECT 1 FROM consultations
        WHERE status = 'active'
        AND (
            (client_id = NEW.sender_id AND professional_id = NEW.receiver_id)
            OR
            (client_id = NEW.receiver_id AND professional_id = NEW.sender_id)
        )
    ) THEN
        -- Allow the message if there's an active consultation
        RETURN NEW;
    END IF;
    
    -- Normal connection check for regular messages
    IF NOT EXISTS (
        SELECT 1 FROM connections
        WHERE status = 'accepted'
        AND (
            (requester_id = NEW.sender_id AND target_id = NEW.receiver_id)
            OR
            (requester_id = NEW.receiver_id AND target_id = NEW.sender_id)
        )
    ) THEN
        RAISE EXCEPTION 'Cannot send message: No accepted connection exists between users';
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Now let's create a helper function for consultation messages
CREATE OR REPLACE FUNCTION send_consultation_message(
    p_sender_id UUID,
    p_consultation_id UUID,
    p_message TEXT
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
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
        'message_id', v_result,
        'chat_id', v_chat_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- IMPORTANT: Check if this function works for a test consultation
DO $$
DECLARE
    v_consult_id UUID;
    v_client_id UUID;
    v_prof_id UUID;
    v_result JSONB;
BEGIN
    -- Get a test consultation
    SELECT id, client_id, professional_id 
    INTO v_consult_id, v_client_id, v_prof_id
    FROM consultations 
    WHERE status = 'active' 
    LIMIT 1;
    
    IF v_consult_id IS NOT NULL THEN
        -- Try to send a test message
        v_result := send_consultation_message(
            v_client_id, 
            v_consult_id, 
            'This is a test message from the SQL function'
        );
        
        RAISE NOTICE 'Test message result: %', v_result;
    ELSE
        RAISE NOTICE 'No active consultations found for testing';
    END IF;
END $$; 