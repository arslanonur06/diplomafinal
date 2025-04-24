-- Function to fetch user profile with additional friend connection information
CREATE OR REPLACE FUNCTION get_user_profile_with_connections(p_user_id UUID, p_current_user_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT,
  headline TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  interests TEXT[],
  friend_status TEXT,
  friend_connection_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.headline,
    p.bio,
    p.location,
    p.website,
    p.created_at,
    p.updated_at,
    p.interests,
    COALESCE(
      (SELECT uc.status 
       FROM user_connections uc 
       WHERE (uc.user_id = p_user_id AND uc.friend_id = p_current_user_id) 
          OR (uc.user_id = p_current_user_id AND uc.friend_id = p_user_id)
       LIMIT 1),
      'none'
    ) AS friend_status,
    (SELECT uc.id 
     FROM user_connections uc 
     WHERE (uc.user_id = p_user_id AND uc.friend_id = p_current_user_id) 
        OR (uc.user_id = p_current_user_id AND uc.friend_id = p_user_id)
     LIMIT 1) AS friend_connection_id
  FROM profiles p
  WHERE p.id = p_user_id;
END;
$$; 