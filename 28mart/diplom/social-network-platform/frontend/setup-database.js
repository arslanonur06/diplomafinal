import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔧 Setting up database tables...');

async function setupDatabase() {
  try {
    // 1. Create chat_groups table if it doesn't exist
    const { error: groupsError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'chat_groups',
      columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        description TEXT,
        created_by UUID NOT NULL REFERENCES profiles(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        avatar_url TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        max_members INTEGER DEFAULT 100,
        status TEXT DEFAULT 'active'
      `
    });

    if (groupsError) {
      console.error('❌ Error creating chat_groups table:', groupsError);
    } else {
      console.log('✅ chat_groups table created or already exists');
    }

    // 2. Create chat_group_members table if it doesn't exist
    const { error: membersError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'chat_group_members',
      columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_admin BOOLEAN DEFAULT FALSE,
        UNIQUE(group_id, user_id)
      `
    });

    if (membersError) {
      console.error('❌ Error creating chat_group_members table:', membersError);
    } else {
      console.log('✅ chat_group_members table created or already exists');
    }

    // 3. Create chat_messages table if it doesn't exist
    const { error: messagesError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'chat_messages',
      columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES profiles(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_edited BOOLEAN DEFAULT FALSE,
        attachment_url TEXT,
        attachment_type TEXT
      `
    });

    if (messagesError) {
      console.error('❌ Error creating chat_messages table:', messagesError);
    } else {
      console.log('✅ chat_messages table created or already exists');
    }

    // 4. Create events table if it doesn't exist
    const { error: eventsError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'events',
      columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        description TEXT,
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE,
        location TEXT,
        created_by UUID NOT NULL REFERENCES profiles(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        banner_url TEXT,
        is_public BOOLEAN DEFAULT TRUE,
        max_attendees INTEGER DEFAULT 100,
        status TEXT DEFAULT 'active',
        category TEXT
      `
    });

    if (eventsError) {
      console.error('❌ Error creating events table:', eventsError);
    } else {
      console.log('✅ events table created or already exists');
    }

    // 5. Create event_attendees table if it doesn't exist
    const { error: attendeesError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'event_attendees',
      columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'attending', -- attending, maybe, declined
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(event_id, user_id)
      `
    });

    if (attendeesError) {
      console.error('❌ Error creating event_attendees table:', attendeesError);
    } else {
      console.log('✅ event_attendees table created or already exists');
    }

    // 6. Create event_messages table if it doesn't exist
    const { error: eventMessagesError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'event_messages',
      columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES profiles(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_edited BOOLEAN DEFAULT FALSE,
        attachment_url TEXT,
        attachment_type TEXT
      `
    });

    if (eventMessagesError) {
      console.error('❌ Error creating event_messages table:', eventMessagesError);
    } else {
      console.log('✅ event_messages table created or already exists');
    }

    // 7. Create posts table if it doesn't exist
    const { error: postsError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'posts',
      columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_edited BOOLEAN DEFAULT FALSE,
        visibility TEXT DEFAULT 'public', -- public, friends, private
        media_urls TEXT[],
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0
      `
    });

    if (postsError) {
      console.error('❌ Error creating posts table:', postsError);
    } else {
      console.log('✅ posts table created or already exists');
    }

    // 8. Create user_connections table if it doesn't exist
    const { error: connectionsError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'user_connections',
      columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending', -- pending, accepted, rejected, blocked
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, friend_id)
      `
    });

    if (connectionsError) {
      console.error('❌ Error creating user_connections table:', connectionsError);
    } else {
      console.log('✅ user_connections table created or already exists');
    }

    // Now run a query to check if all tables exist and have the right structure
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', [
        'profiles',
        'chat_groups',
        'chat_group_members',
        'chat_messages',
        'events',
        'event_attendees',
        'event_messages',
        'posts',
        'user_connections'
      ]);
    
    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
    } else {
      const existingTables = tables.map(t => t.table_name);
      console.log('📊 Existing tables:', existingTables.join(', '));
      
      const requiredTables = [
        'profiles',
        'chat_groups',
        'chat_group_members',
        'chat_messages',
        'events',
        'event_attendees',
        'event_messages',
        'posts',
        'user_connections'
      ];
      
      const missingTables = requiredTables.filter(t => !existingTables.includes(t));
      
      if (missingTables.length > 0) {
        console.warn('⚠️ Missing tables:', missingTables.join(', '));
        console.warn('👉 You may need to create these tables manually or check permissions.');
      } else {
        console.log('✅ All required tables exist!');
      }
    }

    // Create a default public group for testing
    const { data: existingGroups, error: groupCheckError } = await supabase
      .from('chat_groups')
      .select('id, name')
      .eq('name', 'Public Chat')
      .limit(1);

    if (groupCheckError) {
      console.error('❌ Error checking for public group:', groupCheckError);
    } else if (!existingGroups || existingGroups.length === 0) {
      // Get the first user to be the owner
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (usersError || !users || users.length === 0) {
        console.error('❌ Error getting a user for the public group:', usersError || 'No users found');
      } else {
        const userId = users[0].id;
        const { data: group, error: createGroupError } = await supabase
          .from('chat_groups')
          .insert({
            name: 'Public Chat',
            description: 'A public chat group for all users',
            created_by: userId,
            is_public: true,
            avatar_url: 'https://ui-avatars.com/api/?name=Public+Chat&background=0D8ABC&color=fff'
          })
          .select();

        if (createGroupError) {
          console.error('❌ Error creating public group:', createGroupError);
        } else {
          console.log('✅ Created public chat group');

          // Add the creator as a member and admin
          const { error: memberError } = await supabase
            .from('chat_group_members')
            .insert({
              group_id: group[0].id,
              user_id: userId,
              is_admin: true
            });

          if (memberError) {
            console.error('❌ Error adding creator to public group:', memberError);
          } else {
            console.log('✅ Added creator as admin to public chat group');
            
            // Add a welcome message
            const { error: msgError } = await supabase
              .from('chat_messages')
              .insert({
                group_id: group[0].id,
                user_id: userId,
                content: 'Welcome to the public chat group! Everyone is welcome here.'
              });
              
            if (msgError) {
              console.error('❌ Error adding welcome message:', msgError);
            } else {
              console.log('✅ Added welcome message to public chat group');
            }
          }
        }
      }
    } else {
      console.log('✅ Public chat group already exists');
    }

    console.log('🎉 Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    console.log('🔧 Alternative solution: Use the Supabase dashboard to create these tables manually.');
  }
}

// Run setup
setupDatabase().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
}); 