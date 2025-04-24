-- Create chat group settings table
CREATE TABLE IF NOT EXISTS public.chat_group_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    slow_mode INTEGER DEFAULT 0, -- seconds between messages
    allow_file_sharing BOOLEAN DEFAULT true,
    max_file_size INTEGER DEFAULT 100, -- in MB
    anonymous_admin BOOLEAN DEFAULT false,
    allow_bots BOOLEAN DEFAULT false,
    allow_hashtags BOOLEAN DEFAULT true,
    invite_link_expiration INTEGER DEFAULT 24, -- hours, 0 for never
    invite_link_max_uses INTEGER DEFAULT 0, -- 0 for unlimited
    members_can_add_members BOOLEAN DEFAULT true,
    view_profile_photos BOOLEAN DEFAULT true,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id)
);

-- Create pinned messages table
CREATE TABLE IF NOT EXISTS public.chat_pinned_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    pinned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    pinned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, message_id)
);

-- Add file attachment support to chat_messages table
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Check if role column exists in chat_group_members and add it if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'chat_group_members' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.chat_group_members ADD COLUMN role TEXT DEFAULT 'member';
    END IF;
END$$;

-- Enable RLS for these tables
ALTER TABLE public.chat_group_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_pinned_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on all chat tables to start fresh
DO $$ 
BEGIN
  -- Drop policies on chat_groups table
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_groups') LOOP
    EXECUTE format('DROP POLICY %I ON chat_groups', r.policyname);
  END LOOP;

  -- Drop policies on chat_group_members table
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_group_members') LOOP
    EXECUTE format('DROP POLICY %I ON chat_group_members', r.policyname);
  END LOOP;

  -- Drop policies on chat_messages table
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_messages') LOOP
    EXECUTE format('DROP POLICY %I ON chat_messages', r.policyname);
  END LOOP;
END $$;

-- Basic policies for chat_groups table
CREATE POLICY "Users can view public groups"
ON chat_groups
FOR SELECT
USING (is_public = true);

CREATE POLICY "Members can view their groups" 
ON chat_groups
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM chat_group_members 
    WHERE 
      chat_group_members.group_id = id 
      AND chat_group_members.user_id = auth.uid()
  )
);

-- Basic policies for chat_group_members table
CREATE POLICY "Users can view memberships in their groups" 
ON chat_group_members
FOR SELECT 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM chat_group_members AS my_membership
    WHERE 
      my_membership.group_id = group_id 
      AND my_membership.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join groups" 
ON chat_group_members
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave groups" 
ON chat_group_members
FOR DELETE 
USING (user_id = auth.uid());

-- Basic policies for chat_messages table
CREATE POLICY "Members can view messages in their groups" 
ON chat_messages
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM chat_group_members 
    WHERE 
      chat_group_members.group_id = group_id 
      AND chat_group_members.user_id = auth.uid()
  )
);

CREATE POLICY "Members can send messages to their groups" 
ON chat_messages
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM chat_group_members 
    WHERE 
      chat_group_members.group_id = group_id 
      AND chat_group_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own messages" 
ON chat_messages
FOR DELETE 
USING (user_id = auth.uid());

-- Create trigger to set initial settings for new groups
CREATE OR REPLACE FUNCTION public.create_default_group_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.chat_group_settings (group_id, updated_by)
  VALUES (NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_chat_group_created
AFTER INSERT ON public.chat_groups
FOR EACH ROW EXECUTE FUNCTION public.create_default_group_settings(); 