CREATE OR REPLACE FUNCTION get_user_group_memberships(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  group_id UUID,
  user_id UUID,
  role TEXT,
  group_name TEXT,
  group_image_url TEXT,
  group_description TEXT
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    gm.id,
    gm.group_id,
    gm.user_id,
    gm.role,
    g.name AS group_name,
    g.image_url AS group_image_url,
    g.description AS group_description
  FROM 
    group_members gm
  JOIN 
    groups g ON gm.group_id = g.id
  WHERE 
    gm.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 