-- FINAL COMPREHENSIVE FIX FOR CONSULTATION CHAT SYSTEM
-- Run this SQL script in your Supabase SQL Editor to fix all chat issues

-- 1. Fix the send_consultation_message function
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

-- 2. Create a function to retrieve consultation messages
CREATE OR REPLACE FUNCTION get_consultation_messages(p_consultation_id UUID)
RETURNS TABLE (
    id UUID,
    chat_id UUID,
    sender_id TEXT,
    sender_type TEXT,
    message TEXT,
    read BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.id,
        cm.chat_id,
        cm.sender_id,
        cm.sender_type,
        cm.message,
        cm.read,
        cm.created_at
    FROM 
        chat_messages cm
    JOIN
        chats c ON cm.chat_id = c.id
    WHERE 
        c.consultation_id = p_consultation_id
    ORDER BY 
        cm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix permissions for the chat tables
GRANT SELECT, INSERT, UPDATE ON public.chats TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO authenticated;

-- 4. Create a function to mark messages as read
CREATE OR REPLACE FUNCTION mark_chat_messages_read(
    p_chat_id UUID,
    p_user_type TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE chat_messages
    SET read = TRUE
    WHERE chat_id = p_chat_id
    AND (
        (p_user_type = 'client' AND sender_type = 'professional')
        OR
        (p_user_type = 'professional' AND sender_type = 'client')
    )
    AND read = FALSE;
    
    -- Also update the unread counters in the chat
    IF p_user_type = 'client' THEN
        UPDATE chats
        SET unread_client = 0
        WHERE id = p_chat_id;
    ELSIF p_user_type = 'professional' THEN
        UPDATE chats
        SET unread_professional = 0
        WHERE id = p_chat_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add a test message to verify everything is working
DO $$
DECLARE
    v_chat_id UUID;
    v_client_id UUID;
    v_professional_id UUID;
BEGIN
    -- Get a chat to test with
    SELECT id, client_id, professional_id
    INTO v_chat_id, v_client_id, v_professional_id
    FROM chats
    LIMIT 1;
    
    IF v_chat_id IS NOT NULL THEN
        -- Insert a test system message
        INSERT INTO chat_messages (
            chat_id,
            sender_id,
            sender_type,
            message,
            created_at
        ) VALUES (
            v_chat_id,
            'system',
            'system',
            'This is a test message to verify the chat system is working correctly.',
            now()
        );
        
        RAISE NOTICE 'Test message added to chat %', v_chat_id;
    ELSE
        RAISE NOTICE 'No chats found for testing';
    END IF;
END $$;

-- 6. Verify the tables exist and are accessible
DO $$
BEGIN
    PERFORM count(*) FROM chats;
    PERFORM count(*) FROM chat_messages;
    RAISE NOTICE 'Chat tables verified successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error verifying chat tables: %', SQLERRM;
END $$; 