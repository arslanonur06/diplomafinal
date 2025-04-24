-- Script to add any missing columns to chat_messages table

-- First check if the table exists
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add columns if they don't exist
ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Make sure RLS is enabled
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Check if both chat_id and group_id exist
DO $$
BEGIN
  IF (
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'chat_id') AND
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'group_id')
  ) THEN
    RAISE NOTICE 'Both chat_id and group_id columns exist. Creating policies...';
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can insert their own messages" ON public.chat_messages;
    DROP POLICY IF EXISTS "Users can see messages in their chats" ON public.chat_messages;
    DROP POLICY IF EXISTS "Group members can insert messages" ON public.chat_messages;
    DROP POLICY IF EXISTS "Group members can see messages" ON public.chat_messages;
    DROP POLICY IF EXISTS "Messages are readable by chat participants" ON public.chat_messages;
    DROP POLICY IF EXISTS "Messages are insertable by chat participants" ON public.chat_messages;
    DROP POLICY IF EXISTS "Messages are readable by group members" ON public.chat_messages;
    DROP POLICY IF EXISTS "Messages are insertable by group members" ON public.chat_messages;
    DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
    DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;
    
    -- Grant necessary permissions
    GRANT ALL ON public.chat_messages TO authenticated;
    
    -- Simple policy for users to manage their own messages
    CREATE POLICY "Users can manage their own messages"
    ON public.chat_messages
    FOR ALL
    USING (user_id = auth.uid());
    
    -- Simple policy for users to read messages in chats they're part of
    CREATE POLICY "Users can read messages in their chats"
    ON public.chat_messages
    FOR SELECT
    USING (
      (
        -- For direct chats
        (chat_id IS NOT NULL AND
         EXISTS (
           SELECT 1 FROM public.chat_participants
           WHERE chat_id = public.chat_messages.chat_id
           AND user_id = auth.uid()
         ))
        OR
        -- For group chats
        (group_id IS NOT NULL AND
         EXISTS (
           SELECT 1 FROM public.chat_group_members
           WHERE group_id = public.chat_messages.group_id
           AND user_id = auth.uid()
         ))
      )
    );
    
    RAISE NOTICE 'Policies created successfully';
  ELSE
    RAISE NOTICE 'One or both of chat_id and group_id columns are missing. Check your database schema.';
  END IF;
END
$$; 