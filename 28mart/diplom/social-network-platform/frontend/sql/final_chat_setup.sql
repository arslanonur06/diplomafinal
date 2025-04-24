-- Complete fixed version of chat system setup
-- This script sets up all necessary tables, columns, RLS policies, and permissions

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create or update tables with proper structure
-------------------------------------------------

-- Chat Groups Table
CREATE TABLE IF NOT EXISTS public.chat_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL DEFAULT 'General Chat',
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    image_url TEXT,
    is_private BOOLEAN DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_groups_created_by ON public.chat_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_groups_created_at ON public.chat_groups(created_at);

-- Chat Group Members Table
CREATE TABLE IF NOT EXISTS public.chat_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_group_members_group_id ON public.chat_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_user_id ON public.chat_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_role ON public.chat_group_members(role);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    chat_id UUID,
    group_id UUID REFERENCES public.chat_groups(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN DEFAULT false,
    attachment_url TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_group_id ON public.chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- 2. Enable Row Level Security (RLS)
--------------------------------------
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 3. Grant permissions to authenticated users
--------------------------------------------
GRANT ALL ON public.chat_groups TO authenticated;
GRANT ALL ON public.chat_group_members TO authenticated;
GRANT ALL ON public.chat_messages TO authenticated;

-- 4. Set up RLS policies
-------------------------

-- Chat Groups Policies
DROP POLICY IF EXISTS "Users can create groups" ON public.chat_groups;
CREATE POLICY "Users can create groups"
ON public.chat_groups FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view groups" ON public.chat_groups;
CREATE POLICY "Users can view groups"
ON public.chat_groups FOR SELECT
USING (
    NOT is_private 
    OR created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.chat_group_members 
        WHERE group_id = chat_groups.id 
        AND user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Group creators can update their groups" ON public.chat_groups;
CREATE POLICY "Group creators can update their groups"
ON public.chat_groups FOR UPDATE
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Group creators can delete their groups" ON public.chat_groups;
CREATE POLICY "Group creators can delete their groups"
ON public.chat_groups FOR DELETE
USING (created_by = auth.uid());

-- Chat Group Members Policies
DROP POLICY IF EXISTS "Users can view group members" ON public.chat_group_members;
CREATE POLICY "Users can view group members"
ON public.chat_group_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_groups
        WHERE id = chat_group_members.group_id
        AND (
            NOT is_private 
            OR created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.chat_group_members m2
                WHERE m2.group_id = chat_group_members.group_id
                AND m2.user_id = auth.uid()
            )
        )
    )
);

DROP POLICY IF EXISTS "Users can join groups" ON public.chat_group_members;
CREATE POLICY "Users can join groups"
ON public.chat_group_members FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.chat_groups
        WHERE id = group_id
        AND NOT is_private
    )
);

DROP POLICY IF EXISTS "Users can leave groups" ON public.chat_group_members;
CREATE POLICY "Users can leave groups"
ON public.chat_group_members FOR DELETE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage members" ON public.chat_group_members;
CREATE POLICY "Admins can manage members"
ON public.chat_group_members FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.chat_group_members
        WHERE group_id = chat_group_members.group_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
);

-- Chat Messages Policies
DROP POLICY IF EXISTS "Users can insert messages" ON public.chat_messages;
CREATE POLICY "Users can insert messages"
ON public.chat_messages FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND (
        group_id IS NULL
        OR EXISTS (
            SELECT 1 FROM public.chat_group_members
            WHERE group_id = chat_messages.group_id
            AND user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Users can view messages" ON public.chat_messages;
CREATE POLICY "Users can view messages"
ON public.chat_messages FOR SELECT
USING (
    group_id IS NULL
    OR EXISTS (
        SELECT 1 FROM public.chat_group_members
        WHERE group_id = chat_messages.group_id
        AND user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update own messages" ON public.chat_messages;
CREATE POLICY "Users can update own messages"
ON public.chat_messages FOR UPDATE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own messages" ON public.chat_messages;
CREATE POLICY "Users can delete own messages"
ON public.chat_messages FOR DELETE
USING (user_id = auth.uid());

-- 5. Create test group if it doesn't exist
-----------------------------------------
DO $$
DECLARE
    first_user_id UUID;
    test_group_id UUID := '11111111-1111-1111-1111-111111111111';
    test_group_exists BOOLEAN;
BEGIN
    -- Check if any users exist
    SELECT id INTO first_user_id FROM public.profiles LIMIT 1;
    
    IF first_user_id IS NULL THEN
        RAISE NOTICE 'No users found in profiles table. Skipping test group creation.';
        RETURN;
    END IF;

    -- Check if test group exists
    SELECT EXISTS (
        SELECT 1 FROM public.chat_groups WHERE id = test_group_id
    ) INTO test_group_exists;
    
    IF NOT test_group_exists THEN
        -- Create test group
        INSERT INTO public.chat_groups (
            id, 
            name, 
            description, 
            created_by, 
            is_private
        ) VALUES (
            test_group_id,
            'Test Chat Group',
            'This is a test chat group for development and testing',
            first_user_id,
            false
        );
        
        -- Add creator as admin
        INSERT INTO public.chat_group_members (
            group_id,
            user_id,
            role
        ) VALUES (
            test_group_id,
            first_user_id,
            'admin'
        ) ON CONFLICT (group_id, user_id) DO NOTHING;
        
        RAISE NOTICE 'Created test group with ID % and admin user %', test_group_id, first_user_id;
    ELSE
        RAISE NOTICE 'Test group already exists with ID %', test_group_id;
    END IF;
END $$;

-- 6. Display current setup status
--------------------------------
SELECT 
    g.id AS group_id,
    g.name AS group_name,
    g.created_by AS owner_id,
    p.full_name AS owner_name,
    g.is_private,
    COUNT(DISTINCT m.user_id) AS member_count,
    COUNT(DISTINCT msg.id) AS message_count
FROM 
    public.chat_groups g
    LEFT JOIN public.profiles p ON g.created_by = p.id
    LEFT JOIN public.chat_group_members m ON g.id = m.group_id
    LEFT JOIN public.chat_messages msg ON g.id = msg.group_id
GROUP BY
    g.id,
    g.name,
    g.created_by,
    p.full_name,
    g.is_private
ORDER BY
    g.created_at DESC; 