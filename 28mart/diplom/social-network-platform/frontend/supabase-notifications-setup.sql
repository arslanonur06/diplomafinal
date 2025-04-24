-- Notifications table setup and RLS policies
-- This file contains the SQL commands to create and configure the notifications table
-- and set up appropriate Row Level Security (RLS) policies

-- Check if notification function already exists before trying to create it
CREATE OR REPLACE FUNCTION public.policy_exists(schema_name text, table_name text, policy_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = schema_name
    AND tablename = table_name
    AND policyname = policy_name
  );
END;
$$ LANGUAGE plpgsql;

-- Create the notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL, -- friend_request, like, comment, group, event, etc.
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  related_id UUID, -- Can reference a user_id, post_id, group_id, etc.
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can only view their own notifications
DO $$
BEGIN
  IF NOT public.policy_exists('public', 'notifications', 'notifications_select_policy') THEN
    CREATE POLICY notifications_select_policy ON public.notifications
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Users can insert notifications for others (for creating notifications)
DO $$
BEGIN
  IF NOT public.policy_exists('public', 'notifications', 'notifications_insert_policy') THEN
    CREATE POLICY notifications_insert_policy ON public.notifications
      FOR INSERT
      WITH CHECK (true); -- Allow insert from authenticated users
  END IF;
END $$;

-- Policy: Users can update only their own notifications (mark as read)
DO $$
BEGIN
  IF NOT public.policy_exists('public', 'notifications', 'notifications_update_policy') THEN
    CREATE POLICY notifications_update_policy ON public.notifications
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Users can delete only their own notifications
DO $$
BEGIN
  IF NOT public.policy_exists('public', 'notifications', 'notifications_delete_policy') THEN
    CREATE POLICY notifications_delete_policy ON public.notifications
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create notification function for friend requests
CREATE OR REPLACE FUNCTION public.create_friend_request_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a notification for the addressee
  INSERT INTO public.notifications (
    user_id, 
    type, 
    content, 
    related_id
  ) VALUES (
    NEW.addressee_id,
    'friend_request',
    (SELECT CONCAT(p.full_name, ' sent you a friend request')
     FROM public.profiles p
     WHERE p.id = NEW.requester_id),
    NEW.requester_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger for friend requests
DROP TRIGGER IF EXISTS on_friend_request_created ON public.relationships;
CREATE TRIGGER on_friend_request_created
  AFTER INSERT ON public.relationships
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.create_friend_request_notification();

-- Create notification function for friend request acceptance
CREATE OR REPLACE FUNCTION public.create_friend_accepted_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a notification for the requester
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    INSERT INTO public.notifications (
      user_id, 
      type, 
      content, 
      related_id
    ) VALUES (
      NEW.requester_id,
      'friend_accepted',
      (SELECT CONCAT(p.full_name, ' accepted your friend request')
       FROM public.profiles p
       WHERE p.id = NEW.addressee_id),
      NEW.addressee_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger for friend acceptance
DROP TRIGGER IF EXISTS on_friend_request_accepted ON public.relationships;
CREATE TRIGGER on_friend_request_accepted
  AFTER UPDATE ON public.relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.create_friend_accepted_notification();

-- Create notification function for post likes
CREATE OR REPLACE FUNCTION public.create_post_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id
  FROM public.posts
  WHERE id = NEW.post_id;
  
  -- Don't notify if the post owner is the same as the person liking the post
  IF post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Create a notification
  INSERT INTO public.notifications (
    user_id, 
    type, 
    content, 
    related_id
  ) VALUES (
    post_owner_id,
    'like',
    (SELECT CONCAT(p.full_name, ' liked your post')
     FROM public.profiles p
     WHERE p.id = NEW.user_id),
    NEW.user_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger for post likes
DROP TRIGGER IF EXISTS on_post_liked ON public.likes;
CREATE TRIGGER on_post_liked
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.create_post_like_notification();

-- Create notification function for post comments
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id
  FROM public.posts
  WHERE id = NEW.post_id;
  
  -- Don't notify if the post owner is the same as the commenter
  IF post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Create a notification
  INSERT INTO public.notifications (
    user_id, 
    type, 
    content, 
    related_id
  ) VALUES (
    post_owner_id,
    'comment',
    (SELECT CONCAT(p.full_name, ' commented on your post')
     FROM public.profiles p
     WHERE p.id = NEW.user_id),
    NEW.user_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger for post comments
DROP TRIGGER IF EXISTS on_post_commented ON public.comments;
CREATE TRIGGER on_post_commented
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_comment_notification();

-- Create notification function for group invites
CREATE OR REPLACE FUNCTION public.create_group_invite_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a notification for the user being invited
  INSERT INTO public.notifications (
    user_id, 
    type, 
    content, 
    related_id
  ) VALUES (
    NEW.user_id,
    'group',
    (SELECT CONCAT('You have been invited to join the group: ', g.name)
     FROM public.groups g
     WHERE g.id = NEW.group_id),
    NEW.group_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger for group invites
DROP TRIGGER IF EXISTS on_group_invited ON public.group_members;
CREATE TRIGGER on_group_invited
  AFTER INSERT ON public.group_members
  FOR EACH ROW
  WHEN (NEW.role = 'invited')
  EXECUTE FUNCTION public.create_group_invite_notification();

-- Create notification function for event invites
CREATE OR REPLACE FUNCTION public.create_event_invite_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a notification for the user being invited
  INSERT INTO public.notifications (
    user_id, 
    type, 
    content, 
    related_id
  ) VALUES (
    NEW.user_id,
    'event',
    (SELECT CONCAT('You have been invited to the event: ', e.title)
     FROM public.events e
     WHERE e.id = NEW.event_id),
    NEW.event_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger for event invites
DROP TRIGGER IF EXISTS on_event_invited ON public.event_attendees;
CREATE TRIGGER on_event_invited
  AFTER INSERT ON public.event_attendees
  FOR EACH ROW
  WHEN (NEW.status = 'invited')
  EXECUTE FUNCTION public.create_event_invite_notification(); 