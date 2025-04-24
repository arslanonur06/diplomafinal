-- Database setup script for Social Network Platform
-- This script creates all necessary tables with appropriate schemas and relationships

-- Helper function to check if a table exists
CREATE OR REPLACE FUNCTION table_exists(table_name text) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = $1
  );
END;
$$ LANGUAGE plpgsql;

-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  -- Posts table
  IF NOT table_exists('posts') THEN
    CREATE TABLE posts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      content TEXT,
      media_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      is_public BOOLEAN DEFAULT TRUE
    );
    CREATE INDEX idx_posts_user_id ON posts(user_id);
    RAISE NOTICE 'Created posts table';
  ELSE
    RAISE NOTICE 'Posts table already exists';
  END IF;

  -- Profiles table
  IF NOT table_exists('profiles') THEN
    CREATE TABLE profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name TEXT,
      avatar_url TEXT,
      avatar_emoji TEXT,
      bio TEXT,
      location TEXT,
      website TEXT,
      birth_date DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created profiles table';
  ELSE
    RAISE NOTICE 'Profiles table already exists';
  END IF;

  -- Saved items table
  IF NOT table_exists('saved_items') THEN
    CREATE TABLE saved_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX idx_saved_items_user_id ON saved_items(user_id);
    CREATE INDEX idx_saved_items_post_id ON saved_items(post_id);
    RAISE NOTICE 'Created saved_items table';
  ELSE
    RAISE NOTICE 'Saved items table already exists';
  END IF;

  -- Groups table
  IF NOT table_exists('groups') THEN
    CREATE TABLE groups (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      created_by UUID NOT NULL REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX idx_groups_created_by ON groups(created_by);
    RAISE NOTICE 'Created groups table';
  ELSE
    RAISE NOTICE 'Groups table already exists';
  END IF;

  -- Group members table
  IF NOT table_exists('group_members') THEN
    CREATE TABLE group_members (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member',
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(group_id, user_id)
    );
    CREATE INDEX idx_group_members_group_id ON group_members(group_id);
    CREATE INDEX idx_group_members_user_id ON group_members(user_id);
    RAISE NOTICE 'Created group_members table';
  ELSE
    RAISE NOTICE 'Group members table already exists';
  END IF;

  -- Events table
  IF NOT table_exists('events') THEN
    CREATE TABLE events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      start_time TIMESTAMP WITH TIME ZONE,
      end_time TIMESTAMP WITH TIME ZONE,
      created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX idx_events_created_by ON events(created_by);
    CREATE INDEX idx_events_group_id ON events(group_id);
    RAISE NOTICE 'Created events table';
  ELSE
    RAISE NOTICE 'Events table already exists';
  END IF;

  -- Event attendees table
  IF NOT table_exists('event_attendees') THEN
    CREATE TABLE event_attendees (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'going', -- going, maybe, not_going
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(event_id, user_id)
    );
    CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
    CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);
    RAISE NOTICE 'Created event_attendees table';
  ELSE
    RAISE NOTICE 'Event attendees table already exists';
  END IF;

  -- Comments table
  IF NOT table_exists('comments') THEN
    CREATE TABLE comments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX idx_comments_post_id ON comments(post_id);
    CREATE INDEX idx_comments_user_id ON comments(user_id);
    RAISE NOTICE 'Created comments table';
  ELSE
    RAISE NOTICE 'Comments table already exists';
  END IF;

  -- Likes table
  IF NOT table_exists('likes') THEN
    CREATE TABLE likes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
      comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT like_target_check CHECK (
        (post_id IS NULL AND comment_id IS NOT NULL) OR
        (post_id IS NOT NULL AND comment_id IS NULL)
      ),
      UNIQUE(user_id, post_id) WHERE post_id IS NOT NULL,
      UNIQUE(user_id, comment_id) WHERE comment_id IS NOT NULL
    );
    CREATE INDEX idx_likes_post_id ON likes(post_id) WHERE post_id IS NOT NULL;
    CREATE INDEX idx_likes_comment_id ON likes(comment_id) WHERE comment_id IS NOT NULL;
    CREATE INDEX idx_likes_user_id ON likes(user_id);
    RAISE NOTICE 'Created likes table';
  ELSE
    RAISE NOTICE 'Likes table already exists';
  END IF;

  -- User relationships (friends/follows) table
  IF NOT table_exists('user_relationships') THEN
    CREATE TABLE user_relationships (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      related_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending', -- pending, accepted, rejected, blocked
      type TEXT DEFAULT 'friend', -- friend, follow
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, related_user_id, type)
    );
    CREATE INDEX idx_user_relationships_user_id ON user_relationships(user_id);
    CREATE INDEX idx_user_relationships_related_user_id ON user_relationships(related_user_id);
    RAISE NOTICE 'Created user_relationships table';
  ELSE
    RAISE NOTICE 'User relationships table already exists';
  END IF;

  -- Notifications table
  IF NOT table_exists('notifications') THEN
    CREATE TABLE notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      type TEXT NOT NULL, -- friend_request, like, comment, mention, etc.
      content TEXT,
      resource_id UUID, -- ID of the related resource (post, comment, etc.)
      resource_type TEXT, -- Type of the related resource (post, comment, etc.)
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX idx_notifications_sender_id ON notifications(sender_id);
    CREATE INDEX idx_notifications_read ON notifications(read);
    RAISE NOTICE 'Created notifications table';
  ELSE
    RAISE NOTICE 'Notifications table already exists';
  END IF;

  -- User interests table
  IF NOT table_exists('user_interests') THEN
    CREATE TABLE user_interests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      interest TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, interest)
    );
    CREATE INDEX idx_user_interests_user_id ON user_interests(user_id);
    RAISE NOTICE 'Created user_interests table';
  ELSE
    RAISE NOTICE 'User interests table already exists';
  END IF;
END $$; 