-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_friend_requests_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_friend_requests_updated_at
    BEFORE UPDATE ON friend_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_friend_requests_updated_at_column();

-- Enable RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT ALL ON friend_requests TO authenticated;

-- Policies

-- View policy: Users can view their own friend requests (sent or received)
CREATE POLICY "Users can view their own friend requests"
ON friend_requests FOR SELECT
TO authenticated
USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Insert policy: Users can send friend requests
CREATE POLICY "Users can send friend requests"
ON friend_requests FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = sender_id AND
    sender_id != receiver_id AND
    NOT EXISTS (
        SELECT 1 FROM friend_requests fr
        WHERE (fr.sender_id = auth.uid() AND fr.receiver_id = receiver_id)
        OR (fr.sender_id = receiver_id AND fr.receiver_id = auth.uid())
    )
);

-- Update policy: Users can update friend requests they received
CREATE POLICY "Users can update received friend requests"
ON friend_requests FOR UPDATE
TO authenticated
USING (
    auth.uid() = receiver_id
)
WITH CHECK (
    auth.uid() = receiver_id
);

-- Delete policy: Users can delete friend requests they sent or received
CREATE POLICY "Users can delete their friend requests"
ON friend_requests FOR DELETE
TO authenticated
USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_id ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_id ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION are_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM friend_requests
        WHERE status = 'accepted'
        AND (
            (sender_id = user1_id AND receiver_id = user2_id)
            OR
            (sender_id = user2_id AND receiver_id = user1_id)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 