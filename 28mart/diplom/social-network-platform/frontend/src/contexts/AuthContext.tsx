import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode, FC } from 'react';
import { supabase } from '../services/supabase';
import { User, Session } from '@supabase/supabase-js';

// Define the shape of the context value
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

// Create the context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Safari compatibility fixes for third-party cookies (Note: This function is defined but not called anywhere in the provided code)
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
// If you intend to use the Safari fix, you might want to call it here:
// enableSafariCompatibility();

// Define the AuthProvider component
export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [authCompleted, setAuthCompleted] = useState(false); // This state doesn't seem to be used in the value object or logic much
  const initializingRef = useRef(false);
  const initCompletedRef = useRef(false);
  const profileCheckInProgressRef = useRef(false);

  // Check if a user has completed their profile
  const checkProfileCompletion = useCallback(async (user: User | null) => {
    // ... (implementation unchanged)
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

      // Check user metadata first
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
          const { data, error } = await supabase
            .from('profiles')
            .select('is_profile_completed, skipped_profile_completion')
            .eq('id', user.id)
            .maybeSingle();

          if (error) {
            console.error(`[AuthProvider] checkProfileCompletion: DB Error checking profiles table (attempt ${retryCount + 1}):`, error);
            if (error.code === 'PGRST116') {
              console.log('[AuthProvider] checkProfileCompletion: User record not found in PROFILES table (PGRST116). Assuming incomplete.');
              setHasCompletedProfile(false);
              profileCheckInProgressRef.current = false;
              return;
            }
            retryCount++;
            if (retryCount === maxRetries) {
              console.error('[AuthProvider] checkProfileCompletion: Max retries reached checking profiles. Assuming incomplete.');
              setHasCompletedProfile(false);
              profileCheckInProgressRef.current = false;
              return;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          if (data?.is_profile_completed === true || data?.skipped_profile_completion === true) {
            console.log('[AuthProvider] checkProfileCompletion: Found is_profile_completed=true or skipped=true in PROFILES table');
            setHasCompletedProfile(true);
          } else {
            console.log('[AuthProvider] checkProfileCompletion: Neither is_profile_completed nor skipped is true in PROFILES table');
            setHasCompletedProfile(false);
          }
          profileCheckInProgressRef.current = false;
          return;
        } catch (err) {
          console.error(`[AuthProvider] checkProfileCompletion: Unexpected DB Error checking profiles table (attempt ${retryCount + 1}):`, err);
          retryCount++;
          if (retryCount === maxRetries) {
            console.error('[AuthProvider] checkProfileCompletion: Loop finished without success. Assuming profile incomplete.');
            setHasCompletedProfile(false);
            profileCheckInProgressRef.current = false;
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.error('[AuthProvider] checkProfileCompletion: Loop finished without success. Assuming profile incomplete.');
      setHasCompletedProfile(false);
    } catch (err) {
      console.error('[AuthProvider] checkProfileCompletion: Top-level error:', err);
      setHasCompletedProfile(false);
    } finally {
      console.log('[AuthProvider] checkProfileCompletion: Finished check.');
      profileCheckInProgressRef.current = false;
    }
  }, []);

  // Sign out
  const signOut = async () => {
    // ... (implementation unchanged)
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const hasActiveSession = !!sessionData?.session;
      console.log('AuthContext: Starting sign out process. Active session:', hasActiveSession);

      // Clear localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth') || key.includes('user') || key.includes('session'))) {
          console.log('Removing localStorage key:', key);
          localStorage.removeItem(key);
        }
      }
      localStorage.removeItem('supabase.auth.token'); // Be explicit
      localStorage.removeItem('sb-refresh-token');
      localStorage.removeItem('sb-access-token');
      // Add other specific keys if known

      // Clear session cookies (basic attempt)
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Sign out from Supabase if session exists
      if (hasActiveSession) {
        console.log('Calling supabase.auth.signOut()');
        const { error } = await supabase.auth.signOut({ scope: 'global' });
        if (error) {
          console.error('Supabase signOut error:', error);
          // Decide if you want to throw or just log
        }
      } else {
        console.log('No active session, skipping Supabase signOut API call');
      }

      console.log('User sign out process completed');
      setUser(null);
      setHasCompletedProfile(false);

      // Hard reload/redirect
      console.log('Redirecting to landing page after sign out');
      window.location.href = '/';

    } catch (err) {
      console.error('Error during sign out:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      // Force redirect even on error
      setTimeout(() => {
        console.log('Error during signOut, forcing redirect anyway');
        window.location.replace('/');
      }, 500);
      // Re-throwing might prevent the redirect, consider if needed
      // throw err;
    }
  };


  // Function to check and refresh token if needed
  const checkAndRefreshSession = useCallback(async (force = false) => {
    // ... (implementation unchanged)
    try {
        console.log('Checking session status...');
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          return { success: false, error: new Error(error.message || 'Session error') };
        }

        if (!data.session) {
          console.log('No active session found');
          // Ensure user state is null if no session
          if (user !== null) {
             setUser(null);
             setHasCompletedProfile(false);
          }
          return { success: false, error: new Error('No active session found') };
        }

        const expiresAt = data.session.expires_at || 0;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;
        console.log(`Session found. Expires in ${timeUntilExpiry} seconds`);

        if (force || timeUntilExpiry < 300) {
          console.log('Session expiring soon or force refresh requested. Refreshing now...');
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError) {
              if (refreshError.message && refreshError.message.includes('Auth session missing')) {
                console.log('Session completely expired or missing, clearing local state and signing out');
                setUser(null);
                setHasCompletedProfile(false);
                setLoading(false); // Ensure loading is false here
                // Use the existing signOut logic for cleanup
                await signOut();
                return { success: false, error: new Error('Your session has expired. Please log in again.') };
              }
              console.error('Failed to refresh session:', refreshError);
              return { success: false, error: new Error(refreshError.message || 'Failed to refresh session') };
            }

            if (refreshData.session && refreshData.user) {
              console.log('Session refreshed successfully');
              localStorage.setItem('last_session_refresh', new Date().toISOString());
              if (refreshData.session.expires_at) {
                localStorage.setItem('session_expires_at', new Date(refreshData.session.expires_at * 1000).toISOString());
              }
              setUser(refreshData.user);
              await checkProfileCompletion(refreshData.user);
              return { success: true, session: refreshData.session };
            }

            // If refreshData is unexpectedly empty
            console.warn('Refresh session returned no data, assuming failure.');
            return { success: false, error: new Error('Failed to refresh session (no data)') };

          } catch (e) {
            console.error('Exception during session refresh:', e);
            return { success: false, error: e instanceof Error ? e : new Error('Unknown error during session refresh') };
          }
        }
        // If session is valid and not expiring soon
        // Ensure user state matches current session user
        if (user?.id !== data.session.user.id) {
            console.log('User state mismatch, updating user from current session.');
            setUser(data.session.user);
            await checkProfileCompletion(data.session.user);
        }
        return { success: true, session: data.session };
      } catch (e) {
        console.error('Error in checkAndRefreshSession:', e);
        return { success: false, error: e instanceof Error ? e : new Error('Unknown error checking session') };
      }
  }, [checkProfileCompletion, signOut, user]); // Added user to dependencies as it's checked inside


  // Function to explicitly refresh user data from Supabase
  const refreshUserData = useCallback(async () => {
    // ... (implementation unchanged)
    console.log('AuthProvider: Refreshing user data explicitly...');
    try {
      const { data: { user: fetchedUser }, error: getUserError } = await supabase.auth.getUser();

      if (getUserError) {
        console.error('AuthProvider: Error during explicit user refresh:', getUserError);
        // Consider if an error here means the user is logged out
        // setError(getUserError); // Optionally set global error
        return;
      }

      if (fetchedUser) {
        console.log('AuthProvider: User data refreshed successfully.', fetchedUser.id, fetchedUser.user_metadata);
        setUser(fetchedUser);
        await checkProfileCompletion(fetchedUser);
      } else {
        console.log('AuthProvider: No user found during refresh. Clearing state.');
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
    // ... (implementation unchanged)
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
          setUser(null); // Ensure user is null on error
          setHasCompletedProfile(false);
        } else if (session) {
          console.log('[AuthProvider useEffect] initializeAuth: Active session found:', session.user.id);
          setUser(session.user);
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
        setAuthCompleted(true);
        initializingRef.current = false;
        initCompletedRef.current = true;
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthProvider onAuthStateChange] Event: ${event}, Session User: ${session?.user?.id ?? 'null'}`);

      // Allow processing only after initial check is complete
      if (!initCompletedRef.current && event !== 'INITIAL_SESSION') {
           console.log('[AuthProvider onAuthStateChange] Skipping event, initialization not complete yet.');
           return;
      }

      const currentSessionUser = session?.user || null;

      // Update user state based on the session immediately
      setUser(currentSessionUser);

      switch (event) {
        case 'SIGNED_IN':
        case 'USER_UPDATED':
          console.log(`[AuthProvider onAuthStateChange] ${event}: User state updated. Checking profile completion...`);
          if (currentSessionUser) {
            await checkProfileCompletion(currentSessionUser);
          } else {
             console.warn(`[AuthProvider onAuthStateChange] ${event}: No user in session despite event.`);
             setHasCompletedProfile(false);
          }
          // Ensure loading is false after sign-in confirmation
          setLoading(false);
          break;

        case 'TOKEN_REFRESHED':
           console.log('[AuthProvider onAuthStateChange] TOKEN_REFRESHED: Session potentially updated.');
           if (currentSessionUser) {
              // Profile status likely unchanged on token refresh, but maybe check if unsure
              // Optional: await checkProfileCompletion(currentSessionUser);
           } else {
              console.warn('[AuthProvider onAuthStateChange] TOKEN_REFRESHED: No user in session.');
              setHasCompletedProfile(false);
           }
           // Ensure loading is false after refresh confirmation
           setLoading(false);
           break;

        case 'SIGNED_OUT':
          console.log('[AuthProvider onAuthStateChange] SIGNED_OUT: Resetting state.');
          // setUser(null) already done above
          setHasCompletedProfile(false);
          setError(null); // Clear any previous errors on sign out
          setLoading(false); // Ensure loading is false
          break;

        case 'PASSWORD_RECOVERY':
          console.log('[AuthProvider onAuthStateChange] PASSWORD_RECOVERY event.');
          // Typically no user state change needed here, maybe set loading?
          setLoading(false);
          break;

        case 'INITIAL_SESSION':
           console.log('[AuthProvider onAuthStateChange] INITIAL_SESSION event. Handled by initial useEffect.');
           // Initial useEffect handles user setting and profile check.
           // setLoading(false) is handled in initializeAuth's finally block.
           break;

        default:
          console.warn('[AuthProvider onAuthStateChange] Unhandled auth event:', event);
          // Ensure loading state is reasonable for unhandled cases
          if (!currentSessionUser) {
             setLoading(false);
          }
      }
    });

    return () => {
      if (subscription) {
        console.log('[AuthProvider useEffect] Cleaning up auth listener.');
        subscription.unsubscribe();
      }
    };
  }, [checkProfileCompletion]); // Dependency remains correct

  // User registration
  const signUp = async (email: string, password: string, fullName: string) => {
    // ... (implementation unchanged)
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName, // Stored in auth.users.raw_user_meta_data
            // profile_completed: false // Can be set here too if desired
          }
        }
      });

      if (error) throw error;

      // IMPORTANT: Supabase sign-up might automatically sign the user in
      // or require email verification. The onAuthStateChange listener
      // should handle the user state update if auto-sign-in occurs.

      // Optionally create profile immediately (consider if needed vs. profile completion step)
      // if (data.user) {
      //   try {
      //     // Ensure your 'profiles' table uses 'id' as the primary key matching auth.users.id
      //     await supabase.from('profiles').insert([{
      //       id: data.user.id, // Match auth user ID
      //       email: email, // Redundant? email is in auth.users
      //       full_name: fullName,
      //       // Set defaults for your profile table columns
      //       is_profile_completed: false,
      //       skipped_profile_completion: false,
      //     }]).select(); // Use .select() to potentially catch insert errors better
      //     console.log('Initial profile row created for user:', data.user.id);
      //   } catch (profileError) {
      //     console.error('AuthProvider: Error creating user profile entry:', profileError);
      //     // Decide how to handle profile creation failure - maybe delete the auth user?
      //   }
      // }

    } catch (err) {
      console.error("Sign up error:", err)
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err; // Re-throw for the calling component
    } finally {
        setLoading(false);
    }
  };

  // User sign in
  const signIn = async (email: string, password: string) => {
    // ... (implementation unchanged)
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      // onAuthStateChange will handle setting user state and loading=false

    } catch (err) {
      console.error("Sign in error:", err)
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false); // Set loading false on error
      throw err; // Re-throw for the calling component
    }
    // No finally setLoading(false) here, let onAuthStateChange handle success case
  };

  // Password reset
  const resetPassword = async (email: string) => {
    // ... (implementation unchanged)
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Optional: Specify the URL to redirect the user to after clicking the email link
        // redirectTo: 'https://your-app.com/update-password',
      });
      if (error) throw error;
      console.log('Password reset email sent successfully.');
    } catch (err) {
      console.error("Reset password error:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err; // Re-throw
    } finally {
        setLoading(false);
    }
  };

  // Function to sign in with Google OAuth
  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    // ... (implementation unchanged)
    setLoading(true); // Indicate loading state
    setError(null);
    try {
      console.log('[AuthProvider] signInWithGoogle: Initiating Google OAuth...');

      // Determine the redirect URL - IMPORTANT: Ensure this matches Supabase OAuth settings
      const finalRedirectTo = redirectTo || window.location.origin + '/auth/callback'; // Default to app origin + callback path
      console.log('[AuthProvider] signInWithGoogle: Using redirect URL:', finalRedirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: finalRedirectTo,
          skipBrowserRedirect: false, // Let Supabase handle the redirect
          queryParams: {
            access_type: 'offline', // Request refresh token
            prompt: 'consent', // Force consent screen for refresh token
          },
        },
      });

      if (error) {
        console.error('[AuthProvider] signInWithGoogle: Error initiating OAuth', error);
        setError(new Error(error.message));
        setLoading(false); // Stop loading on error
        return { data: null, error: new Error(error.message) };
      }

      console.log('[AuthProvider] signInWithGoogle: Supabase initiated redirect. URL (if available):', data?.url);
      // Browser should automatically redirect if skipBrowserRedirect is false.
      // No need for manual window.location.href = data.url; unless skipBrowserRedirect is true

      // Return the data (which might just be the URL)
      return { data, error: null };

    } catch (err) {
      console.error('[AuthProvider] signInWithGoogle: Exception caught', err);
      const finalError = err instanceof Error ? err : new Error(String(err));
      setError(finalError);
      setLoading(false); // Stop loading on exception
      return { data: null, error: finalError };
    }
  }, []); // Empty dependency array is correct here


  // Password update (typically after user clicks reset link)
  const updatePassword = async (newPassword: string) => {
    // Note: The token is usually handled implicitly by Supabase
    // when this is called on the page the user lands on from the email link.
    // The session should be automatically updated by Supabase via the recovery link.
    setLoading(true);
    setError(null);
    try {
      // Check if user is actually authenticated (should be if they followed the link)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
          throw new Error("User not authenticated. Cannot update password.");
      }

      console.log('Attempting to update password for user:', currentUser.id);
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Error updating password:', updateError);
        throw updateError;
      }

      console.log('Password updated successfully.');
      // Optional: Sign out or redirect after successful update
      // await signOut();
      // window.location.replace('/login');

    } catch (err) {
      console.error('Error in updatePassword:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err; // Re-throw
    } finally {
        setLoading(false);
    }
  };

  // Redirect to home page (consider using React Router's navigation if applicable)
  const redirectToHome = () => {
    // Using replace to avoid adding the current page to history
    window.location.replace('/home');
  };

  // Emergency sign out
  const emergencySignOut = () => {
    // ... (implementation unchanged)
    console.warn('Performing emergency sign out...');
    try {
      // Clear all known Supabase/auth keys from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
          console.log('Emergency removing localStorage key:', key);
          localStorage.removeItem(key);
        }
      });
      // Clear session storage too
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
           console.log('Emergency removing sessionStorage key:', key);
          sessionStorage.removeItem(key);
        }
      });
      // Clear cookies (basic attempt)
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    } catch (e) {
      console.error('Error clearing storage during emergency sign out:', e);
    } finally {
      // Force reload to the root path, bypassing caches if possible
      console.log('Emergency redirecting to /');
      window.location.href = '/';
    }
  };

  // Define the context value to be provided
  const value: AuthContextType = {
    user,
    setUser, // Exposing setUser allows components to directly manipulate user state (use with caution)
    loading,
    error,
    hasCompletedProfile,
    setHasCompletedProfile, // Exposing setter
    signUp,
    signIn,
    signOut,
    emergencySignOut,
    signInWithGoogle,
    refreshSession: checkAndRefreshSession, // Use the checkAndRefresh function
    resetPassword,
    // updatePassword takes only newPassword now, token is implicit
    updatePassword: (token: string, newPassword: string) => updatePassword(newPassword), // Adapt interface slightly if needed, or change func signature
    redirectToHome,
    refreshUserData, // Expose the explicit refresh function
  };

  // Provide the context value to children components
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};


// Custom hook to use the AuthContext (Removed the duplicate useAuth)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};