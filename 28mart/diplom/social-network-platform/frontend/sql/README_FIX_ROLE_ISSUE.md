# Fixing "column role does not exist" Error

If you encountered the error message `ERROR: 42703: column "role" does not exist` when running the chat group features SQL scripts, follow these steps to resolve the issue:

## Background

The error occurs because the `chat_group_features.sql` script tries to create policies that reference a `role` column in the `chat_group_members` table, but this column doesn't exist in your database yet.

## Solution

We've created two ways to fix this issue:

### Option 1: Run the updated scripts in order

We've updated the `chat_group_features.sql` file to automatically check for and add the `role` column if it's missing. To fix the issue:

1. First, run the `fix_chat_groups.sql` script
2. Then run the updated `chat_group_features.sql` script

### Option 2: Run the dedicated fix script

We've created a dedicated script called `fix_members_role.sql` that will:
- Check if the `chat_group_members` table exists
- Add the `role` column if it's missing
- Assign 'admin' role to the first member of each group

To use this script:

1. Run `fix_members_role.sql` first
2. Then run `chat_group_features.sql`

## Using Supabase Dashboard

1. Log into your Supabase dashboard
2. Go to the SQL Editor
3. Copy the contents of the appropriate script and run it
4. Run the scripts in the order specified above

## Using Supabase CLI

```bash
# Navigate to the SQL directory
cd diplom/social-network-platform/frontend/sql

# Apply the fixes
supabase db execute --file fix_members_role.sql
supabase db execute --file chat_group_features.sql
```

## Verifying the Fix

To verify that the fix worked, you can run this SQL query:

```sql
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'chat_group_members';
```

You should see the `role` column listed among the results. 