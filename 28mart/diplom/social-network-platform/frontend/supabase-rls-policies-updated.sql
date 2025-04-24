-- Supabase Row Level Security (RLS) Policies
-- This script sets up RLS policies for the social network platform

-- Helper function to check if a policy exists before creating it
CREATE OR REPLACE FUNCTION policy_exists(policy_name text, table_name text) RETURNS boolean AS $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE policyname = policy_name 
  AND tablename = table_name;
  
  RETURN policy_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check if a table exists
CREATE OR REPLACE FUNCTION table_exists(table_name text) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = $1
  );
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on all tables
DO $$ 
DECLARE
  table_names text[] := ARRAY['posts', 'profiles', 'saved_items', 'groups', 'group_members', 
                             'events', 'event_attendees', 'comments', 'likes', 
                             'user_relationships', 'notifications'];
  t text;
BEGIN
  FOREACH t IN ARRAY table_names
  LOOP
    IF table_exists(t) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
      RAISE NOTICE 'Enabled RLS on %', t;
    ELSE
      RAISE NOTICE 'Table % does not exist, skipping', t;
    END IF;
  END LOOP;
END $$;

-- Posts Policies
DO $$ 
BEGIN
  IF table_exists('posts') THEN
    -- Allow users to read any post (public)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone_can_view_posts' AND tablename = 'posts') THEN
      CREATE POLICY anyone_can_view_posts ON posts FOR SELECT USING (true);
    END IF;
    
    -- Only authenticated users can insert posts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_users_can_create_posts' AND tablename = 'posts') THEN
      CREATE POLICY authenticated_users_can_create_posts ON posts 
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    -- Users can only update their own posts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_update_own_posts' AND tablename = 'posts') THEN
      CREATE POLICY users_can_update_own_posts ON posts 
      FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    -- Users can only delete their own posts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_delete_own_posts' AND tablename = 'posts') THEN
      CREATE POLICY users_can_delete_own_posts ON posts 
      FOR DELETE USING (auth.uid() = user_id);
    END IF;
  ELSE
    RAISE NOTICE 'Table posts does not exist, skipping policies';
  END IF;
END $$;

-- Profiles Policies
DO $$ 
BEGIN
  IF table_exists('profiles') THEN
    -- Anyone can view profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone_can_view_profiles' AND tablename = 'profiles') THEN
      CREATE POLICY anyone_can_view_profiles ON profiles FOR SELECT USING (true);
    END IF;
    
    -- Users can insert their own profile
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_create_own_profile' AND tablename = 'profiles') THEN
      CREATE POLICY users_can_create_own_profile ON profiles 
      FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
    
    -- Users can only update their own profile
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_update_own_profile' AND tablename = 'profiles') THEN
      CREATE POLICY users_can_update_own_profile ON profiles 
      FOR UPDATE USING (auth.uid() = id);
    END IF;
  ELSE
    RAISE NOTICE 'Table profiles does not exist, skipping policies';
  END IF;
END $$;

-- Saved Items Policies
DO $$ 
BEGIN
  IF table_exists('saved_items') THEN
    -- Users can view their own saved items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_view_own_saved_items' AND tablename = 'saved_items') THEN
      CREATE POLICY users_can_view_own_saved_items ON saved_items 
      FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    -- Users can insert their own saved items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_create_own_saved_items' AND tablename = 'saved_items') THEN
      CREATE POLICY users_can_create_own_saved_items ON saved_items 
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    -- Users can delete their own saved items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_delete_own_saved_items' AND tablename = 'saved_items') THEN
      CREATE POLICY users_can_delete_own_saved_items ON saved_items 
      FOR DELETE USING (auth.uid() = user_id);
    END IF;
  ELSE
    RAISE NOTICE 'Table saved_items does not exist, skipping policies';
  END IF;
END $$;

