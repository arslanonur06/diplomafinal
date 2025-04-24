-- Create necessary tables for chat functionality

-- Create chat_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chat_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    created_by UUID REFERENCES public.profiles(id),
    is_public BOOLEAN DEFAULT true,
    max_members INTEGER DEFAULT 100,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create chat_group_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chat_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_admin BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

-- Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    attachment_url TEXT,
    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_connections table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id)
);

-- Enable Row Level Security on chat tables
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_groups
CREATE POLICY "Allow users to create public groups"
ON public.chat_groups FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all authenticated users to view groups"
ON public.chat_groups FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow group creators to update their groups"
ON public.chat_groups FOR UPDATE
USING (auth.uid() = created_by);

-- Create policies for chat_group_members
CREATE POLICY "Allow users to join public groups"
ON public.chat_group_members FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.chat_groups 
    WHERE id = group_id AND (is_public = true OR created_by = auth.uid())
  )
);

CREATE POLICY "Allow members to view their groups' members"
ON public.chat_group_members FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE user_id = auth.uid() AND group_id = public.chat_group_members.group_id
  )
);

CREATE POLICY "Allow users to leave groups"
ON public.chat_group_members FOR DELETE
USING (auth.uid() = user_id);

-- Create policies for chat_messages
CREATE POLICY "Allow members to post messages to their groups"
ON public.chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE user_id = auth.uid() AND group_id = public.chat_messages.group_id
  )
);

CREATE POLICY "Allow members to view their groups' messages"
ON public.chat_messages FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE user_id = auth.uid() AND group_id = public.chat_messages.group_id
  )
);

CREATE POLICY "Allow users to edit their own messages"
ON public.chat_messages FOR UPDATE
USING (auth.uid() = user_id);

-- Create policies for user_connections
CREATE POLICY "Allow users to send friend requests"
ON public.user_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to view their own connections"
ON public.user_connections FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Allow users to update their own connections"
ON public.user_connections FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create a default public group for testing
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the first user from profiles to be the admin
  SELECT id INTO admin_user_id FROM public.profiles LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    -- Insert a public group if none exists
    IF NOT EXISTS (SELECT 1 FROM public.chat_groups WHERE is_public = true) THEN
      INSERT INTO public.chat_groups (
        name, 
        description, 
        created_by, 
        is_public, 
        avatar_url
      )
      VALUES (
        'Global Chat', 
        'Public chat group for all users', 
        admin_user_id, 
        TRUE,
        'https://ui-avatars.com/api/?name=Global+Chat&background=0D8ABC&color=fff'
      );
    END IF;
  END IF;
END
$$; 