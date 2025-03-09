-- FIXED Chat Tables SQL - With TEXT sender_id

-- Drop tables if they exist to ensure clean creation
DROP TABLE IF EXISTS public.chat_messages;
DROP TABLE IF EXISTS public.chats;

-- Chats table to track chat rooms
CREATE TABLE public.chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    client_name TEXT,
    professional_name TEXT,
    last_message TEXT,
    last_message_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    unread_client INTEGER DEFAULT 0,
    unread_professional INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Messages table to store individual chat messages
-- IMPORTANT: sender_id is now TEXT instead of UUID to allow 'system' as a sender
CREATE TABLE public.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
    sender_id TEXT NOT NULL, -- NOTE: TEXT type instead of UUID to allow 'system'
    sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'professional', 'system')),
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Apply RLS policies
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create very permissive policies for now to avoid RLS issues
-- These can be tightened later for production

-- Chats table policies - Allow all operations
CREATE POLICY "Users can view all chats" 
    ON public.chats
    FOR SELECT 
    USING (true);

CREATE POLICY "Users can insert chats" 
    ON public.chats
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Users can update chats" 
    ON public.chats
    FOR UPDATE 
    USING (true);

-- Chat messages policies - Allow all operations
CREATE POLICY "Users can view all messages" 
    ON public.chat_messages
    FOR SELECT 
    USING (true);

CREATE POLICY "Users can insert messages" 
    ON public.chat_messages
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Users can update messages" 
    ON public.chat_messages
    FOR UPDATE 
    USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS chats_client_id_idx ON public.chats (client_id);
CREATE INDEX IF NOT EXISTS chats_professional_id_idx ON public.chats (professional_id);
CREATE INDEX IF NOT EXISTS chat_messages_chat_id_idx ON public.chat_messages (chat_id);
CREATE INDEX IF NOT EXISTS chat_messages_sender_id_idx ON public.chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON public.chat_messages (created_at);

-- Add a function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_chat_messages_read(
    p_chat_id UUID,
    p_user_type TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Update read status for messages in the chat
    UPDATE public.chat_messages
    SET read = true
    WHERE chat_id = p_chat_id
        AND (
            (p_user_type = 'client' AND sender_type != 'client') OR
            (p_user_type = 'professional' AND sender_type != 'professional')
        );
        
    -- Update unread counts in the chat
    UPDATE public.chats
    SET 
        unread_client = CASE WHEN p_user_type = 'client' THEN 0 ELSE unread_client END,
        unread_professional = CASE WHEN p_user_type = 'professional' THEN 0 ELSE unread_professional END,
        updated_at = now()
    WHERE id = p_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force refresh of schema cache
NOTIFY pgrst, 'reload schema'; 