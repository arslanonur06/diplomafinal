// Script to fix chat access issues by ensuring tables exist and the user is in a chat group
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function fixChatAccess() {
  try {
    console.log('Starting chat access fix...');
    
    // Check if user is authenticated
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError || !authData.session) {
      console.error('Authentication error:', authError?.message || 'No session found');
      console.log('Please login before running this script');
      return;
    }
    
    const userId = authData.session.user.id;
    console.log('Current user ID:', userId);
    
    // Step 1: Check if tables exist
    console.log('\nChecking if required tables exist...');
    
    async function checkTableExists(tableName) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.log(`Table '${tableName}' check failed:`, error.message);
          return false;
        }
        
        console.log(`Table '${tableName}' exists.`);
        return true;
      } catch (error) {
        console.error(`Error checking table '${tableName}':`, error);
        return false;
      }
    }
    
    const chatGroupsExists = await checkTableExists('chat_groups');
    const chatGroupMembersExists = await checkTableExists('chat_group_members');
    const chatMessagesExists = await checkTableExists('chat_messages');
    
    if (!chatGroupsExists || !chatGroupMembersExists || !chatMessagesExists) {
      console.log('\nSome required tables are missing. Creating them...');
      
      // Create the tables
      const createTableQueries = [
        // Create chat_groups table
        `CREATE TABLE IF NOT EXISTS public.chat_groups (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          avatar_url TEXT,
          banner_url TEXT,
          created_by UUID REFERENCES public.profiles(id),
          is_public BOOLEAN DEFAULT true,
          max_members INTEGER DEFAULT 100,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`,
        
        // Create chat_group_members table
        `CREATE TABLE IF NOT EXISTS public.chat_group_members (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
          user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
          is_admin BOOLEAN DEFAULT false,
          is_favorite BOOLEAN DEFAULT false,
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          last_read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(group_id, user_id)
        );`,
        
        // Create chat_messages table
        `CREATE TABLE IF NOT EXISTS public.chat_messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
          user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
          content TEXT NOT NULL,
          attachment_url TEXT,
          is_edited BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`,
        
        // Enable RLS
        `ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;`,
        `ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;`,
        `ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;`,
        
        // Create policies
        `CREATE POLICY "Allow users to create public groups"
         ON public.chat_groups FOR INSERT
         WITH CHECK (auth.uid() IS NOT NULL);`,
        
        `CREATE POLICY "Allow all authenticated users to view groups"
         ON public.chat_groups FOR SELECT
         USING (auth.uid() IS NOT NULL);`,
        
        `CREATE POLICY "Allow users to join public groups"
         ON public.chat_group_members FOR INSERT
         WITH CHECK (auth.uid() = user_id);`,
        
        `CREATE POLICY "Allow members to view their groups' members"
         ON public.chat_group_members FOR SELECT
         USING (auth.uid() IS NOT NULL);`,
        
        `CREATE POLICY "Allow members to post messages to their groups"
         ON public.chat_messages FOR INSERT
         WITH CHECK (auth.uid() = user_id);`,
        
        `CREATE POLICY "Allow members to view their groups' messages"
         ON public.chat_messages FOR SELECT
         USING (auth.uid() IS NOT NULL);`
      ];
      
      for (const query of createTableQueries) {
        try {
          const { error } = await supabase.rpc('exec', { query });
          if (error) {
            console.error('Error creating table:', error);
          }
        } catch (error) {
          console.error('Failed to execute query:', error);
        }
      }
      
      console.log('Tables have been created or already exist.');
    }
    
    // Step 2: Check if user is a member of any group
    console.log('\nChecking if user is a member of any group...');
    const { data: memberships, error: membershipError } = await supabase
      .from('chat_group_members')
      .select('group_id')
      .eq('user_id', userId);
      
    if (membershipError) {
      console.error('Error checking memberships:', membershipError.message);
    } else if (!memberships || memberships.length === 0) {
      console.log('User is not a member of any group. Checking for public groups...');
      
      // Step 3: Find a public group to join
      const { data: publicGroups, error: groupsError } = await supabase
        .from('chat_groups')
        .select('id, name')
        .eq('is_public', true)
        .limit(1);
        
      if (groupsError) {
        console.error('Error finding public groups:', groupsError.message);
      } else if (!publicGroups || publicGroups.length === 0) {
        console.log('No public groups found. Creating a new public group...');
        
        // Step 4: Create a new public group
        const { data: newGroup, error: createError } = await supabase
          .from('chat_groups')
          .insert({
            name: 'Global Chat',
            description: 'Public chat group for all users',
            created_by: userId,
            is_public: true,
            avatar_url: 'https://ui-avatars.com/api/?name=Global+Chat&background=0D8ABC&color=fff'
          })
          .select();
          
        if (createError) {
          console.error('Error creating public group:', createError.message);
        } else if (newGroup && newGroup.length > 0) {
          console.log('Created new public group:', newGroup[0].name);
          
          // Step 5: Add user to the new group
          const { error: joinError } = await supabase
            .from('chat_group_members')
            .insert({
              user_id: userId,
              group_id: newGroup[0].id,
              is_admin: true
            });
            
          if (joinError) {
            console.error('Error adding user to group:', joinError.message);
          } else {
            console.log('User added to the new group as admin.');
            
            // Step 6: Add a welcome message
            const { error: messageError } = await supabase
              .from('chat_messages')
              .insert({
                group_id: newGroup[0].id,
                user_id: userId,
                content: 'Welcome to the chat! This is the first message in this group.'
              });
              
            if (messageError) {
              console.error('Error adding welcome message:', messageError.message);
            } else {
              console.log('Welcome message added to the group.');
            }
          }
        }
      } else {
        // Step 5: Join the first public group
        console.log('Found public group:', publicGroups[0].name);
        
        const { error: joinError } = await supabase
          .from('chat_group_members')
          .insert({
            user_id: userId,
            group_id: publicGroups[0].id
          });
          
        if (joinError) {
          console.error('Error joining public group:', joinError.message);
        } else {
          console.log('User added to the public group.');
          
          // Step 6: Add a hello message
          const { error: messageError } = await supabase
            .from('chat_messages')
            .insert({
              group_id: publicGroups[0].id,
              user_id: userId,
              content: 'Hello everyone! I just joined this group.'
            });
            
          if (messageError) {
            console.error('Error adding hello message:', messageError.message);
          } else {
            console.log('Hello message added to the group.');
          }
        }
      }
    } else {
      console.log(`User is already a member of ${memberships.length} group(s).`);
    }
    
    console.log('\nFix complete! You should now be able to access chat features.');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixChatAccess(); 