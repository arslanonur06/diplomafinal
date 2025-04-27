import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const appUrl = 'https://connectme-uqip.onrender.com';

// Create a single supabase instance
const supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage,
    storageKey: 'supabase.auth.token'
  },
  global: {
    headers: {
      'X-Application-Origin': appUrl
    }
  }
});

// Add debugging for session changes
supabaseInstance.auth.onAuthStateChange((event, session) => {
  console.log('[SUPABASE SERVICE] Auth state changed:', event);
  console.log('[SUPABASE SERVICE] Session exists:', !!session);
  console.log('[SUPABASE SERVICE] User ID:', session?.user?.id);
});

// Export a single instance
export const supabase: SupabaseClient = supabaseInstance;

// Helper functions for common Supabase operations
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const getProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting profile:', error);
    return null;
  }
};

export const updateProfile = async (userId: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating profile:', error);
    return null;
  }
};

// Sign out utility
export const signOut = async () => {
  console.log('Supabase service: signOut called');
  
  try {
    // First try to invalidate the current session server-side
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
    
    if (signOutError) {
      console.error('Supabase signOut error:', signOutError);
    }
  } catch (err) {
    console.error('Error during supabase.auth.signOut:', err);
  }
  
  // Then clean up all client-side storage regardless of server response
  console.log('Cleaning up local storage...');
  
  // Clear all auth-related localStorage items
  const authRelatedKeys = [
    'supabase.auth.token',
    'supabase.auth.refreshToken',
    'supabase.auth.accessToken',
    'supabase.auth.expires_at',
    'supabase.auth.provider',
    'sb-',
    'current_user',
    'has_session',
    'auth_user_id',
    'expecting_oauth_callback',
    'oauth_started_at',
    'auth_in_progress',
    'auth_started_at',
    'auth_error',
    'auth_error_message'
  ];
  
  // Clear specific known localStorage items
  authRelatedKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Scan for other potential auth-related items
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('user') ||
      key.includes('session') ||
      key.includes('sb-')
    )) {
      console.log('Removing localStorage key:', key);
      localStorage.removeItem(key);
    }
  }
  
  // Clear session cookies
  document.cookie.split(";").forEach(function(c) {
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  // Force reload the page to ensure clean state
  if (typeof window !== 'undefined') {
    console.log('Forcing page reload for clean state');
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  }
  
  console.log('Supabase signOut cleanup complete');
};

export const updateUserProfile = async (updates: { full_name?: string; avatar_url?: string }) => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw error || new Error('No user found');

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (updateError) throw updateError;
};

export const getUserProfile = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw error || new Error('No user found');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) throw profileError;
  return profile;
};

// Groups
export const getGroups = async (category?: string) => {
  let query = supabase
    .from('groups')
    .select(`
      *,
      group_members (
        count
      ),
      posts (
        count
      )
    `);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getGroupById = async (id: string) => {
  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      group_members (
        count
      ),
      posts (
        count
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const joinGroup = async (groupId: string, userId: string) => {
  const { error } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      user_id: userId,
      role: 'member'
    });

  if (error) throw error;
};

export const leaveGroup = async (groupId: string, userId: string) => {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) throw error;
};

// Events
export const getEvents = async (category?: string) => {
  let query = supabase
    .from('events')
    .select(`
      *,
      event_attendees (
        count
      )
    `);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getEventById = async (id: string) => {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      event_attendees (
        count
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const joinEvent = async (eventId: string, userId: string, status: 'going' | 'maybe' = 'going') => {
  const { error } = await supabase
    .from('event_attendees')
    .insert({
      event_id: eventId,
      user_id: userId,
      status
    });

  if (error) throw error;
};

export const leaveEvent = async (eventId: string, userId: string) => {
  const { error } = await supabase
    .from('event_attendees')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) throw error;
};

// Friends
export const getFriends = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_connections')
    .select('*')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (error) throw error;
  return data;
};

export const getFriendRequests = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_connections')
    .select('*')
    .eq('friend_id', userId)
    .eq('status', 'pending');

  if (error) throw error;
  return data;
};

export const sendFriendRequest = async (userId: string, friendId: string) => {
  // İsteği gönder
  const { data, error } = await supabase
    .from('user_connections')
    .insert({
      user_id: userId,
      friend_id: friendId,
      status: 'pending'
    })
    .select();

  if (error) throw error;
  
  // Kullanıcı adını al
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single();
  
  if (userError) throw userError;
  
  // Bildirimi oluştur
  const { error: notificationError } = await supabase
    .from('notifications')
    .insert({
      user_id: friendId, // İsteği alan kişiye bildirim
      type: 'friend_request',
      content: `${userData.full_name} size arkadaşlık isteği gönderdi.`,
      read: false,
      related_id: data[0].id
    });
  
  if (notificationError) throw notificationError;
  
  return data[0];
};

export const acceptFriendRequest = async (requestId: string) => {
  const { error } = await supabase
    .from('user_connections')
    .update({ status: 'accepted' })
    .eq('id', requestId);

  if (error) throw error;
};

