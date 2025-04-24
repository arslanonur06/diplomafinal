-- SIMPLIFIED SQL SCRIPT TO FIX AUTHENTICATION ISSUES
-- Run this in your Supabase SQL Editor

-- PART 1: BASIC TABLE SETTINGS

-- Enable RLS on posts table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on group_members table
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Skip session cleanup - column structure varies between Supabase versions
-- DELETE FROM auth.sessions WHERE expires_at < now();

-- PART 2: RLS POLICIES FOR POSTS TABLE

-- Drop existing policies if they exist
DROP POLICY IF EXISTS allow_read_posts ON public.posts;
DROP POLICY IF EXISTS allow_insert_own_posts ON public.posts;
DROP POLICY IF EXISTS allow_update_own_posts ON public.posts;
DROP POLICY IF EXISTS allow_delete_own_posts ON public.posts;

-- Create new policies
CREATE POLICY allow_read_posts ON public.posts 
  FOR SELECT 
  USING (true);

CREATE POLICY allow_insert_own_posts ON public.posts 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY allow_update_own_posts ON public.posts 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY allow_delete_own_posts ON public.posts 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.posts TO authenticated;

-- PART 3: RLS POLICIES FOR GROUP_MEMBERS TABLE

-- Drop existing policies if they exist
DROP POLICY IF EXISTS allow_insert_own_membership ON public.group_members;
DROP POLICY IF EXISTS allow_read_group_members ON public.group_members;
DROP POLICY IF EXISTS allow_update_own_membership ON public.group_members;
DROP POLICY IF EXISTS allow_delete_own_membership ON public.group_members;

-- Create new policies
CREATE POLICY allow_insert_own_membership ON public.group_members 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY allow_read_group_members ON public.group_members 
  FOR SELECT 
  USING (true);

CREATE POLICY allow_update_own_membership ON public.group_members 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY allow_delete_own_membership ON public.group_members 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.group_members TO authenticated;

-- PART 4: RLS POLICIES FOR PROFILES TABLE

-- Drop existing policies if they exist
DROP POLICY IF EXISTS allow_read_profiles ON public.profiles;
DROP POLICY IF EXISTS allow_insert_own_profile ON public.profiles;
DROP POLICY IF EXISTS allow_update_own_profile ON public.profiles;

-- Create new policies
CREATE POLICY allow_read_profiles ON public.profiles 
  FOR SELECT 
  USING (true);

CREATE POLICY allow_insert_own_profile ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY allow_update_own_profile ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Grant permissions
GRANT ALL ON public.profiles TO authenticated;

-- PART 5: CREATE PROFILE SYNC TRIGGER FUNCTION
-- This creates a profile record automatically when a user is created

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE FUNCTION public.handle_new_user()
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- REMINDER: For JWT expiration, manually set it in Supabase Dashboard:
-- Authentication > Settings > JWT Expiry > 604800 seconds (7 days) 