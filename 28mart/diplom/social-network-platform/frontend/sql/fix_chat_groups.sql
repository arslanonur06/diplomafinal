-- Check for existing chat_groups table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_groups') THEN
    -- Create chat_groups table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.chat_groups (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      is_private BOOLEAN DEFAULT false,
      created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create chat_group_members table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.chat_group_members (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
      user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      role TEXT DEFAULT 'member',
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(group_id, user_id)
    );

    -- Enable RLS
    ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;

    -- Basic Policies
    CREATE POLICY "Allow users to view public groups"
    ON public.chat_groups FOR SELECT
    USING (NOT is_private OR created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.chat_group_members
      WHERE group_id = public.chat_groups.id AND user_id = auth.uid()
    ));

    CREATE POLICY "Allow members to view their groups"
    ON public.chat_group_members FOR SELECT
    USING (
      user_id = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM public.chat_groups
        WHERE id = public.chat_group_members.group_id AND created_by = auth.uid()
      )
    );
  END IF;
END
$$;

-- Get current user ID
DO $$
DECLARE
  current_user_id UUID;
  new_group_id UUID;
BEGIN
  -- Get the first user from profiles table as a fallback
  SELECT id INTO current_user_id FROM public.profiles LIMIT 1;
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in profiles table';
  END IF;
  
  -- Create a sample group chat
  INSERT INTO public.chat_groups (name, description, created_by)
  VALUES ('General Chat', 'A general discussion group for everyone', current_user_id)
  RETURNING id INTO new_group_id;
  
  -- Add the creator as admin
  INSERT INTO public.chat_group_members (group_id, user_id, role)
  VALUES (new_group_id, current_user_id, 'admin');
  
  -- Add a sample message
  INSERT INTO public.chat_messages (group_id, user_id, content)
  VALUES (new_group_id, current_user_id, 'Welcome to the General Chat group!');
  
  RAISE NOTICE 'Created sample chat group with ID: %', new_group_id;
END
$$; 