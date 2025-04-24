CREATE OR REPLACE FUNCTION get_user_relationships(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  requester_id UUID,
  addressee_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  other_user_id UUID,
  other_user_full_name TEXT,
  other_user_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    r.id,
    r.requester_id,
    r.addressee_id,
    r.status,
    r.created_at,
    CASE
      WHEN r.requester_id = p_user_id THEN r.addressee_id
      ELSE r.requester_id
    END as other_user_id,
    p.full_name as other_user_full_name,
    p.avatar_url as other_user_avatar_url
  FROM 
    relationships r
  JOIN 
    profiles p ON (
      CASE
        WHEN r.requester_id = p_user_id THEN r.addressee_id
        ELSE r.requester_id
      END = p.id
    )
  WHERE 
    (r.requester_id = p_user_id OR r.addressee_id = p_user_id)
    AND r.status = 'accepted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 