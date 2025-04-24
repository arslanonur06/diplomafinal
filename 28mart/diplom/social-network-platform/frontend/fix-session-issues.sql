-- SQL Script to fix authentication session issues in Supabase
-- Copy and run this script in the Supabase SQL Editor

-- Function to check if a table exists
CREATE OR REPLACE FUNCTION public.table_exists(table_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = table_name
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if a column exists in a table
CREATE OR REPLACE FUNCTION public.column_exists(table_name text, column_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = table_name
    AND column_name = column_name
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if a policy exists on a table
CREATE OR REPLACE FUNCTION public.policy_exists(table_name text, policy_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = table_name
    AND policyname = policy_name
  );
END;
$$ LANGUAGE plpgsql;

-- ===== ENABLE RLS ON ALL TABLES =====
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

-- ===== FIX FOR SESSIONS/AUTHENTICATION =====
DO $$
BEGIN
  -- Create a new PKI key for JWT signing if needed
  INSERT INTO pgsodium.key (key_id, key_context, key_type, name, status, created_at)
  SELECT gen_random_uuid(), 'supabase_auth', 'aead-det', 'auth_jwt_key', 'valid', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM pgsodium.key WHERE key_context = 'supabase_auth' AND name = 'auth_jwt_key'
  );
  
  -- Ensure auth.users table has required indexes
  CREATE INDEX IF NOT EXISTS users_email_idx ON auth.users (email);
  CREATE INDEX IF NOT EXISTS users_instance_id_idx ON auth.users (instance_id);
  
  -- Ensure sessions cleanup
  DELETE FROM auth.sessions WHERE expires_at < now();
  
  RAISE NOTICE 'Authentication tables checked and fixed';
END;
$$;

-- ===== FIX FOR GROUP_MEMBERS TABLE AND RLS =====
DO $$
BEGIN
  IF public.table_exists('group_members') THEN
    -- Enable Row Level Security
    ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
    
    -- Clean up any orphaned records
    DELETE FROM public.group_members
    WHERE user_id NOT IN (SELECT id FROM auth.users);
    
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
    
    RAISE NOTICE 'Fixed group_members table and RLS policies';
  ELSE
    RAISE NOTICE 'group_members table does not exist';
  END IF;
END;
$$;

-- ===== FIX FOR POSTS TABLE AND RLS =====
DO $$
BEGIN
  IF public.table_exists('posts') THEN
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
    
    RAISE NOTICE 'Fixed posts table and RLS policies';
  ELSE
    RAISE NOTICE 'posts table does not exist';
  END IF;
END;
$$;

-- ===== FIX FOR EVENTS TABLE AND USER_ID COLUMN =====
DO $$
BEGIN
  IF public.table_exists('events') THEN
    -- Add user_id column if it doesn't exist
    IF NOT public.column_exists('events', 'user_id') THEN
      ALTER TABLE public.events ADD COLUMN user_id UUID REFERENCES auth.users(id);
      RAISE NOTICE 'Added user_id column to events table';
      
      -- If created_by column exists, copy values to user_id
      IF public.column_exists('events', 'created_by') THEN
        UPDATE public.events SET user_id = created_by WHERE user_id IS NULL;
        RAISE NOTICE 'Copied created_by values to user_id column';
      END IF;
    END IF;
    
    -- Enable Row Level Security
    ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for reading events
    IF NOT public.policy_exists('events', 'allow_read_events') THEN
      CREATE POLICY allow_read_events ON public.events 
        FOR SELECT 
        USING (true);
      RAISE NOTICE 'Created policy: allow_read_events';
    END IF;
    
    -- Create policy for inserting own events
    IF NOT public.policy_exists('events', 'allow_insert_own_events') THEN
      CREATE POLICY allow_insert_own_events ON public.events 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: allow_insert_own_events';
    END IF;
    
    -- Create policy for updating own events
    IF NOT public.policy_exists('events', 'allow_update_own_events') THEN
      CREATE POLICY allow_update_own_events ON public.events 
        FOR UPDATE 
        USING (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: allow_update_own_events';
    END IF;
    
    -- Create policy for deleting own events
    IF NOT public.policy_exists('events', 'allow_delete_own_events') THEN
      CREATE POLICY allow_delete_own_events ON public.events 
        FOR DELETE 
        USING (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: allow_delete_own_events';
    END IF;
    
    RAISE NOTICE 'Fixed events table and RLS policies';
  ELSE
    RAISE NOTICE 'events table does not exist';
  END IF;
END;
$$;

-- ===== REFRESH PROFILES TABLE RLS POLICIES =====
DO $$
BEGIN
  IF public.table_exists('profiles') THEN
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
    
    RAISE NOTICE 'Fixed profiles table and RLS policies';
  ELSE
    RAISE NOTICE 'profiles table does not exist';
  END IF;
END;
$$;

-- ===== PRINT COMPLETED MESSAGE =====
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'AUTHENTICATION AND RLS POLICY FIXES COMPLETED';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '1. Session authentication tables have been fixed';
  RAISE NOTICE '2. Row Level Security has been enabled on all tables';
  RAISE NOTICE '3. RLS policies have been added or updated for key tables';
  RAISE NOTICE '4. The events table now has a user_id column if needed';
  RAISE NOTICE '5. group_members table now has appropriate RLS policies';
  RAISE NOTICE '';
  RAISE NOTICE 'You should now be able to create posts and join groups';
  RAISE NOTICE 'without authentication session errors.';
  RAISE NOTICE '==================================================';
END;
$$;
