-- Fix for the message validation to allow consultation chats
-- This modifies the existing function to check for consultations

CREATE OR REPLACE FUNCTION public.validate_message_connection()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
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
    
    -- Otherwise, check for an accepted connection as before
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

-- IMPORTANT: Let users know this has been run
SELECT 'Message validation function updated to allow consultation chats' AS result; 