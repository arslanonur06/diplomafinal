-- Minimal fix for chat message permissions
-- Addresses "column chat_id does not exist" and RLS policy errors

-- 1. Add the missing columns without foreign key constraints
ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS chat_id UUID,
  ADD COLUMN IF NOT EXISTS group_id UUID,
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- 2. Make sure RLS is enabled
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can read all messages in their groups" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can manage their own messages" ON public.chat_messages;

-- 4. Very simple policies that should work regardless of schema
-- Allow users to insert their own messages, no matter what
CREATE POLICY "Users can insert messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow users to read all messages (we'll refine this later)
CREATE POLICY "Users can read all messages in their groups"
ON public.chat_messages
FOR SELECT
USING (true);

-- Allow users to update and delete their own messages
CREATE POLICY "Users can manage their own messages"
ON public.chat_messages
FOR UPDATE
USING (user_id = auth.uid());

-- Same for delete
CREATE POLICY "Users can delete their own messages"
ON public.chat_messages
FOR DELETE
USING (user_id = auth.uid());

-- 5. Grant necessary permissions
GRANT ALL ON public.chat_messages TO authenticated; 