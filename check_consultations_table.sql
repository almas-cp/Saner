-- Check the structure of the consultations table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'consultations'
ORDER BY ordinal_position;

-- Check if any consultations are already completed
SELECT id, client_id, professional_id, status, completed_at 
FROM consultations 
WHERE status = 'completed'
LIMIT 5;

-- List of first 5 active consultations
SELECT id, client_id, professional_id, status 
FROM consultations 
WHERE status != 'completed'
LIMIT 5; 