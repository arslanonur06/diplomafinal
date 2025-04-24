-- Simple script to fix chat groups and messages without using loops
-- This avoids syntax errors with loop variables

-- 1. First create the tables if they don't exist
CREATE TABLE IF NOT EXISTS public.chat_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'General Chat',
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_private BOOLEAN DEFAULT false,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS public.chat_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  chat_id UUID,
  group_id UUID,
  is_anonymous BOOLEAN DEFAULT false,
  attachment_url TEXT
);

-- 2. Fix foreign key constraints on chat_messages
ALTER TABLE public.chat_messages 
  DROP CONSTRAINT IF EXISTS chat_messages_group_id_fkey;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_group_id_fkey
  FOREIGN KEY (group_id)
  REFERENCES public.chat_groups(id)
  ON DELETE SET NULL;

-- 3. Make sure all columns are nullable as needed
ALTER TABLE public.chat_messages 
  ALTER COLUMN group_id DROP NOT NULL,
  ALTER COLUMN chat_id DROP NOT NULL;

-- 4. Enable RLS on all tables
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. Grant permissions to authenticated users
GRANT ALL ON public.chat_groups TO authenticated;
GRANT ALL ON public.chat_group_members TO authenticated;
GRANT ALL ON public.chat_messages TO authenticated;

-- 6. Add basic RLS policies without using complex conditions
-- Simple policy to let users insert their own messages
DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;
CREATE POLICY "Users can insert own messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Simple policy to let users see all messages
DROP POLICY IF EXISTS "Users can see all messages" ON public.chat_messages;
CREATE POLICY "Users can see all messages"
ON public.chat_messages
FOR SELECT
USING (true);

-- 7. Add a default group for testing
INSERT INTO public.chat_groups (id, name, description)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Default Chat Group',
  'This is a default chat group created for testing'
)
ON CONFLICT (id) DO NOTHING;

-- 8. Find a user ID to use for the group membership
CREATE TEMPORARY TABLE temp_user_ids AS
SELECT id FROM public.profiles LIMIT 1;

-- 9. Add the user as a member of the default group
INSERT INTO public.chat_group_members (group_id, user_id, role)
SELECT 
  '11111111-1111-1111-1111-111111111111', 
  id, 
  'admin'
FROM temp_user_ids
ON CONFLICT (group_id, user_id) DO NOTHING;

-- 10. Print guidance for the user
SELECT '11111111-1111-1111-1111-111111111111' AS default_group_id, 
       'Use this group ID in your app for testing' AS message; 