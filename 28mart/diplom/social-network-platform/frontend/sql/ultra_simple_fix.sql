-- Ultra simple fix for chat groups - fixes the NULL value in created_by error

-- 1. Check if any profiles exist first
DO $$
DECLARE
  profile_exists boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO profile_exists;
  
  IF NOT profile_exists THEN
    RAISE EXCEPTION 'No profiles exist in the database. Please create at least one user profile first.';
  END IF;
END $$;

-- 2. Check if the chat_groups table structure has the expected columns
DO $$
DECLARE
  is_private_exists boolean;
BEGIN
  -- Check if the is_private column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'chat_groups' 
    AND column_name = 'is_private'
  ) INTO is_private_exists;
  
  -- If is_private doesn't exist, try to add it (might fail if table doesn't exist yet)
  IF NOT is_private_exists THEN
    BEGIN
      RAISE NOTICE 'is_private column does not exist, will create table with this field';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not check column existence: %', SQLERRM;
    END;
  END IF;
END $$;

-- 3. Create the tables with correct NOT NULL constraints
CREATE TABLE IF NOT EXISTS public.chat_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'General Chat',
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  image_url TEXT
);

-- 4. Try to add is_private column if it doesn't exist
DO $$
BEGIN
  -- Add the is_private column if it doesn't exist
  BEGIN
    ALTER TABLE public.chat_groups ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added is_private column to chat_groups table';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add is_private column: %', SQLERRM;
  END;
END $$;

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
  group_id UUID REFERENCES public.chat_groups(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT false,
  attachment_url TEXT
);

-- 5. Enable RLS on all tables
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 6. Grant permissions
GRANT ALL ON public.chat_groups TO authenticated;
GRANT ALL ON public.chat_group_members TO authenticated;
GRANT ALL ON public.chat_messages TO authenticated;

-- 7. Add basic RLS policies
DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;
CREATE POLICY "Users can insert own messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can see all messages" ON public.chat_messages;
CREATE POLICY "Users can see all messages"
ON public.chat_messages
FOR SELECT
USING (true);

-- 8. Insert default group and member in a single transaction
-- Exclude is_private field since it might not exist
DO $$
DECLARE
  first_user_id UUID;
  test_group_id UUID := '11111111-1111-1111-1111-111111111111';
  is_private_exists boolean;
BEGIN
  -- Get the first user ID
  SELECT id INTO first_user_id FROM public.profiles LIMIT 1;
  
  -- Check if is_private column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'chat_groups' 
    AND column_name = 'is_private'
  ) INTO is_private_exists;
  
  -- Insert group using the user ID directly, so created_by won't be NULL
  IF is_private_exists THEN
    -- If is_private exists, include it in the INSERT
    EXECUTE 'INSERT INTO public.chat_groups (id, name, description, created_by, is_private)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id) DO UPDATE
    SET created_by = EXCLUDED.created_by
    WHERE public.chat_groups.created_by IS NULL'
    USING test_group_id, 'Test Chat Group', 'This is a test chat group for debugging purposes', first_user_id, false;
  ELSE
    -- If is_private doesn't exist, exclude it from the INSERT
    EXECUTE 'INSERT INTO public.chat_groups (id, name, description, created_by)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (id) DO UPDATE
    SET created_by = EXCLUDED.created_by
    WHERE public.chat_groups.created_by IS NULL'
    USING test_group_id, 'Test Chat Group', 'This is a test chat group for debugging purposes', first_user_id;
  END IF;
  
  -- Add the user as a member
  INSERT INTO public.chat_group_members (group_id, user_id, role)
  VALUES (test_group_id, first_user_id, 'admin')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  
  RAISE NOTICE 'Created test group with ID % and owner %', test_group_id, first_user_id;
END $$;

-- 9. Display the current group and its members for confirmation
SELECT 
  g.id AS group_id, 
  g.name AS group_name, 
  g.created_by AS owner_id,
  p.full_name AS owner_name,
  m.user_id AS member_id,
  mp.full_name AS member_name,
  m.role AS member_role
FROM 
  public.chat_groups g
JOIN 
  public.profiles p ON g.created_by = p.id
LEFT JOIN 
  public.chat_group_members m ON g.id = m.group_id
LEFT JOIN 
  public.profiles mp ON m.user_id = mp.id
WHERE 
  g.id = '11111111-1111-1111-1111-111111111111'; 