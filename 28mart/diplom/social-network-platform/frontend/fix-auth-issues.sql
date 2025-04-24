-- SQL Script to fix authentication session issues in Supabase
-- Copy and run this script in the Supabase SQL Editor

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.table_exists(text, text);
DROP FUNCTION IF EXISTS public.policy_exists(text, text);

-- Function to check if a table exists
CREATE OR REPLACE FUNCTION public.table_exists(p_schema_name text, p_table_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = p_schema_name
    AND table_name = p_table_name
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if a column exists in a table
CREATE OR REPLACE FUNCTION public.column_exists(schema_name text, table_name text, column_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = schema_name
    AND table_name = table_name
    AND column_name = column_name
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if a policy exists on a table
CREATE OR REPLACE FUNCTION public.policy_exists(p_table_name text, p_policy_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = p_table_name
    AND policyname = p_policy_name
  );
END;
$$ LANGUAGE plpgsql;

-- Clean expired sessions
DO $$
BEGIN
  IF public.table_exists('auth', 'sessions') THEN
    DELETE FROM auth.sessions WHERE expires_at < now();
    RAISE NOTICE 'Cleaned up expired sessions';
  ELSE
    RAISE NOTICE 'Auth sessions table not found - skipping cleanup';
  END IF;
END;
$$;

-- Enable RLS on all tables
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.tablename);
    RAISE NOTICE 'Enabled RLS on table: %', table_record.tablename;
  END LOOP;
END;
$$;

-- FIX FOR GROUP_MEMBERS TABLE AND RLS
DO $$
BEGIN
  IF public.table_exists('public', 'group_members') THEN
    -- Enable Row Level Security
    ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for inserting own memberships
    IF NOT public.policy_exists('group_members', 'allow_insert_own_membership') THEN
      CREATE POLICY allow_insert_own_membership ON public.group_members 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: allow_insert_own_membership';
    END IF;
    
    -- Create policy for selecting group members
    IF NOT public.policy_exists('group_members', 'allow_read_group_members') THEN
      CREATE POLICY allow_read_group_members ON public.group_members 
        FOR SELECT 
        USING (true);
      RAISE NOTICE 'Created policy: allow_read_group_members';
    END IF;
    
    -- Create policy for updating own membership
    IF NOT public.policy_exists('group_members', 'allow_update_own_membership') THEN
      CREATE POLICY allow_update_own_membership ON public.group_members 
        FOR UPDATE 
        USING (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: allow_update_own_membership';
    END IF;
    
    -- Create policy for deleting own membership
    IF NOT public.policy_exists('group_members', 'allow_delete_own_membership') THEN
      CREATE POLICY allow_delete_own_membership ON public.group_members 
        FOR DELETE 
        USING (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: allow_delete_own_membership';
    END IF;
    
    -- Grant permissions
    GRANT ALL ON public.group_members TO authenticated;
    
    RAISE NOTICE 'Fixed group_members table and RLS policies';
  ELSE
    RAISE NOTICE 'group_members table does not exist';
  END IF;
END;
$$;

-- FIX FOR POSTS TABLE AND RLS
DO $$
BEGIN
  IF public.table_exists('public', 'posts') THEN
    -- Enable Row Level Security
    ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for reading posts
    IF NOT public.policy_exists('posts', 'allow_read_posts') THEN
      CREATE POLICY allow_read_posts ON public.posts 
        FOR SELECT 
        USING (true);
      RAISE NOTICE 'Created policy: allow_read_posts';
    END IF;
    
    -- Create policy for inserting own posts
    IF NOT public.policy_exists('posts', 'allow_insert_own_posts') THEN
      CREATE POLICY allow_insert_own_posts ON public.posts 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: allow_insert_own_posts';
    END IF;
    
    -- Create policy for updating own posts
    IF NOT public.policy_exists('posts', 'allow_update_own_posts') THEN
      CREATE POLICY allow_update_own_posts ON public.posts 
        FOR UPDATE 
        USING (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: allow_update_own_posts';
    END IF;
    
    -- Create policy for deleting own posts
    IF NOT public.policy_exists('posts', 'allow_delete_own_posts') THEN
      CREATE POLICY allow_delete_own_posts ON public.posts 
        FOR DELETE 
        USING (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: allow_delete_own_posts';
    END IF;
    
    -- Grant permissions
    GRANT ALL ON public.posts TO authenticated;
    
    RAISE NOTICE 'Fixed posts table and RLS policies';
  ELSE
    RAISE NOTICE 'posts table does not exist';
  END IF;
END;
$$;

-- FIX FOR PROFILES TABLE RLS POLICIES
DO $$
BEGIN
  IF public.table_exists('public', 'profiles') THEN
    -- Enable Row Level Security
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for reading profiles
    IF NOT public.policy_exists('profiles', 'allow_read_profiles') THEN
      CREATE POLICY allow_read_profiles ON public.profiles 
        FOR SELECT 
        USING (true);
      RAISE NOTICE 'Created policy: allow_read_profiles';
    END IF;
    
    -- Create policy for inserting own profile
    IF NOT public.policy_exists('profiles', 'allow_insert_own_profile') THEN
      CREATE POLICY allow_insert_own_profile ON public.profiles 
        FOR INSERT 
        WITH CHECK (auth.uid() = id);
      RAISE NOTICE 'Created policy: allow_insert_own_profile';
    END IF;
    
    -- Create policy for updating own profile
    IF NOT public.policy_exists('profiles', 'allow_update_own_profile') THEN
      CREATE POLICY allow_update_own_profile ON public.profiles 
        FOR UPDATE 
        USING (auth.uid() = id);
      RAISE NOTICE 'Created policy: allow_update_own_profile';
    END IF;
    
    -- Grant permissions
    GRANT ALL ON public.profiles TO authenticated;
    
    RAISE NOTICE 'Fixed profiles table and RLS policies';
  ELSE
    RAISE NOTICE 'profiles table does not exist';
  END IF;
END;
$$;

-- Create a profile sync function - separated from the trigger to avoid syntax issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Setup the trigger in a separate statement
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PRINT COMPLETED MESSAGE
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'AUTHENTICATION AND RLS POLICY FIXES COMPLETED';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '1. Cleaned up expired sessions';
  RAISE NOTICE '2. Row Level Security has been enabled on all tables';
  RAISE NOTICE '3. RLS policies have been added for key tables';
  RAISE NOTICE '4. Created automatic profile creation for new users';
  RAISE NOTICE '5. Granted appropriate permissions to authenticated users';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: You must manually set the JWT expiration time in your Supabase dashboard:';
  RAISE NOTICE '1. Go to Authentication > Settings > JWT Expiry';
  RAISE NOTICE '2. Set it to 604800 seconds (7 days)';
  RAISE NOTICE '3. Save the changes';
  RAISE NOTICE '==================================================';
END;
$$;
