-- Script to fix row-level security policies for chat_messages table
-- This addresses the "new row violates row-level security policy" error

-- First check table structure
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'is_anonymous'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE NOTICE 'Adding is_anonymous column to chat_messages table';
    ALTER TABLE public.chat_messages ADD COLUMN is_anonymous BOOLEAN DEFAULT false;
  END IF;
END $$;

-- First check if the policy exists and drop it if needed
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- Debugging: log current policies
  RAISE NOTICE 'Current policies for chat_messages:';
  FOR policy_record IN 
    SELECT policyname, permissive, cmd
    FROM pg_policies 
    WHERE tablename = 'chat_messages'
  LOOP
    RAISE NOTICE '  Policy: % (% - %)', policy_record.policyname, policy_record.permissive, policy_record.cmd;
  END LOOP;

  -- Drop existing policies for a fresh start
  DROP POLICY IF EXISTS "Users can insert their own messages" ON public.chat_messages;
  DROP POLICY IF EXISTS "Users can see messages in their chats" ON public.chat_messages;
  DROP POLICY IF EXISTS "Group members can insert messages" ON public.chat_messages;
  DROP POLICY IF EXISTS "Group members can see messages" ON public.chat_messages;
  DROP POLICY IF EXISTS "Messages are readable by chat participants" ON public.chat_messages;
  DROP POLICY IF EXISTS "Messages are insertable by chat participants" ON public.chat_messages;
  DROP POLICY IF EXISTS "Messages are readable by group members" ON public.chat_messages;
  DROP POLICY IF EXISTS "Messages are insertable by group members" ON public.chat_messages;
  
  RAISE NOTICE 'Dropped existing chat_messages policies';
END
$$;

-- Make sure RLS is enabled
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON public.chat_messages TO authenticated;

-- Create comprehensive policies for direct messages and group messages
-- Policy for direct messages (one-on-one chats)
CREATE POLICY "Messages are insertable by chat participants"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  -- Sender must be the authenticated user
  user_id = auth.uid() AND
  -- For direct messages
  (chat_id IS NOT NULL AND group_id IS NULL) AND
  -- User must be a participant in the chat
  EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_id = public.chat_messages.chat_id
    AND user_id = auth.uid()
  )
);

-- Policy for viewing direct messages
CREATE POLICY "Messages are readable by chat participants"
ON public.chat_messages
FOR SELECT
USING (
  -- For direct messages
  (chat_id IS NOT NULL AND group_id IS NULL) AND
  -- User must be a participant in the chat
  EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_id = public.chat_messages.chat_id
    AND user_id = auth.uid()
  )
);

-- Policy for group messages
CREATE POLICY "Messages are insertable by group members"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  -- Either the sender is the authenticated user or anonymous mode is enabled
  (user_id = auth.uid()) AND
  -- For group messages
  (group_id IS NOT NULL AND chat_id IS NULL) AND
  -- User must be a member of the group
  EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE group_id = public.chat_messages.group_id
    AND user_id = auth.uid()
  )
);

-- Policy for viewing group messages
CREATE POLICY "Messages are readable by group members"
ON public.chat_messages
FOR SELECT
USING (
  -- For group messages
  (group_id IS NOT NULL AND chat_id IS NULL) AND
  -- User must be a member of the group
  EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE group_id = public.chat_messages.group_id
    AND user_id = auth.uid()
  )
);

-- Also allow users to update and delete their own messages
CREATE POLICY "Users can update their own messages"
ON public.chat_messages
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
ON public.chat_messages
FOR DELETE
USING (user_id = auth.uid());

-- Verify the policies were created
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE 'New policies for chat_messages:';
  FOR policy_record IN 
    SELECT policyname, permissive, cmd
    FROM pg_policies 
    WHERE tablename = 'chat_messages'
  LOOP
    RAISE NOTICE '  Policy: % (% - %)', policy_record.policyname, policy_record.permissive, policy_record.cmd;
  END LOOP;
END $$;

-- Debug query to check group membership (useful if you're still having issues)
-- Run this to make sure the user actually is a member of the group they're trying to message
-- SELECT * FROM public.chat_group_members WHERE user_id = '[YOUR_USER_ID]' AND group_id = '[YOUR_GROUP_ID]'; 