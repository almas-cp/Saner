-- CRITICAL FIX: Complete the send_consultation_message function properly
-- The function is currently incomplete and doesn't actually insert messages

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

-- Also fix retrieval of messages
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