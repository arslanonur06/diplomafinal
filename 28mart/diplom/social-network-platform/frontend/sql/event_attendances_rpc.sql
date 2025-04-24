CREATE OR REPLACE FUNCTION get_user_event_attendances(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  event_id UUID,
  user_id UUID,
  status TEXT,
  event_title TEXT,
  event_start_date TIMESTAMPTZ,
  event_image_url TEXT
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    ea.id,
    ea.event_id,
    ea.user_id,
    ea.status,
    e.title AS event_title,
    e.start_date AS event_start_date,
    e.image_url AS event_image_url
  FROM 
    event_attendees ea
  JOIN 
    events e ON ea.event_id = e.id
  WHERE 
    ea.user_id = p_user_id
    AND ea.status IN ('going', 'interested');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 