-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create chat_groups table if it doesn't exist (parent table)
CREATE TABLE IF NOT EXISTS chat_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create chat_group_settings table
CREATE TABLE IF NOT EXISTS chat_group_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    -- Basic Settings
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    message_retention_days INTEGER NOT NULL DEFAULT 30 CHECK (message_retention_days BETWEEN 1 AND 365),
    
    -- Moderation Settings
    slow_mode_interval INTEGER DEFAULT 0 CHECK (slow_mode_interval BETWEEN 0 AND 3600), -- seconds between messages (0-3600)
    allow_anonymous_admins BOOLEAN DEFAULT false,
    allow_file_sharing BOOLEAN DEFAULT true,
    max_file_size INTEGER DEFAULT 2048 CHECK (max_file_size BETWEEN 0 AND 2048), -- MB
    allow_hashtags BOOLEAN DEFAULT true,
    allow_polls BOOLEAN DEFAULT true,
    allow_voice_chat BOOLEAN DEFAULT true,
    allow_live_stream BOOLEAN DEFAULT true,
    
    -- Privacy Settings
    members_can_add_members BOOLEAN DEFAULT true,
    members_can_see_profiles BOOLEAN DEFAULT true,
    members_can_send_media BOOLEAN DEFAULT true,
    members_can_send_stickers BOOLEAN DEFAULT true,
    members_can_use_inline_bots BOOLEAN DEFAULT true,
    members_can_create_topics BOOLEAN DEFAULT false,
    
    -- Message Settings
    allow_message_editing BOOLEAN DEFAULT true,
    message_edit_time_limit INTEGER DEFAULT 48 CHECK (message_edit_time_limit BETWEEN 0 AND 168), -- hours
    allow_message_deletion BOOLEAN DEFAULT true,
    allow_pinned_messages BOOLEAN DEFAULT true,
    max_pinned_messages INTEGER DEFAULT 3 CHECK (max_pinned_messages BETWEEN 0 AND 10),
    
    -- Invite Settings
    allow_invite_links BOOLEAN DEFAULT true,
    invite_link_expiry INTEGER DEFAULT 168 CHECK (invite_link_expiry BETWEEN 1 AND 8760), -- hours
    max_invite_uses INTEGER DEFAULT 100 CHECK (max_invite_uses BETWEEN 1 AND 1000),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(group_id)
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_chat_settings_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_group_settings_updated_at
    BEFORE UPDATE ON chat_group_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_settings_updated_at_column();

-- Enable RLS
ALTER TABLE chat_group_settings ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT ALL ON chat_group_settings TO authenticated;

-- Policies

-- View policy: Group members can view settings
CREATE POLICY "Group members can view settings"
ON chat_group_settings FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM chat_group_members
        WHERE group_id = chat_group_settings.group_id
        AND user_id = auth.uid()
    )
);

-- Insert/Update policy: Only group admins can modify settings
CREATE POLICY "Only group admins can modify settings"
ON chat_group_settings FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM chat_group_members
        WHERE group_id = chat_group_settings.group_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
);

CREATE POLICY "Only group admins can update settings"
ON chat_group_settings FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM chat_group_members
        WHERE group_id = chat_group_settings.group_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM chat_group_members
        WHERE group_id = chat_group_settings.group_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_group_settings_group_id ON chat_group_settings(group_id);

-- Function to get group settings with defaults
CREATE OR REPLACE FUNCTION get_chat_group_settings(p_group_id UUID)
RETURNS TABLE (
    notifications_enabled BOOLEAN,
    theme TEXT,
    message_retention_days INTEGER,
    slow_mode_interval INTEGER,
    allow_anonymous_admins BOOLEAN,
    allow_file_sharing BOOLEAN,
    max_file_size INTEGER,
    allow_hashtags BOOLEAN,
    allow_polls BOOLEAN,
    allow_voice_chat BOOLEAN,
    allow_live_stream BOOLEAN,
    members_can_add_members BOOLEAN,
    members_can_see_profiles BOOLEAN,
    members_can_send_media BOOLEAN,
    members_can_send_stickers BOOLEAN,
    members_can_use_inline_bots BOOLEAN,
    members_can_create_topics BOOLEAN,
    allow_message_editing BOOLEAN,
    message_edit_time_limit INTEGER,
    allow_message_deletion BOOLEAN,
    allow_pinned_messages BOOLEAN,
    max_pinned_messages INTEGER,
    allow_invite_links BOOLEAN,
    invite_link_expiry INTEGER,
    max_invite_uses INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.notifications_enabled,
        s.theme,
        s.message_retention_days,
        s.slow_mode_interval,
        s.allow_anonymous_admins,
        s.allow_file_sharing,
        s.max_file_size,
        s.allow_hashtags,
        s.allow_polls,
        s.allow_voice_chat,
        s.allow_live_stream,
        s.members_can_add_members,
        s.members_can_see_profiles,
        s.members_can_send_media,
        s.members_can_send_stickers,
        s.members_can_use_inline_bots,
        s.members_can_create_topics,
        s.allow_message_editing,
        s.message_edit_time_limit,
        s.allow_message_deletion,
        s.allow_pinned_messages,
        s.max_pinned_messages,
        s.allow_invite_links,
        s.invite_link_expiry,
        s.max_invite_uses
    FROM chat_group_settings s
    WHERE s.group_id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 