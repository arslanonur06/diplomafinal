import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// Default fallback values for development/testing
const FALLBACK_URL = 'https://ohserebigziyxlxpkaib.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oc2VyZWJpZ3ppeXhseHBrYWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjMxMTUsImV4cCI6MjA1NTczOTExNX0.EWSzRxtsyEz9rGdwuPS-0E-vTmZip-q2ZapDyZpx-uI';

// Get environment variables - use explicit strings if empty
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    flowType: 'implicit',
    debug: true,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'apikey': supabaseAnonKey,
    },
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      // Override fetch to add retry logic and better error handling
      try {
        // Don't try to parse URLs - just ensure API key is in headers
        const request = input;
        
        // Add API key to headers for all requests
        if (request instanceof Request) {
          // For Request objects, add the API key to headers
          const headers = new Headers(request.headers);
          headers.set('apikey', supabaseAnonKey);
          headers.set('Content-Type', 'application/json'); // Ensure Content-Type is set
          
          const newRequest = new Request(request.url, {
            method: request.method,
            headers: headers,
            body: request.body,
            mode: request.mode,
            credentials: request.credentials,
            cache: request.cache,
            redirect: request.redirect,
            referrer: request.referrer,
            integrity: request.integrity,
          });
          
          input = newRequest;
        } else if (init && typeof init === 'object') {
          // For URL strings with init object, add API key to headers
          init.headers = {
            ...(init.headers || {}),
            'Content-Type': 'application/json', // Ensure Content-Type is set
            'apikey': supabaseAnonKey
          };
        }
      } catch (error) {
        console.error('[Supabase Fetch] Error processing request:', error);
      }
      
      return fetch(input, init).then(response => {
        if (!response.ok) {
          console.warn(`[Supabase Fetch] Non-OK response: ${response.status} ${response.statusText}`);
          
          if (response.status === 401) {
            console.warn('[Supabase Fetch] Authentication error, attempting to refresh session');
            // Clear local session if we get 401
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('supabase.auth.token');
            }
          }
        }
        return response;
      }).catch(error => {
        console.error('[Supabase Fetch] Network error:', error);
        throw error;
      });
    }
  },
});

// Add debugging and better error handling for file uploads
const originalUpload = supabase.storage.from('post-images').upload;
supabase.storage.from('post-images').upload = async (
  path: string, 
  fileBody: File | ArrayBuffer | ArrayBufferView | Blob | Buffer | string | ReadableStream<Uint8Array>,
  options?: { cacheControl?: string; contentType?: string; upsert?: boolean }
) => {
  console.log(`[Storage] Uploading file to path: ${path}`);
  try {
    const result = await originalUpload(path, fileBody, options);
    
    if (result.error) {
      console.error(`[Storage] Error uploading file to ${path}:`, result.error);
    } else {
      console.log(`[Storage] Successfully uploaded file to ${path}`);
    }
    
    return result;
  } catch (error) {
    console.error(`[Storage] Unexpected error uploading file to ${path}:`, error);
    throw error;
  }
};

export default supabase;

// Optional: Log to confirm loading (remove in production)
// console.log('Supabase client initialized with URL:', supabaseUrl ? 'Loaded' : 'MISSING');

// Add debugging for session changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('[SUPABASE SERVICE] Auth state changed:', event);
  console.log('[SUPABASE SERVICE] Session exists:', !!session);
  console.log('[SUPABASE SERVICE] User ID:', session?.user?.id);
});

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
// This function should be consistent with the column name in the database
export const createPost = async (content: string, userId: string, groupId?: string, imageUrl?: string, taggedUserId?: string) => {
  // First check authentication status
  const { isAuthenticated, userId: authUserId } = await checkAuthStatus();
  
  if (!isAuthenticated || authUserId !== userId) {
    throw new Error('Authentication mismatch. Please refresh and try again.');
  }
  
  // Proceed with post creation
  const { data, error } = await supabase
    .from('posts')
    .insert({
      content,
      user_id: userId,
      group_id: groupId,
      image_url: imageUrl,
      tagged_user_id: taggedUserId
    });

  if (error) {
    console.error('Error creating post:', error);
    throw error;
  }
  
  return data;
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

// Add debug wrapper for post creation to identify potential issues
const originalInsert = supabase.from('posts').insert;

// Wrap the insert method for posts table with debugging
// Fix the type error by ensuring we pass arguments correctly
(supabase.from('posts') as any).insert = async function(...args: any[]) {
  console.log('[Posts] Attempting to insert with data:', args[0]);
  
  try {
    // Fix: Call the original method with the proper spread or application of arguments
    // This ensures that arguments are passed correctly as expected by the originalInsert function
    const result = await originalInsert.call(this, args[0], args[1]);
    
    if (result.error) {
      console.error('[Posts] Insert error:', result.error);
    } else {
      console.log('[Posts] Insert successful, data:', result.data);
    }
    
    return result;
  } catch (error) {
    console.error('[Posts] Exception during insert:', error);
    throw error;
  }
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
// Add a debug helper function to check authentication status
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

export const checkAuthStatus = async () => {
  try {
    const sessionResponse = await supabase.auth.getSession();
    const userResponse = await supabase.auth.getUser();
    
    console.log('Session check:', {
      session: sessionResponse.data.session ? 'Active' : 'No active session',
      sessionUserId: sessionResponse.data.session?.user?.id,
      user: userResponse.data.user ? 'User found' : 'No user found',
      userId: userResponse.data.user?.id,
      sessionError: sessionResponse.error?.message,
      userError: userResponse.error?.message
    });
    
    // Also check the debug function in the database
    const { data: debugData } = await supabase.rpc('debug_auth_id');
    console.log('Database auth check:', debugData);
    
    return {
      isAuthenticated: !!sessionResponse.data.session && !!userResponse.data.user,
      userId: userResponse.data.user?.id,
      sessionId: sessionResponse.data.session?.user?.id
    };
  } catch (error) {
    console.error('Error checking auth status:', error);
    return { isAuthenticated: false, userId: null, sessionId: null };
  }
};
