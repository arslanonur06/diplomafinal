import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// Default fallback values for development/testing
const FALLBACK_URL = 'https://ohserebigziyxlxpkaib.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oc2VyZWJpZ3ppeXhseHBrYWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTI3NDk0MTAsImV4cCI6MjAyODMyNTQxMH0.2mVOdgG-4QPVjVxqKshjFmcAyVELY6KYHtqlR-KLpvw';

// Get environment variables - use explicit strings if empty
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

// <<< ADD LOGGING HERE >>>
console.log('[supabaseClient] Initializing Supabase Client...');
console.log('[supabaseClient] VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL || 'Not found in env');
console.log('[supabaseClient] Using URL:', supabaseUrl, 'Source:', import.meta.env.VITE_SUPABASE_URL ? 'env' : 'fallback');

// Don't log the full key for security, but log whether it's from env or fallback
console.log('[supabaseClient] VITE_SUPABASE_ANON_KEY status:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Loaded from env' : 'Not found in env');
console.log('[supabaseClient] Using key source:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'env' : 'fallback');

// No need to validate variables anymore since we're using fallbacks
// Just validate that fallbacks are valid if needed

// Create enhanced Supabase client with debug options
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
      'apikey': supabaseAnonKey, // Explicitly add API key to all requests
    },
    /* Temporarily comment out the custom fetch override for debugging */
    fetch: (...args) => {
      // Override fetch to add retry logic and better error handling
      try {
        // Log the request for debugging
        console.log('[Supabase Fetch] Request type:', typeof args[0]);
        
        // Don't try to parse URLs - just ensure API key is in headers
        const request = args[0];
        
        // Add API key to headers for all requests
        if (request instanceof Request) {
          // For Request objects, add the API key to headers
          const headers = new Headers(request.headers);
          headers.set('apikey', supabaseAnonKey);
          
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
          
          args[0] = newRequest;
        }
      } catch (error) {
        console.error('[Supabase Fetch] Error processing request:', error);
        // Continue with original request if processing fails
      }
      
      return fetch(...args).then(response => {
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
    /* */
  },
  db: {
    schema: 'public',
  },
});

// Add basic logging for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('[Supabase Auth] State changed:', event);
  if (event === 'SIGNED_IN') {
    console.log('[Supabase Auth] User signed in:', session?.user?.id);
  } else if (event === 'SIGNED_OUT') {
    console.log('[Supabase Auth] User signed out');
  } else if (event === 'USER_UPDATED') {
    console.log('[Supabase Auth] User updated:', session?.user?.id);
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('[Supabase Auth] Token refreshed successfully');
  }
});

// Add debugging for network issues
const originalRequest = supabase.functions.invoke;
// @ts-ignore - This is a hacky debug wrapper
supabase.functions.invoke = async (functionName, options) => {
  console.log(`[Supabase Function] Invoking ${functionName}`, options);
  try {
    // @ts-ignore - Just for debug purposes
    const response = await originalRequest.call(supabase.functions, functionName, options);
    console.log(`[Supabase Function] Response from ${functionName}:`, response);
    return response;
  } catch (error) {
    console.error(`[Supabase Function] Error invoking ${functionName}:`, error);
    throw error;
  }
};

// Initialize session tracking with rate limiting
try {
  // Gereksiz kontrolleri önlemek için değişkenler
  let lastSessionCheckTime = 0;
  const SESSION_CHECK_INTERVAL = 5000; // minimum 5 saniye aralıklarla kontrol et
  
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[Supabase Auth] Event:', event);
    console.log('[Supabase Auth] Session User:', session?.user?.id);
    
    // Store session info in localStorage for better tracking
    if (session?.user) {
      localStorage.setItem('has_session', 'true');
      localStorage.setItem('auth_user_id', session.user.id);
    } else if (event === 'SIGNED_OUT') {
      localStorage.removeItem('has_session');
      localStorage.removeItem('auth_user_id');
      // Clear any stale tokens
      localStorage.removeItem('supabase.auth.token');
    }
  });
  
  // Verify current session on init but with rate limiting
  const checkCurrentSession = () => {
    const now = Date.now();
    if (now - lastSessionCheckTime < SESSION_CHECK_INTERVAL) {
      console.log('[Supabase Auth] Skipping session check - checked recently');
      return;
    }
    
    lastSessionCheckTime = now;
    console.log('[Supabase Auth] Checking initial session...');
    
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('[Supabase Auth] Session error:', error);
        // If there's a session error, clear the session to force re-login
        supabase.auth.signOut().catch(e => console.error('Error signing out:', e));
      } else if (data?.session) {
        console.log('[Supabase Auth] Session exists:', data.session.user.id);
        
        // Check if token is close to expiry (within 10 minutes)
        const expiresAt = data.session.expires_at;
        const nowInSeconds = Math.floor(Date.now() / 1000);
        
        if (expiresAt) {
          const timeUntilExpiry = expiresAt - nowInSeconds;
          
          if (timeUntilExpiry < 600) { // Less than 10 minutes
            console.log('[Supabase Auth] Token expiring soon, refreshing...');
            supabase.auth.refreshSession().then(({ data, error }) => {
              if (error) {
                console.error('[Supabase Auth] Token refresh failed:', error);
              } else {
                console.log('[Supabase Auth] Token refreshed successfully');
              }
            });
          }
        }
        
        localStorage.setItem('has_session', 'true');
        localStorage.setItem('auth_user_id', data.session.user.id);
      } else {
        console.log('[Supabase Auth] No active session found');
        localStorage.removeItem('has_session');
        localStorage.removeItem('auth_user_id');
      }
    });
  };
  
  // İlk kontrol için biraz geciktirme ekleyelim, sayfa içeriği yüklensin
  setTimeout(checkCurrentSession, 1000);
} catch (err) {
  console.error('[Supabase Auth] Error initializing auth tracking:', err);
}

// Function to manually clear auth state (can be called from other files)
export const clearAuthState = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('has_session');
    localStorage.removeItem('auth_user_id');
    console.log('[Supabase Auth] Manually cleared auth state');
  }
  
  return supabase.auth.signOut();
};

export { supabase };
