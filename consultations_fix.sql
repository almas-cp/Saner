-- Fix for consultations table and relationships

-- Check if consultations table exists and drop it if it does
DROP TABLE IF EXISTS public.consultations;

-- Create consultations table with proper relationships
CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    professional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'active', 'completed', 'cancelled')) NOT NULL DEFAULT 'pending',
    fee_paid INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    last_message TEXT,
    last_message_time TIMESTAMP WITH TIME ZONE,
    is_new BOOLEAN DEFAULT true
    
    -- We'll create the unique constraint as a partial index below instead
);

-- Create a unique partial index to prevent duplicate active/pending consultations
CREATE UNIQUE INDEX unique_active_consultation 
ON public.consultations (client_id, professional_id) 
WHERE (status = 'pending' OR status = 'active');

-- Enable RLS on consultations table
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- Policies for consultations table
-- Clients can view their own consultations
CREATE POLICY "Clients can view their own consultations" 
    ON public.consultations
    FOR SELECT 
    USING (auth.uid() = client_id);

-- Professionals can view consultations where they are the professional
CREATE POLICY "Professionals can view consultations they're involved in" 
    ON public.consultations
    FOR SELECT 
    USING (auth.uid() = professional_id);

-- Clients can create consultations
CREATE POLICY "Clients can create consultations" 
    ON public.consultations
    FOR INSERT 
    WITH CHECK (auth.uid() = client_id);

-- Professionals can update consultations (to accept/reject/complete them)
CREATE POLICY "Professionals can update consultations they're involved in" 
    ON public.consultations
    FOR UPDATE 
    USING (auth.uid() = professional_id);

-- Both clients and professionals can update consultations they're part of
CREATE POLICY "Clients can update consultations" 
    ON public.consultations
    FOR UPDATE 
    USING (auth.uid() = client_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS consultations_client_id_idx ON public.consultations (client_id);
CREATE INDEX IF NOT EXISTS consultations_professional_id_idx ON public.consultations (professional_id);
CREATE INDEX IF NOT EXISTS consultations_status_idx ON public.consultations (status);
CREATE INDEX IF NOT EXISTS consultations_created_at_idx ON public.consultations (created_at); 