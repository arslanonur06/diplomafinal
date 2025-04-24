-- Add avatar_emoji column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_emoji TEXT;

-- Add interests column to users table (as JSON array)
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}'; 