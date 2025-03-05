-- Create breath_sessions table to track breathing exercises
CREATE TABLE IF NOT EXISTS public.breath_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    exercise_name TEXT NOT NULL,
    duration_seconds INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    completed BOOLEAN DEFAULT true,
    pattern TEXT,  -- format: inhale-hold1-exhale-hold2
    notes TEXT
);

-- Create mood_entries table to track user mood
CREATE TABLE IF NOT EXISTS public.mood_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    value INT NOT NULL CHECK (value >= 0 AND value <= 4), -- mood rating from 0-4 (very low to great)
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT unique_user_daily_mood UNIQUE (user_id, date)
);

-- Add RLS (Row Level Security) policies for breath_sessions
ALTER TABLE public.breath_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own breath sessions
CREATE POLICY "Users can only see their own breath sessions" 
    ON public.breath_sessions
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own breath sessions" 
    ON public.breath_sessions
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own breath sessions" 
    ON public.breath_sessions
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own breath sessions" 
    ON public.breath_sessions
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Add RLS (Row Level Security) policies for mood_entries
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own mood entries
CREATE POLICY "Users can only see their own mood entries" 
    ON public.mood_entries
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mood entries" 
    ON public.mood_entries
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood entries" 
    ON public.mood_entries
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mood entries" 
    ON public.mood_entries
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS breath_sessions_user_id_idx ON public.breath_sessions (user_id);
CREATE INDEX IF NOT EXISTS breath_sessions_created_at_idx ON public.breath_sessions (created_at);
CREATE INDEX IF NOT EXISTS mood_entries_user_id_idx ON public.mood_entries (user_id);
CREATE INDEX IF NOT EXISTS mood_entries_created_at_idx ON public.mood_entries (created_at);
CREATE INDEX IF NOT EXISTS mood_entries_date_idx ON public.mood_entries (date);
