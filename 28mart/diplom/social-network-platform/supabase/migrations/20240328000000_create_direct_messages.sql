-- Create direct_messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver ON public.direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON public.direct_messages(created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Policy for inserting messages (users can only send messages as themselves)
CREATE POLICY "Users can insert their own messages"
    ON public.direct_messages FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = sender_id);

-- Policy for viewing messages (users can only see messages they're involved in)
CREATE POLICY "Users can view their own messages"
    ON public.direct_messages FOR SELECT
    TO authenticated
    USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id
    );

-- Policy for updating messages (users can only update their own messages)
CREATE POLICY "Users can update their own messages"
    ON public.direct_messages FOR UPDATE
    TO authenticated
    USING (auth.uid() = sender_id)
    WITH CHECK (auth.uid() = sender_id);

-- Policy for deleting messages (users can only delete their own messages)
CREATE POLICY "Users can delete their own messages"
    ON public.direct_messages FOR DELETE
    TO authenticated
    USING (auth.uid() = sender_id);

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_conversation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.direct_messages
    SET is_read = true
    WHERE receiver_id = auth.uid()
    AND sender_id = p_conversation_id
    AND is_read = false;
END;
$$; 