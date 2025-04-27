import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  error: Error | null;
  hasCompletedProfile: boolean;
  setHasCompletedProfile: React.Dispatch<React.SetStateAction<boolean>>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  emergencySignOut: () => void;
  signInWithGoogle: (redirectTo?: string) => Promise<{
    data: { provider?: string; url?: string } | null;
    error: Error | null;
  }>;
  refreshSession: () => Promise<{
    success: boolean;
    session?: Session;
    error?: Error;
  }>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (token: string, newPassword: string) => Promise<void>;
  redirectToHome: () => void;
  refreshUserData: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Safari compatibility fixes for third-party cookies
const enableSafariCompatibility = () => {
  if (typeof window !== 'undefined') {
    // Check if Safari
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isSafari) {
      // Enable localStorage for Safari
      localStorage.setItem('supabase.auth.compatibility', 'true');
      
      // Set SameSite attribute for cookies
      document.cookie = "cross-site-cookie=supabase; SameSite=None; Secure";
    }
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [authCompleted, setAuthCompleted] = useState(false);
  const initializingRef = useRef(false);
  const initCompletedRef = useRef(false);
  const profileCheckInProgressRef = useRef(false);

  // Check if a user has completed their profile
  const checkProfileCompletion = useCallback(async (user: User | null) => {
    if (profileCheckInProgressRef.current) return;
    
    profileCheckInProgressRef.current = true;
    try {
      console.log('[AuthProvider] checkProfileCompletion: Starting for user:', user?.id);

      if (!user) {
        console.log('[AuthProvider] checkProfileCompletion: No user provided to check.');
        setHasCompletedProfile(false);
        profileCheckInProgressRef.current = false;
        return;
      }

      // Check user metadata first (using the user object passed in)
      if (user.user_metadata?.profile_completed === true || user.user_metadata?.skipped_profile_completion === true) {
        console.log('[AuthProvider] checkProfileCompletion: Found profile_completed=true or skipped=true in user_metadata');
        setHasCompletedProfile(true);
        profileCheckInProgressRef.current = false;
        return;
      }
      console.log('[AuthProvider] checkProfileCompletion: Neither profile_completed nor skipped is true in user_metadata. Checking database...');
      
      // Then check users table with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          // Select both flags from the PROFILES table using the CORRECT column names
          const { data, error } = await supabase
            .from('profiles') 
            .select('is_profile_completed, skipped_profile_completion')
            .eq('id', user.id)
            .maybeSingle();

          if (error) {
            console.error(`[AuthProvider] checkProfileCompletion: DB Error checking profiles table (attempt ${retryCount + 1}):`, error);
            if (error.code === 'PGRST116') {
              // Resource not found in profiles, profile not completed or skipped
              console.log('[AuthProvider] checkProfileCompletion: User record not found in PROFILES table (PGRST116). Assuming incomplete.');
              setHasCompletedProfile(false);
              profileCheckInProgressRef.current = false; // Reset ref
              return;
            }
            retryCount++;
            if (retryCount === maxRetries) {
              console.error('[AuthProvider] checkProfileCompletion: Max retries reached checking profiles. Assuming incomplete.');
              setHasCompletedProfile(false);
              profileCheckInProgressRef.current = false; // Reset ref
              return;
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          // Check if either flag is true in the profiles database using CORRECT column names
          if (data?.is_profile_completed === true || data?.skipped_profile_completion === true) {
            console.log('[AuthProvider] checkProfileCompletion: Found is_profile_completed=true or skipped=true in PROFILES table');
            setHasCompletedProfile(true);
          } else {
            console.log('[AuthProvider] checkProfileCompletion: Neither is_profile_completed nor skipped is true in PROFILES table');
            setHasCompletedProfile(false);
          }
          profileCheckInProgressRef.current = false; // Reset ref
          return; // Exit loop after successful DB check
        } catch (err) {
          console.error(`[AuthProvider] checkProfileCompletion: Unexpected DB Error checking profiles table (attempt ${retryCount + 1}):`, err);
          retryCount++;
          if (retryCount === maxRetries) {
            console.error('[AuthProvider] checkProfileCompletion: Loop finished without success. Assuming profile incomplete.');
            setHasCompletedProfile(false);
            profileCheckInProgressRef.current = false; // Reset ref
            return;
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // If we get here, all retries failed
      console.error('[AuthProvider] checkProfileCompletion: Loop finished without success. Assuming profile incomplete.');
      setHasCompletedProfile(false);
    } catch (err) {
      console.error('[AuthProvider] checkProfileCompletion: Top-level error:', err);
      setHasCompletedProfile(false);
    } finally {
      console.log('[AuthProvider] checkProfileCompletion: Finished check.');
      profileCheckInProgressRef.current = false; // Ensure ref is always reset
    }
  }, []);

  // Sign out
  const signOut = async () => {
    try {
      // First check if we actually have a session to avoid potential errors
      const { data: sessionData } = await supabase.auth.getSession();
      const hasActiveSession = !!sessionData?.session;
      
      console.log('AuthContext: Starting sign out process. Active session:', hasActiveSession);
      
      // Clear all auth-related localStorage items
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('supabase') || 
          key.includes('auth') || 
          key.includes('user') ||
          key.includes('session')
        )) {
          console.log('Removing localStorage key:', key);
          localStorage.removeItem(key);
        }
      }
      
      // Clear specific localStorage items that might keep auth state
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('current_user');
      localStorage.removeItem('has_session');
      localStorage.removeItem('auth_user_id');
      localStorage.removeItem('force_redirect_home');
      localStorage.removeItem('sb-refresh-token');
      localStorage.removeItem('sb-access-token');
      
      // Clear session cookies by setting them to expire in the past
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // Only try to sign out from Supabase if we actually have a session
      if (hasActiveSession) {
        // Then sign out from Supabase
        console.log('Calling supabase.auth.signOut()');
        const { error } = await supabase.auth.signOut({ scope: 'global' });
        
        if (error) {
          console.error('Supabase signOut error:', error);
          throw error;
        }
      } else {
        console.log('No active session, skipping Supabase signOut API call');
      }
      
      console.log('User signed out successfully');
      
      // Clear auth context state
      setUser(null);
      setHasCompletedProfile(false);
      
      // Force a hard reload to clear any in-memory state
      console.log('Redirecting to landing page');
      window.location.href = '/';
      
    } catch (err) {
      console.error('Error during sign out:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      // Even if there's an error, try to redirect to landing page
      setTimeout(() => {
        console.log('Error during signOut, forcing redirect anyway');
        window.location.replace('/');
      }, 500);
      
      throw err;
    }
  };

  // Function to check and refresh token if needed
  const checkAndRefreshSession = useCallback(async (force = false) => {
    try {
      console.log('Checking session status...');
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        return { success: false, error: new Error(error.message || 'Session error') };
      }
      
      if (!data.session) {
        console.log('No active session found');
        return { success: false, error: new Error('No active session found') };
      }
      
      // Check if session is expired or about to expire
      const expiresAt = data.session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000); // current time in seconds
      const timeUntilExpiry = expiresAt - now;
      
      console.log(`Session found. Expires in ${timeUntilExpiry} seconds`);
      
      // If session expires in less than 5 minutes or force refresh is requested
      if (force || timeUntilExpiry < 300) {
        console.log('Session expiring soon or force refresh requested. Refreshing now...');
        
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            // Handle specific refresh error
            if (refreshError.message && refreshError.message.includes('Auth session missing')) {
              console.log('Session completely expired or missing, clearing local state and signing out');
              // Clear local user data
              setUser(null);
              setHasCompletedProfile(false); // Also reset profile state
              setLoading(false);
              // Perform a clean sign out to fully clear state
              await signOut(); 
              return { 
                success: false, 
                error: new Error('Your session has expired. Please log in again.') 
              };
            }
            
            console.error('Failed to refresh session:', refreshError);
            return { 
              success: false, 
              error: new Error(refreshError.message || 'Failed to refresh session') 
            };
          }
          
          if (refreshData.session && refreshData.user) {
            console.log('Session refreshed successfully');
            // Store the expiry timestamp for debugging
            localStorage.setItem('last_session_refresh', new Date().toISOString());
            if (refreshData.session.expires_at) {
              localStorage.setItem('session_expires_at', new Date(refreshData.session.expires_at * 1000).toISOString());
            }
            setUser(refreshData.user);
            
            // Check if profile is complete
            await checkProfileCompletion(refreshData.user);
            
            return {
              success: true,
              session: refreshData.session
            };
          }
          
          return { 
            success: false, 
            error: new Error('Failed to refresh session') 
          };
        } catch (e) {
          console.error('Exception during session refresh:', e);
          return { 
            success: false, 
            error: e instanceof Error ? e : new Error('Unknown error during session refresh')
          };
        }
      }
      
      return {
        success: true,
        session: data.session
      };
    } catch (e) {
      console.error('Error in checkAndRefreshSession:', e);
      return {
        success: false,
        error: e instanceof Error ? e : new Error('Unknown error checking session')
      };
    }
  }, [checkProfileCompletion, signOut]);

  // Function to explicitly refresh user data from Supabase
  const refreshUserData = useCallback(async () => {
    console.log('AuthProvider: Refreshing user data explicitly...');
    try {
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();
      
      if (getUserError) {
        console.error('AuthProvider: Error during explicit user refresh:', getUserError);
        // Don't necessarily sign out, might be a temporary network issue
        // setError(getUserError);
        return; 
      }

      if (user) {
        console.log('AuthProvider: User data refreshed successfully.', user.id, user.user_metadata);
        setUser(user);
        // Re-check profile completion after refreshing data
        await checkProfileCompletion(user);
      } else {
        console.log('AuthProvider: No user found during refresh.');
        setUser(null);
        setHasCompletedProfile(false);
      }
    } catch (e) {
      console.error('AuthProvider: Unexpected error during explicit user refresh:', e);
      // setError(e instanceof Error ? e : new Error('Unknown error refreshing user data'));
    }
  }, [checkProfileCompletion]);

  // Initialize authentication once
  useEffect(() => {
    // If already initialized or initializing, exit
    if (initializingRef.current || initCompletedRef.current) {
      console.log('[AuthProvider useEffect] initializeAuth: Skipping initialization (already running or completed).');
      return;
    }
    
    initializingRef.current = true;
    console.log('[AuthProvider useEffect] initializeAuth: Starting...');

    const initializeAuth = async () => {
      try {
        setLoading(true);
        console.log('[AuthProvider useEffect] initializeAuth: Attempting to get session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AuthProvider useEffect] initializeAuth: Error getting session:', sessionError);
          setError(sessionError);
          // Do NOT set loading false here, let finally handle it
        } else if (session) {
          console.log('[AuthProvider useEffect] initializeAuth: Active session found:', session.user.id);
          setUser(session.user);
          // Check profile completion after setting user
          await checkProfileCompletion(session.user);
        } else {
          console.log('[AuthProvider useEffect] initializeAuth: No active session found.');
          setUser(null);
          setHasCompletedProfile(false);
        }
      } catch (err) {
        console.error('[AuthProvider useEffect] initializeAuth: Unexpected error:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setUser(null);
        setHasCompletedProfile(false);
      } finally {
        console.log('[AuthProvider useEffect] initializeAuth: Setting loading = false (end of initialization attempt)');
        setLoading(false);
        setAuthCompleted(true); // Mark auth process as completed
        initializingRef.current = false; // Reset initializing flag
        initCompletedRef.current = true; // Mark initialization as completed
      }
    };

    initializeAuth();

    // Supabase Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthProvider onAuthStateChange] Event: ${event}`);
      
      // Prevent listener actions until initial auth is done
      if (!initCompletedRef.current) {
        console.log('[AuthProvider onAuthStateChange] Skipping event, initialization not complete.');
        return;
      }
      
      // Use a reference to avoid race conditions on profile check
      const currentSessionUser = session?.user || null;
      setUser(currentSessionUser);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        console.log('[AuthProvider onAuthStateChange] User signed in or session refreshed. Checking profile completion...');
        if (currentSessionUser) {
          await checkProfileCompletion(currentSessionUser);
        } else {
          console.log('[AuthProvider onAuthStateChange] No user in session after SIGNED_IN/TOKEN_REFRESHED/USER_UPDATED event.');
          setHasCompletedProfile(false);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthProvider onAuthStateChange] User signed out. Resetting state.');
        setUser(null);
        setHasCompletedProfile(false);
        console.log('[AuthProvider onAuthStateChange] SIGNED_OUT: Setting loading = false.');
        setLoading(false);
      } else if (event === 'PASSWORD_RECOVERY') {
        console.log('[AuthProvider onAuthStateChange] Password recovery event.');
      } else if (event === 'INITIAL_SESSION') {
        console.log('[AuthProvider onAuthStateChange] Initial session event.');
        // Handled by the initial useEffect, profile check will run there
      } else {
        console.warn('[AuthProvider onAuthStateChange] Unhandled auth event:', event);
      }
      
      // Fallback: ensure loading is false if no session exists after everything
      if (!session) {
        console.log('[AuthProvider onAuthStateChange] No session found after event, ensuring loading is false.');
        // Do not set loading false here for most events, let initial useEffect manage it
        if (event === 'SIGNED_OUT') {
          setLoading(false); // Only set loading false for explicit sign out
        }
      }
    });

    return () => {
      if (subscription) {
        console.log('[AuthProvider useEffect] Cleaning up auth listener.');
        subscription.unsubscribe();
      }
    };
  }, [checkProfileCompletion]); // Keep dependency on checkProfileCompletion

  // User registration
  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: fullName,
            profile_completed: false
          }
        }
      });
      
      if (error) throw error;
      
      // Create initial user record
      if (data.user) {
        try {
          await supabase.from('users').insert([{
            id: data.user.id,
            email,
            full_name: fullName,
            profile_completed: false
          }]);
        } catch (profileError) {
          console.error('AuthProvider: Error creating user profile:', profileError);
        }
      }
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  // User sign in
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  // Password reset
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  // Function to sign in with Google OAuth
  const signInWithGoogle = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://connectme-uqip.onrender.com/auth/callback', // Ensure this matches your Supabase settings
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            hd: 'stu.sdu.edu.kz', // Optional: restrict to specific Google Workspace domain
          },
        },
      });

      if (error) {
        console.error('[AuthProvider] signInWithGoogle: Error', error);
        return { 
          data: null, 
          error: new Error(error.message),
        };
      }

      localStorage.setItem('redirect_after_auth', 'https://connectme-uqip.onrender.com');
      return { 
        data: data as { provider: string; url: string } | null, 
        error: null,
      };
    } catch (error) {
      console.error('[AuthProvider] signInWithGoogle: Error', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Unknown error during Google sign-in'),
      };
    }
  }, []);

  // Emergency sign out without any async operations
  // This can be used when the normal sign out is failing
  const emergencySignOut = useCallback(() => {
    try {
      console.log('AuthProvider: Performing emergency sign out');
      
      // Clear auth-related local storage manually
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.expires_at');
      localStorage.removeItem('current_user');
      localStorage.removeItem('has_session');
      localStorage.removeItem('auth_user_id');
      localStorage.removeItem('session_expires_at');
      localStorage.removeItem('last_session_refresh');
      
      // Force user state to null
      setUser(null);
      setHasCompletedProfile(false);
      
      // Force redirect to login
      window.location.href = '/login?emergency_logout=true';
    } catch (e) {
      console.error('Even emergency sign out failed:', e);
      // Last resort - reload the page
      window.location.reload();
    }
  }, []);

  // Helper to redirect to home page
  const redirectToHome = () => {
    window.location.href = '/';
  };

  // If there's an error in initialization, show it but still render children
  // This way the app can still function for non-authenticated parts
  if (error) {
    console.error('AuthProvider: Rendering with error:', error.message);
  }

  const updatePassword = async (token: string, newPassword: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        throw error;
      }
      
      console.log('Password updated successfully');
    } catch (err) {
      console.error('Error updating password:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    setUser,
    loading,
    error,
    hasCompletedProfile,
    setHasCompletedProfile,
    signUp,
    signIn,
    signOut,
    emergencySignOut,
    signInWithGoogle,
    refreshSession: checkAndRefreshSession,
    resetPassword,
    updatePassword,
    redirectToHome,
    refreshUserData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
