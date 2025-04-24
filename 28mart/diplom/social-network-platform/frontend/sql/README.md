# Chat Group Features SQL Setup

This directory contains SQL scripts to set up and configure group chat features for the platform.

## Files

1. `fix_chat_groups.sql` - Creates the basic chat_groups and chat_group_members tables if they don't exist
2. `chat_group_features.sql` - Adds advanced features like slow mode, pinned messages, etc.

## Setup Instructions

### Option 1: Using the Supabase Dashboard

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Create a new query
4. Copy and paste the contents of `fix_chat_groups.sql` into the query editor
5. Run the query
6. Repeat steps 3-5 for `chat_group_features.sql`

### Option 2: Using the Terminal

If you have the Supabase CLI installed and configured, you can run:

```bash
# Navigate to the SQL directory
cd diplom/social-network-platform/frontend/sql

# Apply the fixes
supabase db execute --file fix_chat_groups.sql
supabase db execute --file chat_group_features.sql
```

## Troubleshooting

If you encounter errors related to missing tables:

1. Ensure that the Supabase instance is running
2. Check that the user has permissions to create tables
3. Verify that the tables referenced in the scripts (`profiles`, etc.) already exist

## Database Schema

The following tables are created or modified:

1. `chat_groups` - Stores information about chat groups
2. `chat_group_members` - Maps users to groups with their roles
3. `chat_messages` - Stores messages with attachment support
4. `chat_group_settings` - Stores group settings like slow mode
5. `chat_pinned_messages` - Tracks pinned messages in groups

## Row Level Security (RLS)

These scripts implement appropriate RLS policies to ensure:

1. Only admins can modify group settings
2. All members can view group settings
3. Only admins can pin/unpin messages
4. All members can view pinned messages 