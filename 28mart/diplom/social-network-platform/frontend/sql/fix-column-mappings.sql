-- Fix column mappings and missing columns in chat tables
-- This script checks for and adds missing columns needed by the application

-- Add is_read column to chat_messages if it doesn't exist
DO $$
BEGIN
    -- Check if is_read column exists in chat_messages table
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'chat_messages' 
        AND column_name = 'is_read'
    ) THEN
        -- Add the is_read column with default value false
        ALTER TABLE public.chat_messages 
        ADD COLUMN is_read BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Added is_read column to chat_messages table';
    ELSE
        RAISE NOTICE 'is_read column already exists in chat_messages table';
    END IF;
    
    -- Check if is_read column exists in event_messages table
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'event_messages' 
        AND column_name = 'is_read'
    ) THEN
        -- Add the is_read column with default value false
        ALTER TABLE public.event_messages 
        ADD COLUMN is_read BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Added is_read column to event_messages table';
    ELSE
        RAISE NOTICE 'is_read column already exists in event_messages table';
    END IF;
    
    -- Add is_admin column to chat_group_members if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'chat_group_members' 
        AND column_name = 'is_admin'
    ) THEN
        -- Add the is_admin column with default value false
        ALTER TABLE public.chat_group_members 
        ADD COLUMN is_admin BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Added is_admin column to chat_group_members table';
    ELSE
        RAISE NOTICE 'is_admin column already exists in chat_group_members table';
    END IF;
    
END $$; 