-- Create chat tables for consultation messaging system

-- Chats table to track chat rooms
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    client_name TEXT,
    professional_name TEXT,
    last_message TEXT,
    last_message_time TIMESTAMP WITH TIME ZONE,
    unread_client INTEGER DEFAULT 0,
    unread_professional INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Messages table to store individual chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID NOT NULL, -- can be client_id, professional_id, or 'system'
    sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'professional', 'system')),
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Apply RLS policies
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chats table policies
CREATE POLICY "Clients can view their own chats" 
    ON public.chats
    FOR SELECT 
    USING (auth.uid() = client_id);

CREATE POLICY "Professionals can view their chats" 
    ON public.chats
    FOR SELECT 
    USING (auth.uid() = professional_id);

CREATE POLICY "Anyone can insert a chat they're part of" 
    ON public.chats
    FOR INSERT 
    WITH CHECK ((auth.uid() = client_id) OR (auth.uid() = professional_id));

CREATE POLICY "Anyone can update a chat they're part of" 
    ON public.chats
    FOR UPDATE 
    USING ((auth.uid() = client_id) OR (auth.uid() = professional_id));

-- Chat messages policies
CREATE POLICY "Clients can view messages in their chats" 
    ON public.chat_messages
    FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.chats 
        WHERE chats.id = chat_messages.chat_id 
        AND chats.client_id = auth.uid()
    ));

CREATE POLICY "Professionals can view messages in their chats" 
    ON public.chat_messages
    FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.chats 
        WHERE chats.id = chat_messages.chat_id 
        AND chats.professional_id = auth.uid()
    ));

CREATE POLICY "Anyone can insert messages in chats they're part of" 
    ON public.chat_messages
    FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.chats 
        WHERE chats.id = chat_messages.chat_id 
        AND (chats.client_id = auth.uid() OR chats.professional_id = auth.uid())
    ));

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