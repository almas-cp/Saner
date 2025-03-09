-- Fix for schema visibility and information_schema permissions

-- Grant proper permissions to information_schema to allow table detection
GRANT SELECT ON ALL TABLES IN SCHEMA information_schema TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA pg_catalog TO authenticated;

-- Add more explicit permissions to the chat tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;

-- Create more specific RLS policies to ensure proper access
DROP POLICY IF EXISTS "Users can view all chats" ON public.chats;
CREATE POLICY "Users can view all chats" 
    ON public.chats
    FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Users can view all messages" ON public.chat_messages;
CREATE POLICY "Users can view all messages" 
    ON public.chat_messages
    FOR SELECT 
    USING (true);

-- Force a schema refresh
NOTIFY pgrst, 'reload schema';

-- IMPORTANT: Let users know this has been run
SELECT 'Table visibility fixed - schema detection should now work' AS result; 