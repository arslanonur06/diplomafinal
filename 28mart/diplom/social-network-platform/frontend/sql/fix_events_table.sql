-- Script to fix the foreign key constraint issue with events table
-- This script updates the events table to reference profiles instead of auth.users for created_by

DO $$
BEGIN
    -- Step 1: Check if the events table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
        RAISE NOTICE 'Events table exists, fixing foreign key constraints...';
        
        -- Step 2: Check if the profile table exists
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
            RAISE EXCEPTION 'Profiles table does not exist, please create it first';
        END IF;
        
        -- Step 3: Drop the foreign key constraint if it exists
        IF EXISTS (
            SELECT FROM information_schema.table_constraints 
            WHERE constraint_name = 'events_created_by_fkey' 
            AND table_schema = 'public' 
            AND table_name = 'events'
        ) THEN
            ALTER TABLE public.events DROP CONSTRAINT events_created_by_fkey;
            RAISE NOTICE 'Dropped existing foreign key constraint';
        END IF;
        
        -- Step 4: Add the new foreign key constraint to reference profiles(id) instead of auth.users(id)
        ALTER TABLE public.events 
        ADD CONSTRAINT events_created_by_fkey 
        FOREIGN KEY (created_by) 
        REFERENCES public.profiles(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added new foreign key constraint referencing profiles table';
        
        -- Step 5: Update column definitions if needed
        -- Check if start_date column exists, if not add it (backwards compatibility)
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'events' 
            AND column_name = 'start_date'
        ) THEN
            ALTER TABLE public.events ADD COLUMN start_date TIMESTAMP WITH TIME ZONE;
            RAISE NOTICE 'Added start_date column';
            
            -- Copy data from start_time to start_date if start_time exists
            IF EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'events' 
                AND column_name = 'start_time'
            ) THEN
                UPDATE public.events SET start_date = start_time;
                RAISE NOTICE 'Copied data from start_time to start_date';
            END IF;
        END IF;
        
        -- Check if end_date column exists, if not add it (backwards compatibility)
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'events' 
            AND column_name = 'end_date'
        ) THEN
            ALTER TABLE public.events ADD COLUMN end_date TIMESTAMP WITH TIME ZONE;
            RAISE NOTICE 'Added end_date column';
            
            -- Copy data from end_time to end_date if end_time exists
            IF EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'events' 
                AND column_name = 'end_time'
            ) THEN
                UPDATE public.events SET end_date = end_time;
                RAISE NOTICE 'Copied data from end_time to end_date';
            END IF;
        END IF;
        
        -- Step 6: Add additional columns needed by the application
        -- Add category column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'events' 
            AND column_name = 'category'
        ) THEN
            ALTER TABLE public.events ADD COLUMN category TEXT DEFAULT 'general';
            RAISE NOTICE 'Added category column';
        END IF;
        
        -- Add is_public column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'events' 
            AND column_name = 'is_public'
        ) THEN
            ALTER TABLE public.events ADD COLUMN is_public BOOLEAN DEFAULT true;
            RAISE NOTICE 'Added is_public column';
        END IF;
        
        -- Add max_attendees column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'events' 
            AND column_name = 'max_attendees'
        ) THEN
            ALTER TABLE public.events ADD COLUMN max_attendees INTEGER DEFAULT NULL;
            RAISE NOTICE 'Added max_attendees column';
        END IF;
        
        -- Add status column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'events' 
            AND column_name = 'status'
        ) THEN
            ALTER TABLE public.events ADD COLUMN status TEXT DEFAULT 'active';
            RAISE NOTICE 'Added status column';
        END IF;
        
        RAISE NOTICE 'Events table updated successfully';
    ELSE
        RAISE NOTICE 'Events table does not exist, nothing to fix';
    END IF;
END $$; 