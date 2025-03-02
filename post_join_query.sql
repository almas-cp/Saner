-- Query to get posts with their author details
SELECT 
    p.id as post_id,
    p.title,
    p.content,
    p.created_at,
    p.image_url,
    pr.id as author_id,
    pr.name as author_name,
    pr.username as author_username,
    pr.profile_pic_url
FROM 
    posts p
JOIN 
    profiles pr ON p.user_id = pr.id
ORDER BY 
    p.created_at DESC
LIMIT 5;
