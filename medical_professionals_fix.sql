-- Fix for medical_professionals table and automatic creation when profiles are marked as doctors

-- DO NOT modify the existing profiles table structure, just add columns if needed
DO $$
BEGIN
    -- Check if the is_doctor column exists in the profiles table, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'is_doctor'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_doctor BOOLEAN DEFAULT false;
    END IF;
END
$$;

-- Create or update medical_professionals table
CREATE TABLE IF NOT EXISTS public.medical_professionals (
    id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    specialty TEXT CHECK (specialty IN ('psychiatrist', 'psychologist', 'therapist', 'counselor', 'general')) DEFAULT 'general',
    title TEXT DEFAULT 'Medical Professional',
    bio TEXT,
    experience_years INTEGER DEFAULT 0,
    consultation_fee INTEGER DEFAULT 15,
    verified BOOLEAN DEFAULT false,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Temporarily disable RLS on the medical_professionals table to fix data
ALTER TABLE IF EXISTS public.medical_professionals DISABLE ROW LEVEL SECURITY;

-- Create trigger function to automatically create medical_professionals entries
CREATE OR REPLACE FUNCTION public.handle_new_doctor()
RETURNS TRIGGER AS $$
BEGIN
    -- If a profile is marked as doctor (is_doctor = true)
    IF NEW.is_doctor = true THEN
        -- Check if there's already an entry in medical_professionals
        IF NOT EXISTS (SELECT 1 FROM public.medical_professionals WHERE id = NEW.id) THEN
            -- Determine title based on name to make it more realistic
            DECLARE
                doctor_title TEXT;
                doctor_bio TEXT;
                experience INTEGER;
                fee INTEGER;
            BEGIN
                -- Generate more realistic title based on name (check if it contains Mr./Ms./Mrs.)
                IF NEW.name ILIKE '%Mr.%' THEN
                    doctor_title := 'Dr. ' || NEW.name || ', MD';
                ELSIF NEW.name ILIKE '%Ms.%' OR NEW.name ILIKE '%Mrs.%' THEN
                    doctor_title := 'Dr. ' || NEW.name || ', MD';
                ELSE
                    doctor_title := 'Dr. ' || NEW.name || ', MD';
                END IF;
                
                -- Generate basic bio
                doctor_bio := 'Medical professional with expertise in general health and wellness. Committed to providing quality healthcare services.';
                
                -- Random experience years between 1 and 15
                experience := 1 + floor(random() * 15)::integer;
                
                -- Random consultation fee between 10 and 30 coins
                fee := 10 + floor(random() * 20)::integer;
                
                -- Create the entry
                INSERT INTO public.medical_professionals (
                    id, 
                    specialty, 
                    title, 
                    bio,
                    experience_years,
                    consultation_fee,
                    verified,
                    available
                ) VALUES (
                    NEW.id, 
                    'general',
                    doctor_title,
                    doctor_bio,
                    experience,
                    fee,
                    true,
                    true
                );
            END;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS profile_doctor_insert_trigger ON public.profiles;
DROP TRIGGER IF EXISTS profile_doctor_update_trigger ON public.profiles;

-- Create triggers for both INSERT and UPDATE operations
CREATE TRIGGER profile_doctor_insert_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_doctor();

CREATE TRIGGER profile_doctor_update_trigger
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (OLD.is_doctor IS DISTINCT FROM NEW.is_doctor)
EXECUTE FUNCTION public.handle_new_doctor();

-- Insert medical professional entries for existing doctor profiles that don't have entries
INSERT INTO public.medical_professionals (
    id, 
    specialty, 
    title, 
    bio,
    experience_years,
    consultation_fee,
    verified,
    available
)
SELECT 
    p.id,
    'general',
    CASE 
        WHEN p.name ILIKE '%Mr.%' THEN 'Dr. ' || p.name || ', MD'
        WHEN p.name ILIKE '%Ms.%' OR p.name ILIKE '%Mrs.%' THEN 'Dr. ' || p.name || ', MD'
        ELSE 'Dr. ' || p.name || ', MD'
    END,
    'Medical professional with expertise in general health and wellness. Committed to providing quality healthcare services.',
    1 + floor(random() * 15)::integer,
    10 + floor(random() * 20)::integer,
    true,
    true
FROM 
    public.profiles p
WHERE 
    p.is_doctor = true
    AND NOT EXISTS (
        SELECT 1 FROM public.medical_professionals mp WHERE mp.id = p.id
    );

-- Enable RLS on medical_professionals table
ALTER TABLE public.medical_professionals ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view all medical professionals" ON public.medical_professionals;
DROP POLICY IF EXISTS "Users can insert their own medical professional data" ON public.medical_professionals;
DROP POLICY IF EXISTS "Users can update their own medical professional data" ON public.medical_professionals;
DROP POLICY IF EXISTS "Users can delete their own medical professional data" ON public.medical_professionals;

-- Create more permissive policies
CREATE POLICY "Users can view all medical professionals" 
    ON public.medical_professionals
    FOR SELECT 
    USING (true);

CREATE POLICY "Users can insert their own medical professional data" 
    ON public.medical_professionals
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own medical professional data" 
    ON public.medical_professionals
    FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can delete their own medical professional data" 
    ON public.medical_professionals
    FOR DELETE 
    USING (auth.uid() = id); 