export const rejectFriendRequest = async (requestId: string) => {
  const { error } = await supabase
    .from('user_connections')
    .delete()
    .eq('id', requestId);

  if (error) throw error;
};

// Posts
export const createPost = async (content: string, userId: string, groupId?: string, imageUrl?: string, taggedUserId?: string) => {
  const { error } = await supabase
    .from('posts')
    .insert({
      content,
      user_id: userId,
      group_id: groupId,
      image_url: imageUrl,
      tagged_user_id: taggedUserId
    });

  if (error) throw error;
};

export const getPosts = async (groupId?: string) => {
  let query = supabase
    .from('posts')
    .select(`
      *,
      profiles (
        full_name,
        avatar_url
      ),
      likes (
        count
      ),
      comments (
        count
      )
    `)
    .order('created_at', { ascending: false });

  if (groupId) {
    query = query.eq('group_id', groupId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// Add tagged_user_id column to posts table
export const addTaggedUserIdColumn = async () => {
  const { error } = await supabase.rpc('alter_posts_table_add_tagged_user');
  if (error) throw error;
};

// Create RPC function to add the column
export const createAlterTableFunction = async () => {
  const { error } = await supabase.rpc(
    'create_alter_posts_table_function',
    {
      sql: `
        CREATE OR REPLACE FUNCTION alter_posts_table_add_tagged_user()
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          ALTER TABLE posts 
          ADD COLUMN IF NOT EXISTS tagged_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        END;
        $$;
      `
    }
  );
  if (error) throw error;
};

export const getProfileWithConnections = async (userId: string, currentUserId: string) => {
  console.log(`[getProfileWithConnections] Fetching profile for userId: ${userId}, currentUserId: ${currentUserId}`);
  
  try {
    // Try to call our custom RPC function
    console.log('[getProfileWithConnections] Attempting to use RPC function...');
    
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_user_profile_with_connections', { 
          p_user_id: userId,
          p_current_user_id: currentUserId
        });
      
      console.log('[getProfileWithConnections] RPC response:', { data: rpcData ? 'data exists' : 'no data', error: rpcError });
      
      // If the RPC function exists and works, use its data
      if (!rpcError && rpcData && rpcData.length > 0) {
        console.log('[getProfileWithConnections] RPC function successful, returning data');
        return { data: rpcData[0], error: null };
      }
      
      if (rpcError) {
        console.error('[getProfileWithConnections] RPC function error:', rpcError);
      } else if (!rpcData || rpcData.length === 0) {
        console.warn('[getProfileWithConnections] RPC function returned no data');
      }
    } catch (rpcCatchError) {
      console.error('[getProfileWithConnections] RPC function exception:', rpcCatchError);
    }
    
    // Fall back to the manual fetching approach
    console.log('[getProfileWithConnections] Falling back to manual profile fetch');
    
    // Get the profile
    console.log(`[getProfileWithConnections] Fetching profile for userId: ${userId}`);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error('[getProfileWithConnections] Profile fetch error:', profileError);
      throw profileError;
    }
    
    if (!profile) {
      console.warn(`[getProfileWithConnections] No profile found for userId: ${userId}`);
      return { data: null, error: new Error('Profile not found') };
    }
    
    console.log('[getProfileWithConnections] Profile fetch successful');
    
    // Check for connection/friend status
    console.log(`[getProfileWithConnections] Checking connection status between ${currentUserId} and ${userId}`);
    try {
      const { data: connection, error: connectionError } = await supabase
        .from('user_connections')
        .select('*')
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${currentUserId})`)
        .maybeSingle();
        
      if (connectionError) {
        console.error('[getProfileWithConnections] Connection fetch error:', connectionError);
      }
      
      console.log('[getProfileWithConnections] Connection data:', connection);
      
      // Combine the data
      const friendStatus = connection ? connection.status : 'none';
      const friendConnectionId = connection ? connection.id : null;
      
      console.log('[getProfileWithConnections] Returning combined profile data');
      return { 
        data: { 
          ...profile,
          friend_status: friendStatus,
          friend_connection_id: friendConnectionId
        }, 
        error: null 
      };
    } catch (connectionFetchError) {
      console.error('[getProfileWithConnections] Connection fetch exception:', connectionFetchError);
      
      // Still return the profile even if connection info fails
      return { 
        data: { 
          ...profile,
          friend_status: 'error',
          friend_connection_id: null
        }, 
        error: null 
      };
    }
  } catch (error) {
    console.error('[getProfileWithConnections] Top-level error:', error);
    return { data: null, error };
  }
};

// Configure auth behavior after client creation
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // Set secure cookie attributes
    document.cookie = 'sb-auth-token=true; SameSite=Strict; Secure; path=/; domain=https://connectme-uqip.onrender.com';
  } else if (event === 'SIGNED_OUT') {
    // Clear auth cookie
    document.cookie = 'sb-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=https://connectme-uqip.onrender.com';
  }
});
