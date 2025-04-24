-- send_group_message RPC function to avoid recursive policy issues
-- This function allows users to send messages to groups they are a member of
-- without running into the infinite recursion policy error

-- Drop the function if it exists to avoid errors
DROP FUNCTION IF EXISTS public.send_group_message;

-- Create the function with safe permission checking
CREATE OR REPLACE FUNCTION public.send_group_message(
  p_content TEXT,
  p_group_id UUID,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_member BOOLEAN;
  v_message_id UUID;
BEGIN
  -- Validate the user ID matches the authenticated user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only send messages as yourself';
  END IF;
  
  -- Check if the user is a member of the group
  -- Using direct query without security policies to avoid recursion
  SELECT EXISTS (
    SELECT 1 
    FROM chat_group_members 
    WHERE group_id = p_group_id AND user_id = p_user_id
  ) INTO v_is_member;
  
  -- If not a member, raise an exception
  IF NOT v_is_member THEN
    RAISE EXCEPTION 'You must be a member of the group to send messages';
  END IF;
  
  -- Insert the message
  INSERT INTO chat_messages (
    content,
    user_id,
    group_id,
    created_at
  ) VALUES (
    p_content,
    p_user_id,
    p_group_id,
    NOW()
  ) RETURNING id INTO v_message_id;
  
  -- Return the message ID
  RETURN v_message_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.send_group_message TO authenticated;

-- Now we need to also create a safe function to check group membership
-- This is a utility function that can be used elsewhere in the app
DROP FUNCTION IF EXISTS public.check_group_membership;

CREATE OR REPLACE FUNCTION public.check_group_membership(
  p_group_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM chat_group_members 
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_group_membership TO authenticated; 