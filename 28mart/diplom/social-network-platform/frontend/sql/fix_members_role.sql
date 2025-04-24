-- Script to fix the chat_group_members table by adding the role column if missing
-- and assigning appropriate roles to existing members

-- First, check if the chat_group_members table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_group_members'
  ) THEN
    -- Check if the role column exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'chat_group_members' 
      AND column_name = 'role'
    ) THEN
      -- Add the role column with default value 'member'
      ALTER TABLE public.chat_group_members ADD COLUMN role TEXT DEFAULT 'member';
      
      -- Update the first member of each group to be an admin
      -- This is a simple heuristic - the first person to join a group is likely the creator
      WITH first_members AS (
        SELECT DISTINCT ON (group_id) id, group_id, user_id
        FROM public.chat_group_members
        ORDER BY group_id, joined_at ASC
      )
      UPDATE public.chat_group_members
      SET role = 'admin'
      FROM first_members
      WHERE chat_group_members.id = first_members.id;
      
      RAISE NOTICE 'Added role column to chat_group_members table and assigned admins';
    ELSE
      RAISE NOTICE 'Role column already exists in chat_group_members table';
    END IF;
  ELSE
    RAISE NOTICE 'chat_group_members table does not exist yet';
  END IF;
END
$$; 