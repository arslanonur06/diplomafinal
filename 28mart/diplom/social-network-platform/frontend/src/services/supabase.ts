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
      'Content-Type': 'application/json',  // Ensure this is properly set
      'Accept': 'application/json',        // Add explicit Accept header
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
          headers.set('Content-Type', 'application/json');   // Ensure Content-Type is set
          headers.set('Accept', 'application/json');         // Add Accept header
          
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
            'Content-Type': 'application/json',  // Ensure Content-Type is set
            'Accept': 'application/json',        // Add Accept header
            'apikey': supabaseAnonKey
          };
        }
      } catch (error) {
        console.error('[Supabase Fetch] Error processing request:', error);
      }
      
      return fetch(input, init).then(response => {
        if (!response.ok) {
          console.warn(`[Supabase Fetch] Non-OK response: ${response.status} ${response.statusText}`);
          
          // Log the response body for debugging (only in development)
          if (process.env.NODE_ENV !== 'production') {
            response.clone().text().then(text => {
              try {
                const jsonResponse = JSON.parse(text);
                console.warn('[Supabase Fetch] Response body:', jsonResponse);
              } catch (e) {
                console.warn('[Supabase Fetch] Response body (text):', text);
              }
            }).catch(err => {
              console.warn('Could not read response body:', err);
            });
          }
          
          if (response.status === 401) {
            console.warn('[Supabase Fetch] Authentication error, attempting to refresh session');
            // Clear local session if we get 401
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('supabase.auth.token');
            }
          }
          
          if (response.status === 406) {
            console.warn('[Supabase Fetch] Content-Type not acceptable. Check request headers.');
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
  try {
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
  } catch (error) {
    console.error('Error getting group by id:', error);
    return null;
  }
};

// Create a proper function for upserting hashtags
export const upsertHashtags = async (hashtagEntries: { tag: string, post_count: number }[]) => {
  try {
    const { data, error } = await supabase.rpc('upsert_hashtags', { 
      hashtag_entries: hashtagEntries 
    });
    
    if (error) {
      console.error('Error upserting hashtags:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Exception while upserting hashtags:', error);
    throw error;
  }
};
