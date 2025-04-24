import { createClient } from '@supabase/supabase-js';

// Default fallback values for development/testing
const FALLBACK_URL = 'https://ohserebigziyxlxpkaib.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oc2VyZWJpZ3ppeXhseHBrYWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTI3NDk0MTAsImV4cCI6MjAyODMyNTQxMH0.2mVOdgG-4QPVjVxqKshjFmcAyVELY6KYHtqlR-KLpvw';

// Get environment variables - use explicit strings if empty
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.warn('Using fallback Supabase credentials for development');
  
  // Use fallback values for development
  supabaseUrl = FALLBACK_URL;
  supabaseAnonKey = FALLBACK_KEY;
}

// Verify URL validity
let urlIsValid = false;
try {
  new URL(supabaseUrl); // This will throw if URL is invalid
  urlIsValid = true;
  console.log('Initializing Supabase client with valid URL');
} catch (error) {
  console.error(`Invalid Supabase URL: "${supabaseUrl}"`);
  console.error('Using fallback Supabase URL for development');
  supabaseUrl = FALLBACK_URL;
  supabaseAnonKey = FALLBACK_KEY;
}

console.log('Using Supabase URL:', supabaseUrl);

// Create a single Supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit', // Use implicit flow to avoid PKCE issues
    debug: true, // Enable debug logging for auth
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'apikey': supabaseAnonKey, // Explicitly add API key to all requests
    },
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
  },
});

// Add an auth state change listener with improved error handling
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[SUPABASE AUTH EVENT]:', event);
    
    if (event === 'SIGNED_IN' && session?.user) {
      console.log('[SUPABASE AUTH]: User signed in');
      localStorage.setItem('has_session', 'true');
      localStorage.setItem('auth_user_id', session.user.id);
    } else if (event === 'SIGNED_OUT') {
      console.log('[SUPABASE AUTH]: User signed out');
      localStorage.removeItem('has_session');
      localStorage.removeItem('auth_user_id');
      localStorage.removeItem('supabase.auth.token');
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('[SUPABASE AUTH]: Token refreshed successfully');
    }
  });
  
  // Check session on init with a short delay
  setTimeout(() => {
    console.log('[SUPABASE AUTH]: Verifying initial session...');
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('[SUPABASE AUTH]: Session error:', error);
        // If there's a session error, clear the session to force re-login
        supabase.auth.signOut().catch(e => console.error('Error signing out:', e));
      } else if (data?.session) {
        console.log('[SUPABASE AUTH]: Session exists:', data.session.user.id);
        
        // Check if token is close to expiry (within 10 minutes)
        const expiresAt = data.session.expires_at;
        const nowInSeconds = Math.floor(Date.now() / 1000);
        
        if (expiresAt) {
          const timeUntilExpiry = expiresAt - nowInSeconds;
          
          if (timeUntilExpiry < 600) { // Less than 10 minutes
            console.log('[SUPABASE AUTH]: Token expiring soon, refreshing...');
            supabase.auth.refreshSession().then(({ data, error }) => {
              if (error) {
                console.error('[SUPABASE AUTH]: Token refresh failed:', error);
              } else {
                console.log('[SUPABASE AUTH]: Token refreshed successfully');
              }
            });
          }
        }
      } else {
        console.log('[SUPABASE AUTH]: No active session found');
      }
    });
  }, 1000);
} 