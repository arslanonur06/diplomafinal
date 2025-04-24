# Manual Supabase Authentication Fixes

If the SQL script (`fix-auth-issues.sql`) doesn't work because of the "relation auth.config does not exist" error, you need to manually update your Supabase authentication settings.

## Manual Steps to Fix Authentication

### 1. Update JWT Expiration Time

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Settings**
4. Scroll down to find **JWT Expiry**
5. Change the value from the default (3600 seconds = 1 hour) to **604800 seconds (7 days)**
6. Save the changes

![JWT Expiry Setting](https://i.imgur.com/example.png)

### 2. Fix Row Level Security Policies

You still need proper RLS policies for your tables. Run these SQL commands in the Supabase SQL Editor:

```sql
-- Enable RLS on posts table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Allow users to read all posts
CREATE POLICY "Anyone can read posts" ON public.posts
  FOR SELECT USING (true);

-- Allow users to insert their own posts
CREATE POLICY "Users can create their own posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own posts
CREATE POLICY "Users can update their own posts" ON public.posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own posts
CREATE POLICY "Users can delete their own posts" ON public.posts
  FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on group_members table
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own memberships
CREATE POLICY "Users can join groups" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to see all group members
CREATE POLICY "Anyone can view group members" ON public.group_members
  FOR SELECT USING (true);

-- Allow users to update their own memberships
CREATE POLICY "Users can update their own memberships" ON public.group_members
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own memberships
CREATE POLICY "Users can leave groups" ON public.group_members
  FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.posts TO authenticated;
GRANT ALL ON public.group_members TO authenticated;
```

### 3. Clear Expired Sessions

Run this command to clean up expired sessions:

```sql
DELETE FROM auth.sessions WHERE expires_at < now();
```

### 4. After Making Changes

1. Sign out completely from your application
2. Clear browser cookies and local storage for your site
3. Sign back in to get a fresh session with the new settings

## Testing the Fix

After applying these changes:

1. Try to create a post
2. Try to join a group
3. Check if you stay logged in for longer than 1 hour

If you're still having issues, check the browser console for specific error messages. 