-- Add author fields to posts table
ALTER TABLE posts
ADD COLUMN author_name TEXT DEFAULT 'Anonymous',
ADD COLUMN author_username TEXT DEFAULT '',
ADD COLUMN author_profile_pic TEXT DEFAULT '';

-- Update existing posts with author information from profiles
UPDATE posts
SET 
  author_name = profiles.name,
  author_username = profiles.username,
  author_profile_pic = profiles.profile_pic_url
FROM profiles
WHERE posts.user_id = profiles.id;

-- Create a trigger to automatically update author information when a post is created
CREATE OR REPLACE FUNCTION update_post_author()
RETURNS TRIGGER AS $$
BEGIN
  SELECT 
    name, 
    username, 
    profile_pic_url 
  INTO 
    NEW.author_name, 
    NEW.author_username, 
    NEW.author_profile_pic
  FROM profiles 
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_post_author_trigger
BEFORE INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION update_post_author();
