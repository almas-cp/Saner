-- This will add a test message to check real-time functionality
-- Run this in the SQL Editor to create a test message

DO $$
DECLARE
    v_chat_id UUID;
    v_client_id UUID;
    v_professional_id UUID;
BEGIN
    -- Get the first chat
    SELECT id, client_id, professional_id
    INTO v_chat_id, v_client_id, v_professional_id
    FROM chats
    LIMIT 1;
    
    IF v_chat_id IS NULL THEN
        RAISE EXCEPTION 'No chats found!';
    END IF;
    
    -- Add a test message as the system
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
        'This is a test message from SQL to verify that real-time messaging is working. You should see this immediately!',
        now()
    );
    
    -- Show the chat IDs for reference
    RAISE NOTICE 'Test message added to chat: %', v_chat_id;
    RAISE NOTICE 'Client ID: %', v_client_id;
    RAISE NOTICE 'Professional ID: %', v_professional_id;
END $$; 