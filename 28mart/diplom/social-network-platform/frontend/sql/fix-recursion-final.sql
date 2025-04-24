-- Final fix for infinite recursion in chat_group_members policies
-- This script takes a more direct approach with simpler policies and no circular references

-- First, drop ALL existing policies for the chat tables
DO $$ 
BEGIN
    -- Drop all policies from chat_group_members
    DROP POLICY IF EXISTS "Allow authenticated users to read chat_group_members" ON public.chat_group_members;
    DROP POLICY IF EXISTS "Allow group members to see other members" ON public.chat_group_members;
    DROP POLICY IF EXISTS "Allow group members to view other members" ON public.chat_group_members;
    DROP POLICY IF EXISTS "Allow members to select their own membership" ON public.chat_group_members;
    DROP POLICY IF EXISTS "Allow users to select own membership row" ON public.chat_group_members;
    DROP POLICY IF EXISTS "Users can view group members" ON public.chat_group_members;
    
    -- Drop all policies from chat_groups
    DROP POLICY IF EXISTS "Allow authenticated users to view groups" ON public.chat_groups;
    DROP POLICY IF EXISTS "Allow group creators to update their groups" ON public.chat_groups;
    DROP POLICY IF EXISTS "Allow users to create public groups" ON public.chat_groups;
    DROP POLICY IF EXISTS "Allow any authenticated user to view groups" ON public.chat_groups;
    
    -- Drop all policies from chat_messages
    DROP POLICY IF EXISTS "Allow members to post messages to their groups" ON public.chat_messages;
    DROP POLICY IF EXISTS "Allow members to view their groups' messages" ON public.chat_messages;
    DROP POLICY IF EXISTS "Allow users to edit their own messages" ON public.chat_messages;
    DROP POLICY IF EXISTS "Allow members to read messages" ON public.chat_messages;
    DROP POLICY IF EXISTS "Allow members to insert messages" ON public.chat_messages;
    
    -- Drop all policies from chat_group_settings
    DROP POLICY IF EXISTS "Allow group members to view settings" ON public.chat_group_settings;
    DROP POLICY IF EXISTS "Allow group admins to update settings" ON public.chat_group_settings;
    DROP POLICY IF EXISTS "Allow members to view settings" ON public.chat_group_settings;
    DROP POLICY IF EXISTS "Allow admins to update settings" ON public.chat_group_settings;
END $$;

-- Drop the helper functions if they exist
DROP FUNCTION IF EXISTS public.is_group_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_group_admin(uuid, uuid) CASCADE;

-- Create simple, direct RLS policies without function calls or nested EXISTS queries

-- 1. Policies for chat_groups - Simple and direct
CREATE POLICY "Anyone can view groups"
ON public.chat_groups FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create groups"
ON public.chat_groups FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Group creator can update group"
ON public.chat_groups FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Group creator can delete group"
ON public.chat_groups FOR DELETE
USING (auth.uid() = created_by);

-- 2. Policies for chat_group_members - Critical to avoid recursion

-- Policy to see your own membership - no recursion possible
CREATE POLICY "See own membership" 
ON public.chat_group_members FOR SELECT
USING (auth.uid() = user_id);

-- Policy to see members of groups you're a member of - direct join, no recursion
CREATE POLICY "See all members in my groups" 
ON public.chat_group_members FOR SELECT
USING (
    group_id IN (
        SELECT group_id 
        FROM public.chat_group_members 
        WHERE user_id = auth.uid()
    )
);

-- Policy to join groups
CREATE POLICY "Join groups" 
ON public.chat_group_members FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND (
        -- Can join public groups
        EXISTS (
            SELECT 1 FROM public.chat_groups
            WHERE id = group_id AND is_public = true
        )
        OR
        -- Group creator can add members
        EXISTS (
            SELECT 1 FROM public.chat_groups
            WHERE id = group_id AND created_by = auth.uid()
        )
    )
);

-- Policy to leave groups
CREATE POLICY "Leave groups"
ON public.chat_group_members FOR DELETE
USING (auth.uid() = user_id);

-- Admin can remove members
CREATE POLICY "Admin can remove members"
ON public.chat_group_members FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.chat_group_members
        WHERE group_id = public.chat_group_members.group_id
        AND user_id = auth.uid()
        AND is_admin = true
    )
);

-- 3. Policies for chat_messages - Keep it simple
CREATE POLICY "View group messages"
ON public.chat_messages FOR SELECT
USING (
    group_id IN (
        SELECT group_id
        FROM public.chat_group_members
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Send messages to your groups"
ON public.chat_messages FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    group_id IN (
        SELECT group_id
        FROM public.chat_group_members
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Edit own messages"
ON public.chat_messages FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Delete own messages"
ON public.chat_messages FOR DELETE
USING (auth.uid() = user_id);

-- Create a non-recursive version of helper functions 
-- Only used by application code, not by policies
CREATE OR REPLACE FUNCTION public.is_group_member(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chat_group_members
        WHERE group_id = $1 AND user_id = $2
    );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chat_group_members
        WHERE group_id = $1 AND user_id = $2 AND is_admin = true
    );
$$;

-- Make sure the get_user_groups function is properly defined
DROP FUNCTION IF EXISTS public.get_user_groups(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_groups(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    created_at timestamptz,
    name text,
    description text,
    created_by uuid,
    creator_full_name text,
    creator_avatar_url text,
    avatar_url text,
    is_public boolean,
    is_private boolean,
    member_count bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
      cg.id,
      cg.created_at,
      cg.name,
      cg.description,
      cg.created_by,
      p.full_name as creator_full_name,
      p.avatar_url as creator_avatar_url,
      cg.avatar_url,
      cg.is_public,
      cg.is_private,
      (SELECT count(*) FROM public.chat_group_members cgm_count WHERE cgm_count.group_id = cg.id) as member_count
  FROM
      public.chat_groups cg
  JOIN
      public.chat_group_members cgm ON cg.id = cgm.group_id
  LEFT JOIN
      public.profiles p ON cg.created_by = p.id
  WHERE
      cgm.user_id = p_user_id;
$$;

-- Grant access to the functions
GRANT EXECUTE ON FUNCTION public.get_user_groups(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_groups(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_groups(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) TO service_role; 