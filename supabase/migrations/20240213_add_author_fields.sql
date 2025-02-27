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
  -- Get the author information from profiles table
  UPDATE posts 
  SET 
    author_name = p.name,
    author_username = p.username,
    author_profile_pic = p.profile_pic_url
  FROM profiles p
  WHERE posts.id = NEW.id AND p.id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_post_author_trigger ON posts;

-- Create new trigger
CREATE TRIGGER update_post_author_trigger
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION update_post_author();
