-- Script to fix the foreign key constraint violation for chat_messages

-- First, check if we can identify the problematic group
DO $$
DECLARE
  message_exists BOOLEAN;
BEGIN
  -- Check if there are any messages in the chat_messages table
  SELECT EXISTS (
    SELECT 1 FROM public.chat_messages
    WHERE group_id IS NOT NULL
  ) INTO message_exists;
  
  IF message_exists THEN
    RAISE NOTICE 'Found existing messages with group_id. Will check if these groups exist.';
    
    -- Print any message group_ids that don't exist in chat_groups
    FOR r IN 
      SELECT DISTINCT cm.group_id 
      FROM public.chat_messages cm
      LEFT JOIN public.chat_groups cg ON cm.group_id = cg.id
      WHERE cg.id IS NULL AND cm.group_id IS NOT NULL
    LOOP
      RAISE NOTICE 'Message references non-existent group_id: %', r.group_id;
    END LOOP;
  ELSE
    RAISE NOTICE 'No messages with group_id found.';
  END IF;
END $$;

-- Option 1: Drop and recreate the foreign key with ON DELETE SET NULL
ALTER TABLE public.chat_messages 
  DROP CONSTRAINT IF EXISTS chat_messages_group_id_fkey;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_group_id_fkey
  FOREIGN KEY (group_id)
  REFERENCES public.chat_groups(id)
  ON DELETE SET NULL;

-- Option 2: Create any chat_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chat_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_private BOOLEAN DEFAULT false,
  image_url TEXT
);

-- Enable RLS on chat_groups
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;

-- Option 3: Create a simpler chat_messages table structure for testing
ALTER TABLE public.chat_messages 
  ALTER COLUMN group_id DROP NOT NULL,
  ALTER COLUMN chat_id DROP NOT NULL;

-- Add basic RLS policies for chat_groups
DROP POLICY IF EXISTS "Anyone can view public groups" ON public.chat_groups;
CREATE POLICY "Anyone can view public groups"
ON public.chat_groups
FOR SELECT
USING (NOT is_private OR auth.uid() IN (
  SELECT user_id FROM public.chat_group_members WHERE group_id = id
));

DROP POLICY IF EXISTS "Group members can send messages" ON public.chat_groups;
CREATE POLICY "Group members can send messages"
ON public.chat_groups
FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM public.chat_group_members WHERE group_id = id
  )
);

-- Create chat_group_members table if not exists
CREATE TABLE IF NOT EXISTS public.chat_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

-- Enable RLS on chat_group_members
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies for chat_group_members
DROP POLICY IF EXISTS "Group members can see other members" ON public.chat_group_members;
CREATE POLICY "Group members can see other members"
ON public.chat_group_members
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM public.chat_group_members WHERE group_id = group_id
  )
);

-- Fix possible issues with the chat_messages table
DO $$
BEGIN
  -- Add temporary debug output
  RAISE NOTICE 'Current schema of chat_messages:';
  FOR r IN
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'chat_messages'
  LOOP
    RAISE NOTICE '  Column: %, Type: %, Nullable: %', r.column_name, r.data_type, r.is_nullable;
  END LOOP;
  
  -- Create a copy of problematic messages for analysis
  CREATE TABLE IF NOT EXISTS debug_messages AS
  SELECT * FROM public.chat_messages WHERE group_id IS NOT NULL;
  
  RAISE NOTICE 'Created debug_messages table for analysis.';
END $$; 