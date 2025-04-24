-- This script ensures that chat groups exist in database
-- Used to fix the error: "insert or update on table \"chat_messages\" violates foreign key constraint"

-- Check if the table has the right structure
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

-- Find out the group ID being used
DO $$
DECLARE
  profile_id UUID;
BEGIN
  -- Get first user profile ID to use as created_by
  SELECT id INTO profile_id FROM public.profiles LIMIT 1;
  
  -- IMPORTANT: Execute this code whenever you get the foreign key constraint error
  -- Replace YOUR_GROUP_ID with the actual ID being used in the error
  INSERT INTO public.chat_groups (id, name, description, created_by)
  VALUES (
    'YOUR_GROUP_ID'::uuid,  -- REPLACE THIS with the actual group ID from the error
    'Recovered Group',
    'This group was automatically created to fix a constraint error',
    profile_id
  )
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Group entry created or confirmed to exist.';
  
  -- Also ensure you're a member of this group
  INSERT INTO public.chat_group_members (group_id, user_id, role)
  VALUES (
    'YOUR_GROUP_ID'::uuid,  -- REPLACE THIS with the actual group ID from the error
    profile_id,
    'admin'
  )
  ON CONFLICT (group_id, user_id) DO NOTHING;
  
  RAISE NOTICE 'Added current user as member of the group.';
END $$;

-- Script to help you identify all the current chat groups
SELECT id, name, created_by, created_at 
FROM public.chat_groups 
ORDER BY created_at DESC 
LIMIT 10; 