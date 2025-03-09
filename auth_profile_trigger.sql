-- Create a trigger to automatically create a profile when a new user is created in Auth

-- First, ensure the profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    username TEXT UNIQUE,
    bio TEXT,
    is_doctor BOOLEAN DEFAULT false,
    profile_pic_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create a function that will be triggered when a new user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a new profile for the user
    INSERT INTO public.profiles (id, name, username, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'New User'),
        COALESCE(NEW.raw_user_meta_data->>'preferred_username', NEW.email),
        NEW.created_at,
        NEW.created_at
    );
    
    -- Create a coin wallet for the user (starting with 100 coins)
    BEGIN
        INSERT INTO public.user_coins (user_id, coins, created_at, updated_at)
        VALUES (NEW.id, 100, NEW.created_at, NEW.created_at);
    EXCEPTION
        WHEN OTHERS THEN
            -- If user_coins table doesn't exist yet, we'll just ignore this
            NULL;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Create a function to handle existing users without profiles
CREATE OR REPLACE FUNCTION public.create_missing_profiles()
RETURNS TEXT AS $$
DECLARE
    users_count INTEGER := 0;
    profiles_created INTEGER := 0;
    user_record RECORD;
BEGIN
    -- Loop through existing auth users
    FOR user_record IN 
        SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
        FROM auth.users au
        LEFT JOIN public.profiles p ON p.id = au.id
        WHERE p.id IS NULL
    LOOP
        users_count := users_count + 1;
        
        -- Create profile for this user
        INSERT INTO public.profiles (
            id, 
            name, 
            username, 
            created_at, 
            updated_at
        )
        VALUES (
            user_record.id,
            COALESCE(user_record.raw_user_meta_data->>'name', user_record.raw_user_meta_data->>'full_name', 'New User'),
            COALESCE(user_record.raw_user_meta_data->>'preferred_username', user_record.email),
            user_record.created_at,
            now()
        );
        
        -- Try to create a coin wallet if the table exists
        BEGIN
            INSERT INTO public.user_coins (user_id, coins, created_at, updated_at)
            VALUES (user_record.id, 100, user_record.created_at, now());
        EXCEPTION
            WHEN OTHERS THEN
                -- If user_coins table doesn't exist, we'll just continue
                NULL;
        END;
        
        profiles_created := profiles_created + 1;
    END LOOP;
    
    RETURN 'Processed ' || users_count || ' users missing profiles. Created ' || profiles_created || ' new profiles.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to create profiles for existing users without them
SELECT public.create_missing_profiles(); 