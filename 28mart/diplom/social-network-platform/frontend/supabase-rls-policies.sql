-- Supabase Row Level Security (RLS) Policies
-- Run these commands in the Supabase SQL Editor to fix permission issues

-- Make sure Row Level Security is enabled for all tables
ALTER TABLE IF EXISTS "posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "saved_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "group_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "event_attendees" ENABLE ROW LEVEL SECURITY;

-- Helper function to check if a policy exists
CREATE OR REPLACE FUNCTION policy_exists(policy_name text, table_name text) RETURNS boolean AS $$
DECLARE
  exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = policy_name 
    AND tablename = table_name
  ) INTO exists;
  RETURN exists;
END;
$$ LANGUAGE plpgsql;

-- POSTS TABLE POLICIES --

-- Allow users to view all posts
DO $$ 
BEGIN
  IF NOT policy_exists('Anyone can view all posts', 'posts') THEN
    CREATE POLICY "Anyone can view all posts"
    ON "posts"
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Allow users to create their own posts
DO $$ 
BEGIN
  IF NOT policy_exists('Users can create their own posts', 'posts') THEN
    CREATE POLICY "Users can create their own posts"
    ON "posts"
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Allow users to update only their own posts
DO $$ 
BEGIN
  IF NOT policy_exists('Users can update their own posts', 'posts') THEN
    CREATE POLICY "Users can update their own posts"
    ON "posts"
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Allow users to delete only their own posts
DO $$ 
BEGIN
  IF NOT policy_exists('Users can delete their own posts', 'posts') THEN
    CREATE POLICY "Users can delete their own posts"
    ON "posts"
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- PROFILES TABLE POLICIES --

-- Allow users to view all profiles
DO $$ 
BEGIN
  IF NOT policy_exists('Anyone can view profiles', 'profiles') THEN
    CREATE POLICY "Anyone can view profiles"
    ON "profiles"
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Allow users to update only their own profile
DO $$ 
BEGIN
  IF NOT policy_exists('Users can update their own profile', 'profiles') THEN
    CREATE POLICY "Users can update their own profile"
    ON "profiles"
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Allow users to create their own profile
DO $$ 
BEGIN
  IF NOT policy_exists('Users can create their own profile', 'profiles') THEN
    CREATE POLICY "Users can create their own profile"
    ON "profiles"
    FOR INSERT
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- SAVED ITEMS TABLE POLICIES --

-- Allow users to view only their own saved items
DO $$ 
BEGIN
  IF NOT policy_exists('Users can view their own saved items', 'saved_items') THEN
    CREATE POLICY "Users can view their own saved items"
    ON "saved_items"
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Allow users to add items to their saved items
DO $$ 
BEGIN
  IF NOT policy_exists('Users can save items', 'saved_items') THEN
    CREATE POLICY "Users can save items"
    ON "saved_items"
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Allow users to delete only their own saved items
DO $$ 
BEGIN
  IF NOT policy_exists('Users can delete their own saved items', 'saved_items') THEN
    CREATE POLICY "Users can delete their own saved items"
    ON "saved_items"
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- GROUPS TABLE POLICIES --

-- Allow all users to view groups
DO $$ 
BEGIN
  IF NOT policy_exists('Anyone can view groups', 'groups') THEN
    CREATE POLICY "Anyone can view groups"
    ON "groups"
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Allow authenticated users to create groups
DO $$ 
BEGIN
  IF NOT policy_exists('Authenticated users can create groups', 'groups') THEN
    CREATE POLICY "Authenticated users can create groups"
    ON "groups"
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Allow authenticated users to update groups
DO $$ 
BEGIN
  IF NOT policy_exists('Authenticated users can update groups', 'groups') THEN
    CREATE POLICY "Authenticated users can update groups"
    ON "groups"
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Allow authenticated users to delete groups
DO $$ 
BEGIN
  IF NOT policy_exists('Authenticated users can delete groups', 'groups') THEN
    CREATE POLICY "Authenticated users can delete groups"
    ON "groups"
    FOR DELETE
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- GROUP MEMBERS TABLE POLICIES --

-- Allow users to view group members
DO $$ 
BEGIN
  IF NOT policy_exists('Anyone can view group members', 'group_members') THEN
    CREATE POLICY "Anyone can view group members"
    ON "group_members"
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Allow users to join groups (add themselves as members)
DO $$ 
BEGIN
  IF NOT policy_exists('Users can join groups', 'group_members') THEN
    CREATE POLICY "Users can join groups"
    ON "group_members"
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Allow users to leave groups (remove themselves)
DO $$ 
BEGIN
  IF NOT policy_exists('Users can leave groups', 'group_members') THEN
    CREATE POLICY "Users can leave groups"
    ON "group_members"
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- EVENTS TABLE POLICIES --

-- Allow users to view all events
DO $$ 
BEGIN
  IF NOT policy_exists('Anyone can view all events', 'events') THEN
    CREATE POLICY "Anyone can view all events"
    ON "events"
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Allow authenticated users to create events
DO $$ 
BEGIN
  IF NOT policy_exists('Authenticated users can create events', 'events') THEN
    CREATE POLICY "Authenticated users can create events"
    ON "events"
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Allow authenticated users to update events
DO $$ 
BEGIN
  IF NOT policy_exists('Authenticated users can update events', 'events') THEN
    CREATE POLICY "Authenticated users can update events"
    ON "events"
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Allow authenticated users to delete events
DO $$ 
BEGIN
  IF NOT policy_exists('Authenticated users can delete events', 'events') THEN
    CREATE POLICY "Authenticated users can delete events"
    ON "events"
    FOR DELETE
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- EVENT ATTENDEES TABLE POLICIES --

-- Allow users to view event attendees
DO $$ 
BEGIN
  IF NOT policy_exists('Anyone can view event attendees', 'event_attendees') THEN
    CREATE POLICY "Anyone can view event attendees"
    ON "event_attendees"
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Allow users to attend events (add themselves as attendees)
DO $$ 
BEGIN
  IF NOT policy_exists('Users can attend events', 'event_attendees') THEN
    CREATE POLICY "Users can attend events"
    ON "event_attendees"
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Allow users to leave events (remove themselves)
DO $$ 
BEGIN
  IF NOT policy_exists('Users can leave events', 'event_attendees') THEN
    CREATE POLICY "Users can leave events"
    ON "event_attendees"
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$; 