-- Add a new table for pinned posts
CREATE TABLE IF NOT EXISTS pinned_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Add RLS policies for pinned_posts
ALTER TABLE pinned_posts ENABLE ROW LEVEL SECURITY;

-- Allow users to select their own pinned posts or any user's pinned posts (for viewing profiles)
CREATE POLICY "Anyone can view pinned posts" 
ON pinned_posts FOR SELECT USING (true);

-- Only allow users to insert their own pinned posts
CREATE POLICY "Users can pin their own posts" 
ON pinned_posts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Only allow users to delete their own pinned posts
CREATE POLICY "Users can unpin their own posts" 
ON pinned_posts FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pinned_posts_user_id ON pinned_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_pinned_posts_post_id ON pinned_posts(post_id); 