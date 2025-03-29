-- Function to delete consultation data instead of archiving it
CREATE OR REPLACE FUNCTION public.delete_consultation(p_consultation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_chat_id UUID;
  v_consultation_exists BOOLEAN;
BEGIN
  -- Check if consultation exists
  SELECT EXISTS(SELECT 1 FROM consultations WHERE id = p_consultation_id)
  INTO v_consultation_exists;
  
  IF NOT v_consultation_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Consultation not found'
    );
  END IF;
  
  -- Get chat ID
  SELECT id INTO v_chat_id 
  FROM chats 
  WHERE consultation_id = p_consultation_id;
  
  -- Delete chat messages if chat exists
  IF v_chat_id IS NOT NULL THEN
    DELETE FROM chat_messages 
    WHERE chat_id = v_chat_id;
    
    -- Delete chat
    DELETE FROM chats 
    WHERE id = v_chat_id;
  END IF;
  
  -- Delete consultation
  DELETE FROM consultations 
  WHERE id = p_consultation_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Consultation and related data deleted successfully',
    'consultation_id', p_consultation_id
  );
END;
$function$; 