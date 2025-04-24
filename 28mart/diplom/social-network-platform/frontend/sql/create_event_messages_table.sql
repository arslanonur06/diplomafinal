-- Script to create event_messages table for chat functionality within events

-- Create event_messages table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_messages') THEN
        RAISE NOTICE 'Creating event_messages table...';
        
        -- Create the table
        CREATE TABLE public.event_messages (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            event_id UUID NOT NULL,
            user_id UUID NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Add foreign key constraints
        -- Make sure to reference profiles for user_id to avoid the auth.users reference issue
        ALTER TABLE public.event_messages 
        ADD CONSTRAINT event_messages_event_id_fkey 
        FOREIGN KEY (event_id) 
        REFERENCES public.events(id) ON DELETE CASCADE;
        
        ALTER TABLE public.event_messages 
        ADD CONSTRAINT event_messages_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES public.profiles(id) ON DELETE CASCADE;
        
        -- Create indexes
        CREATE INDEX idx_event_messages_event_id ON public.event_messages(event_id);
        CREATE INDEX idx_event_messages_user_id ON public.event_messages(user_id);
        CREATE INDEX idx_event_messages_created_at ON public.event_messages(created_at);
        
        RAISE NOTICE 'Added event_messages table with indexes';
        
        -- Enable row level security
        ALTER TABLE public.event_messages ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        
        -- Allow users to read messages for events they are attending
        DROP POLICY IF EXISTS "Attendees can read event messages" ON public.event_messages;
        CREATE POLICY "Attendees can read event messages" 
        ON public.event_messages
        FOR SELECT 
        USING (
            auth.uid() IN (
                SELECT user_id FROM public.event_attendees WHERE event_id = event_messages.event_id
            )
        );
        
        -- Allow users to insert messages for events they are attending
        DROP POLICY IF EXISTS "Attendees can insert event messages" ON public.event_messages;
        CREATE POLICY "Attendees can insert event messages" 
        ON public.event_messages
        FOR INSERT 
        WITH CHECK (
            auth.uid() = user_id AND
            auth.uid() IN (
                SELECT user_id FROM public.event_attendees WHERE event_id = event_messages.event_id
            )
        );
        
        -- Allow users to update their own messages
        DROP POLICY IF EXISTS "Users can update their own event messages" ON public.event_messages;
        CREATE POLICY "Users can update their own event messages" 
        ON public.event_messages
        FOR UPDATE 
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
        
        -- Allow users to delete their own messages
        DROP POLICY IF EXISTS "Users can delete their own event messages" ON public.event_messages;
        CREATE POLICY "Users can delete their own event messages" 
        ON public.event_messages
        FOR DELETE 
        USING (auth.uid() = user_id);
        
        RAISE NOTICE 'Added RLS policies for event_messages table';
    ELSE
        RAISE NOTICE 'event_messages table already exists';
    END IF;
END $$;

-- Create function to get event messages with profile information
CREATE OR REPLACE FUNCTION public.get_event_messages(p_event_id UUID)
RETURNS TABLE (
    id UUID,
    event_id UUID,
    user_id UUID,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    full_name TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        em.id,
        em.event_id,
        em.user_id,
        em.content,
        em.created_at,
        em.updated_at,
        p.full_name,
        p.avatar_url
    FROM 
        public.event_messages em
    JOIN 
        public.profiles p ON em.user_id = p.id
    WHERE 
        em.event_id = p_event_id
    ORDER BY 
        em.created_at ASC;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_event_messages TO authenticated; 