-- Fix Table Naming Inconsistencies in Social Network Platform
-- This script resolves inconsistencies between 'groups/group_members' and 'chat_groups/chat_group_members'

-- First, let's ensure the chat tables exist with proper structure
CREATE TABLE IF NOT EXISTS public.chat_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_public BOOLEAN DEFAULT TRUE,
    is_private BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.chat_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_admin BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_group_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chat_group_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    theme TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_settings ENABLE ROW LEVEL SECURITY;

-- Drop conflicting policies to avoid infinite recursion
DO $$ 
BEGIN
    -- Drop policies from chat_group_members
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_group_members' AND schemaname = 'public') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to read chat_group_members" ON public.chat_group_members;
        DROP POLICY IF EXISTS "Allow group members to see other members" ON public.chat_group_members;
        DROP POLICY IF EXISTS "Allow group members to view other members" ON public.chat_group_members;
        DROP POLICY IF EXISTS "Allow members to select their own membership" ON public.chat_group_members;
        DROP POLICY IF EXISTS "Allow users to select own membership row" ON public.chat_group_members;
        DROP POLICY IF EXISTS "Users can view group members" ON public.chat_group_members;
    END IF;

    -- Drop policies from chat_groups
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_groups' AND schemaname = 'public') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to view groups" ON public.chat_groups;
        DROP POLICY IF EXISTS "Allow group creators to update their groups" ON public.chat_groups;
        DROP POLICY IF EXISTS "Allow users to create public groups" ON public.chat_groups;
    END IF;

    -- Drop policies from chat_messages
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND schemaname = 'public') THEN
        DROP POLICY IF EXISTS "Allow members to post messages to their groups" ON public.chat_messages;
        DROP POLICY IF EXISTS "Allow members to view their groups' messages" ON public.chat_messages;
        DROP POLICY IF EXISTS "Allow users to edit their own messages" ON public.chat_messages;
    END IF;
    
    -- Drop policies from chat_group_settings
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_group_settings' AND schemaname = 'public') THEN
        DROP POLICY IF EXISTS "Allow group members to view settings" ON public.chat_group_settings;
        DROP POLICY IF EXISTS "Allow group admins to update settings" ON public.chat_group_settings;
    END IF;
END $$;

-- Drop existing helper functions first with CASCADE to drop dependent objects
DROP FUNCTION IF EXISTS public.is_group_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_group_admin(uuid, uuid) CASCADE;

-- Define helper functions without recursive policies
CREATE OR REPLACE FUNCTION public.is_group_member(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY INVOKER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chat_group_members
        WHERE group_id = $1 AND user_id = $2
    );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY INVOKER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chat_group_members
        WHERE group_id = $1 AND user_id = $2 AND is_admin = true
    );
$$;

-- Create basic RLS policies for chat_group_members
CREATE POLICY "Allow users to select own membership row"
ON public.chat_group_members FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow members to view other members"
ON public.chat_group_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_group_members
        WHERE user_id = auth.uid() AND group_id = chat_group_members.group_id
    )
);

-- RLS for chat_groups
CREATE POLICY "Allow any authenticated user to view groups"
ON public.chat_groups FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS for chat_messages
CREATE POLICY "Allow members to read messages"
ON public.chat_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_group_members
        WHERE user_id = auth.uid() AND group_id = chat_messages.group_id
    )
);

CREATE POLICY "Allow members to insert messages"
ON public.chat_messages FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.chat_group_members
        WHERE user_id = auth.uid() AND group_id = chat_messages.group_id
    )
);

-- RLS for chat_group_settings
CREATE POLICY "Allow members to view settings"
ON public.chat_group_settings FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_group_members
        WHERE user_id = auth.uid() AND group_id = chat_group_settings.group_id
    )
);

CREATE POLICY "Allow admins to update settings"
ON public.chat_group_settings FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.chat_group_members
        WHERE user_id = auth.uid() AND group_id = chat_group_settings.group_id AND is_admin = true
    )
);

-- If you've been using groups/group_members tables before, migrate data
DO $$
DECLARE
    group_row RECORD;
    member_row RECORD;
    new_group_id UUID;
    first_profile_id UUID;
    creator_profile_id UUID;
BEGIN
    -- Try to get a valid profile ID to use as default for records with invalid created_by
    SELECT id INTO first_profile_id FROM public.profiles LIMIT 1;

    -- Check if old 'groups' table exists and has data
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'groups'
    ) THEN
        -- For each group in the old table
        FOR group_row IN SELECT * FROM public.groups LOOP
            -- Find a valid profile ID for the creator
            creator_profile_id := NULL;
            
            -- If created_by is not null, check if it exists in profiles
            IF group_row.created_by IS NOT NULL THEN
                SELECT id INTO creator_profile_id 
                FROM public.profiles 
                WHERE id = group_row.created_by;
            END IF;
            
            -- If no valid profile found, use the default one
            IF creator_profile_id IS NULL THEN
                creator_profile_id := first_profile_id;
            END IF;
            
            -- Skip groups if we can't find a valid profile ID
            IF creator_profile_id IS NOT NULL THEN
                -- Check if this group already exists in chat_groups
                IF NOT EXISTS (
                    SELECT 1 FROM public.chat_groups
                    WHERE name = group_row.name
                ) THEN
                    -- Insert into new table with safer field access
                    INSERT INTO public.chat_groups (
                        name, description, created_by, created_at, updated_at, is_public
                    ) VALUES (
                        group_row.name, 
                        COALESCE(group_row.description, ''), 
                        creator_profile_id,  -- Use valid profile ID
                        COALESCE(group_row.created_at, CURRENT_TIMESTAMP),
                        CURRENT_TIMESTAMP,
                        TRUE
                    )
                    RETURNING id INTO new_group_id;
                    
                    -- Migrate members if group_members table exists
                    IF EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = 'group_members'
                    ) THEN
                        FOR member_row IN 
                            SELECT * FROM public.group_members 
                            WHERE group_id = group_row.id
                        LOOP
                            -- Only insert if not already exists and user_id is valid
                            IF member_row.user_id IS NOT NULL AND NOT EXISTS (
                                SELECT 1 FROM public.chat_group_members
                                WHERE group_id = new_group_id AND user_id = member_row.user_id
                            ) THEN
                                INSERT INTO public.chat_group_members (
                                    group_id, user_id, is_admin, joined_at
                                ) VALUES (
                                    new_group_id,
                                    member_row.user_id,
                                    COALESCE(member_row.role, '') = 'admin',
                                    COALESCE(member_row.joined_at, CURRENT_TIMESTAMP)
                                );
                            END IF;
                        END LOOP;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END IF;
END $$;

-- Make sure the get_user_groups function is properly defined
-- Drop existing function if it doesn't match our schema
DROP FUNCTION IF EXISTS public.get_user_groups(uuid) CASCADE;

-- Create or replace the function
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
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.get_user_groups(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_groups(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_groups(uuid) TO service_role; 