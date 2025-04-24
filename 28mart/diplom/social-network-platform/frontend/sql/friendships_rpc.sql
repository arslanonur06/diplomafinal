CREATE OR REPLACE FUNCTION get_user_friendships(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  friend_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  other_user_id UUID,
  other_user_full_name TEXT,
  other_user_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    f.id,
    f.user_id,
    f.friend_id,
    f.status,
    f.created_at,
    CASE
      WHEN f.user_id = p_user_id THEN f.friend_id
      ELSE f.user_id
    END as other_user_id,
    p.full_name as other_user_full_name,
    p.avatar_url as other_user_avatar_url
  FROM 
    friendships f
  JOIN 
    profiles p ON (
      CASE
        WHEN f.user_id = p_user_id THEN f.friend_id
        ELSE f.user_id
      END = p.id
    )
  WHERE 
    (f.user_id = p_user_id OR f.friend_id = p_user_id)
    AND f.status = 'accepted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 