-- Groups Policies
DO $$ 
BEGIN
  IF table_exists('groups') THEN
    -- Anyone can view groups (no is_private check since the column doesn't exist)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone_can_view_groups' AND tablename = 'groups') THEN
      CREATE POLICY anyone_can_view_groups ON groups FOR SELECT USING (true);
    END IF;
    
    -- Authenticated users can create groups
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_users_can_create_groups' AND tablename = 'groups') THEN
      CREATE POLICY authenticated_users_can_create_groups ON groups 
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    
    -- Group members can update groups they're a member of with admin role
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'group_admins_can_update_groups' AND tablename = 'groups') THEN
      CREATE POLICY group_admins_can_update_groups ON groups 
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM group_members 
          WHERE group_members.group_id = groups.id 
          AND group_members.user_id = auth.uid() 
          AND group_members.role = 'admin'
        )
      );
    END IF;
    
    -- Group admins can delete groups
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'group_admins_can_delete_groups' AND tablename = 'groups') THEN
      CREATE POLICY group_admins_can_delete_groups ON groups 
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM group_members 
          WHERE group_members.group_id = groups.id 
          AND group_members.user_id = auth.uid() 
          AND group_members.role = 'admin'
        )
      );
    END IF;
  ELSE
    RAISE NOTICE 'Table groups does not exist, skipping policies';
  END IF;
END $$;

-- Group Members Policies
DO $$ 
BEGIN
  IF table_exists('group_members') THEN
    -- Anyone can view group members
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone_can_view_group_members' AND tablename = 'group_members') THEN
      CREATE POLICY anyone_can_view_group_members ON group_members FOR SELECT USING (true);
    END IF;
    
    -- Authenticated users can join groups (add themselves as members)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_join_groups' AND tablename = 'group_members') THEN
      CREATE POLICY users_can_join_groups ON group_members 
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    -- Group admins can manage members (update roles, etc.)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'group_admins_can_update_members' AND tablename = 'group_members') THEN
      CREATE POLICY group_admins_can_update_members ON group_members 
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM group_members AS gm
          WHERE gm.group_id = group_members.group_id 
          AND gm.user_id = auth.uid() 
          AND gm.role = 'admin'
        )
      );
    END IF;
    
    -- Users can leave groups (delete their own membership)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_leave_groups' AND tablename = 'group_members') THEN
      CREATE POLICY users_can_leave_groups ON group_members 
      FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    -- Group admins can remove members
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'group_admins_can_remove_members' AND tablename = 'group_members') THEN
      CREATE POLICY group_admins_can_remove_members ON group_members 
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM group_members AS gm
          WHERE gm.group_id = group_members.group_id 
          AND gm.user_id = auth.uid() 
          AND gm.role = 'admin'
        )
      );
    END IF;
  ELSE
    RAISE NOTICE 'Table group_members does not exist, skipping policies';
  END IF;
END $$;

-- Events Policies
DO $$ 
BEGIN
  IF table_exists('events') THEN
    -- Anyone can view events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone_can_view_events' AND tablename = 'events') THEN
      CREATE POLICY anyone_can_view_events ON events FOR SELECT USING (true);
    END IF;
    
    -- Authenticated users can create events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_users_can_create_events' AND tablename = 'events') THEN
      CREATE POLICY authenticated_users_can_create_events ON events 
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    
    -- Event creators can update their events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'creators_can_update_events' AND tablename = 'events') THEN
      CREATE POLICY creators_can_update_events ON events 
      FOR UPDATE USING (created_by = auth.uid());
    END IF;
    
    -- Event creators can delete their events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'creators_can_delete_events' AND tablename = 'events') THEN
      CREATE POLICY creators_can_delete_events ON events 
      FOR DELETE USING (created_by = auth.uid());
    END IF;
  ELSE
    RAISE NOTICE 'Table events does not exist, skipping policies';
  END IF;
END $$;

-- Event Attendees Policies
DO $$ 
BEGIN
  IF table_exists('event_attendees') THEN
    -- Anyone can view event attendees
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone_can_view_event_attendees' AND tablename = 'event_attendees') THEN
      CREATE POLICY anyone_can_view_event_attendees ON event_attendees FOR SELECT USING (true);
    END IF;
    
    -- Users can RSVP to events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_rsvp_to_events' AND tablename = 'event_attendees') THEN
      CREATE POLICY users_can_rsvp_to_events ON event_attendees 
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    -- Users can update their RSVP status
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_update_rsvp' AND tablename = 'event_attendees') THEN
      CREATE POLICY users_can_update_rsvp ON event_attendees 
      FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    -- Users can cancel attendance
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_cancel_attendance' AND tablename = 'event_attendees') THEN
      CREATE POLICY users_can_cancel_attendance ON event_attendees 
      FOR DELETE USING (auth.uid() = user_id);
    END IF;
  ELSE
    RAISE NOTICE 'Table event_attendees does not exist, skipping policies';
  END IF;
