-- FIXED version that adapts to your existing profiles table schema

-- Create a function to check if a column exists in a table
CREATE OR REPLACE FUNCTION column_exists(tbl text, col text) RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = col
    );
END;
$$ LANGUAGE plpgsql;

-- Create a function that will be triggered when a new user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    query text;
    columns text := 'id';
    values text := 'NEW.id';
    has_created_at boolean;
    has_updated_at boolean;
    has_name boolean;
    has_username boolean;
    has_is_doctor boolean;
BEGIN
    -- Check which columns exist in profiles table
    has_created_at := column_exists('profiles', 'created_at');
    has_updated_at := column_exists('profiles', 'updated_at');
    has_name := column_exists('profiles', 'name');
    has_username := column_exists('profiles', 'username');
    has_is_doctor := column_exists('profiles', 'is_doctor');
    
    -- Build dynamic query based on existing columns
    IF has_name THEN
        columns := columns || ', name';
        values := values || ', COALESCE(NEW.raw_user_meta_data->>''name'', NEW.raw_user_meta_data->>''full_name'', ''New User'')';
    END IF;
    
    IF has_username THEN
        columns := columns || ', username';
        values := values || ', COALESCE(NEW.raw_user_meta_data->>''preferred_username'', NEW.email)';
    END IF;
    
    IF has_is_doctor THEN
        columns := columns || ', is_doctor';
        values := values || ', false';
    END IF;
    
    IF has_created_at THEN
        columns := columns || ', created_at';
        values := values || ', NOW()';
    END IF;
    
    IF has_updated_at THEN
        columns := columns || ', updated_at';
        values := values || ', NOW()';
    END IF;
    
    -- Construct and execute the dynamic INSERT query
    query := 'INSERT INTO public.profiles (' || columns || ') VALUES (' || values || ')';
    EXECUTE query;
    
    -- Try to create a coin wallet for the user (starting with 100 coins)
    BEGIN
        INSERT INTO public.user_coins (user_id, coins, created_at, updated_at)
        VALUES (NEW.id, 100, NOW(), NOW());
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

-- Create a function to handle existing users without profiles - more schema flexible
CREATE OR REPLACE FUNCTION public.create_missing_profiles()
RETURNS TEXT AS $$
DECLARE
    users_count INTEGER := 0;
    profiles_created INTEGER := 0;
    user_record RECORD;
    query text;
    columns text;
    values text;
    has_created_at boolean;
    has_updated_at boolean;
    has_name boolean;
    has_username boolean;
    has_is_doctor boolean;
BEGIN
    -- Check which columns exist in profiles table
    has_created_at := column_exists('profiles', 'created_at');
    has_updated_at := column_exists('profiles', 'updated_at');
    has_name := column_exists('profiles', 'name');
    has_username := column_exists('profiles', 'username');
    has_is_doctor := column_exists('profiles', 'is_doctor');
    
    -- Loop through existing auth users
    FOR user_record IN 
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.profiles p ON p.id = au.id
        WHERE p.id IS NULL
    LOOP
        users_count := users_count + 1;
        
        -- Reset query components for each user
        columns := 'id';
        values := quote_literal(user_record.id);
        
        -- Build dynamic query based on existing columns
        IF has_name THEN
            columns := columns || ', name';
            values := values || ', ' || quote_literal(COALESCE(user_record.raw_user_meta_data->>'name', user_record.raw_user_meta_data->>'full_name', 'New User'));
        END IF;
        
        IF has_username THEN
            columns := columns || ', username';
            values := values || ', ' || quote_literal(COALESCE(user_record.raw_user_meta_data->>'preferred_username', user_record.email));
        END IF;
        
        IF has_is_doctor THEN
            columns := columns || ', is_doctor';
            values := values || ', false';
        END IF;
        
        IF has_created_at THEN
            columns := columns || ', created_at';
            values := values || ', NOW()';
        END IF;
        
        IF has_updated_at THEN
            columns := columns || ', updated_at';
            values := values || ', NOW()';
        END IF;
        
        -- Construct and execute the dynamic INSERT query
        query := 'INSERT INTO public.profiles (' || columns || ') VALUES (' || values || ')';
        EXECUTE query;
        
        -- Try to create a coin wallet if the table exists
        BEGIN
            INSERT INTO public.user_coins (user_id, coins, created_at, updated_at)
            VALUES (user_record.id, 100, NOW(), NOW());
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