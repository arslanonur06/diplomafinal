# Database Setup for Social Network Platform

This document explains how to set up the database for the social network platform, including creating the necessary tables and applying Row Level Security (RLS) policies.

## Prerequisites

- A Supabase project with the PostgreSQL database
- Access to run SQL queries on the database

## Setup Process

The setup process consists of two main steps:

1. Creating the database tables
2. Applying Row Level Security (RLS) policies

### Step 1: Creating the Database Tables

Run the `supabase-tables-setup.sql` script to create all the necessary tables for the application:

```sql
-- Run this script in the Supabase SQL Editor
@/supabase-tables-setup.sql
```

This script will:
- Check if each table exists before attempting to create it
- Create tables with the proper schema and relationships
- Add necessary indexes and constraints

The script creates the following tables:
- `posts` - Stores user posts
- `profiles` - Stores user profile information
- `saved_items` - Stores items saved by users
- `groups` - Stores group information
- `group_members` - Stores group membership information
- `events` - Stores event information
- `event_attendees` - Stores event attendance information
- `comments` - Stores comments on posts
- `likes` - Stores likes on posts
- `user_relationships` - Stores friend relationships between users
- `notifications` - Stores user notifications
- `user_interests` - Stores user interests

### Step 2: Applying Row Level Security (RLS) Policies

After creating the tables, run the `supabase-rls-policies-updated.sql` script to apply Row Level Security policies:

```sql
-- Run this script in the Supabase SQL Editor
@/supabase-rls-policies-updated.sql
```

This script will:
- Check if each table exists before applying policies
- Enable RLS on all existing tables
- Create policies that restrict data access based on user roles and permissions
- Check if policies already exist to avoid duplicates

The RLS policies ensure that:
- Users can only view content they are authorized to see
- Users can only modify their own data
- Proper permissions are enforced for all operations

## Troubleshooting

If you encounter errors during the setup process, check the following:

### Table Creation Errors

- Ensure that the `uuid-ossp` extension is enabled in your database
- Check if there are existing tables with the same names
- Verify that you have the necessary permissions to create tables

### RLS Policy Errors

- Ensure that all referenced tables exist before applying policies
- Check for conflicts with existing policies
- Verify that column names match the actual schema

## Database Schema Update

If you need to update the database schema:

1. Modify the `supabase-tables-setup.sql` script with your changes
2. Run the script again - it will only create tables that don't exist
3. For existing tables that need schema changes, create an additional migration script

## Security Considerations

- The RLS policies in this setup ensure data isolation between users
- Always test RLS policies thoroughly to ensure they provide proper security
- Remember that database administrators bypass RLS, so application security is still important

## Adding New Tables

To add new tables:

1. Add the table definition to `supabase-tables-setup.sql`
2. Add appropriate RLS policies to `supabase-rls-policies-updated.sql`
3. Run both scripts to create the table and apply policies 