END $$;

-- Comments Policies
DO $$ 
BEGIN
  IF table_exists('comments') THEN
    -- Anyone can view comments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone_can_view_comments' AND tablename = 'comments') THEN
      CREATE POLICY anyone_can_view_comments ON comments FOR SELECT USING (true);
    END IF;
    
    -- Authenticated users can create comments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_users_can_create_comments' AND tablename = 'comments') THEN
      CREATE POLICY authenticated_users_can_create_comments ON comments 
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    -- Users can update their own comments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_update_own_comments' AND tablename = 'comments') THEN
      CREATE POLICY users_can_update_own_comments ON comments 
      FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    -- Users can delete their own comments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_delete_own_comments' AND tablename = 'comments') THEN
      CREATE POLICY users_can_delete_own_comments ON comments 
      FOR DELETE USING (auth.uid() = user_id);
    END IF;
  ELSE
    RAISE NOTICE 'Table comments does not exist, skipping policies';
  END IF;
END $$;

-- Likes Policies
DO $$ 
BEGIN
  IF table_exists('likes') THEN
    -- Anyone can view likes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone_can_view_likes' AND tablename = 'likes') THEN
      CREATE POLICY anyone_can_view_likes ON likes FOR SELECT USING (true);
    END IF;
    
    -- Authenticated users can create likes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_users_can_create_likes' AND tablename = 'likes') THEN
      CREATE POLICY authenticated_users_can_create_likes ON likes 
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    -- Users can remove their own likes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_remove_own_likes' AND tablename = 'likes') THEN
      CREATE POLICY users_can_remove_own_likes ON likes 
      FOR DELETE USING (auth.uid() = user_id);
    END IF;
  ELSE
    RAISE NOTICE 'Table likes does not exist, skipping policies';
  END IF;
END $$;

-- User Relationships Policies
DO $$ 
BEGIN
  IF table_exists('user_relationships') THEN
    -- Users can view relationships they're part of
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_view_own_relationships' AND tablename = 'user_relationships') THEN
      CREATE POLICY users_can_view_own_relationships ON user_relationships 
      FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
    END IF;
    
    -- Authenticated users can create relationship requests
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_send_relationship_requests' AND tablename = 'user_relationships') THEN
      CREATE POLICY users_can_send_relationship_requests ON user_relationships 
      FOR INSERT WITH CHECK (auth.uid() = requester_id);
    END IF;
    
    -- Users can update relationships they're part of
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_update_own_relationships' AND tablename = 'user_relationships') THEN
      CREATE POLICY users_can_update_own_relationships ON user_relationships 
      FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
    END IF;
    
    -- Users can delete relationships they're part of
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_delete_own_relationships' AND tablename = 'user_relationships') THEN
      CREATE POLICY users_can_delete_own_relationships ON user_relationships 
      FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
    END IF;
  ELSE
    RAISE NOTICE 'Table user_relationships does not exist, skipping policies';
  END IF;
END $$;

-- Notifications Policies
DO $$ 
BEGIN
  IF table_exists('notifications') THEN
    -- Users can view their own notifications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_view_own_notifications' AND tablename = 'notifications') THEN
      CREATE POLICY users_can_view_own_notifications ON notifications 
      FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    -- Users can mark their notifications as read
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_update_own_notifications' AND tablename = 'notifications') THEN
      CREATE POLICY users_can_update_own_notifications ON notifications 
      FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    -- Users can delete their own notifications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_delete_own_notifications' AND tablename = 'notifications') THEN
      CREATE POLICY users_can_delete_own_notifications ON notifications 
      FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    -- System can create notifications for any user
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'system_can_create_notifications' AND tablename = 'notifications') THEN
      CREATE POLICY system_can_create_notifications ON notifications 
      FOR INSERT WITH CHECK (true);
    END IF;
  ELSE
    RAISE NOTICE 'Table notifications does not exist, skipping policies';
  END IF;
END $$; 