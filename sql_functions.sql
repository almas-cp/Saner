-- Create SQL functions to handle consultation retrieval

-- Function to get consultations for professionals
CREATE OR REPLACE FUNCTION public.get_professional_consultations(professional_id_param UUID)
RETURNS TABLE (
  id UUID,
  client_id UUID,
  client_name TEXT,
  client_username TEXT,
  client_profile_pic TEXT,
  professional_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  fee_paid INTEGER,
  is_new BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.client_id,
    p.name AS client_name,
    p.username AS client_username,
    p.profile_pic_url AS client_profile_pic,
    c.professional_id,
    c.status,
    c.created_at,
    c.scheduled_for,
    c.last_message,
    c.last_message_time,
    c.fee_paid,
    c.is_new
  FROM 
    public.consultations c
  JOIN 
    public.profiles p ON c.client_id = p.id
  WHERE 
    c.professional_id = professional_id_param
  ORDER BY 
    c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get consultations for clients
CREATE OR REPLACE FUNCTION public.get_client_consultations(client_id_param UUID)
RETURNS TABLE (
  id UUID,
  client_id UUID,
  professional_id UUID,
  professional_name TEXT,
  professional_username TEXT,
  professional_profile_pic TEXT,
  professional_title TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  fee_paid INTEGER,
  is_new BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.client_id,
    c.professional_id,
    p.name AS professional_name,
    p.username AS professional_username,
    p.profile_pic_url AS professional_profile_pic,
    mp.title AS professional_title,
    c.status,
    c.created_at,
    c.scheduled_for,
    c.last_message,
    c.last_message_time,
    c.fee_paid,
    c.is_new
  FROM 
    public.consultations c
  JOIN 
    public.profiles p ON c.professional_id = p.id
  LEFT JOIN
    public.medical_professionals mp ON c.professional_id = mp.id
  WHERE 
    c.client_id = client_id_param
  ORDER BY 
    c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 