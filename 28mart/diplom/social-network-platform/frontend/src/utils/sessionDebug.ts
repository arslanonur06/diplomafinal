// Session Debugging and Recovery Utilities
import { supabase } from '../services/supabase';

/**
 * Session debugging utility - prints detailed information about the current session
 * This can help diagnose authentication issues
 */
export const debugSession = async (): Promise<void> => {
  console.group('===== SESSION DEBUG INFORMATION =====');
  
  try {
    // Check for session in Supabase
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error retrieving session:', error);
    } else if (!data.session) {
      console.log('No active Supabase session found');
    } else {
      console.log('Active session details:');
      
      // Safe session info (no sensitive data)
      const safeSession = {
        user_id: data.session.user.id,
        email: data.session.user.email,
        expires_at: data.session.expires_at 
          ? new Date(data.session.expires_at * 1000).toISOString()
          : 'unknown',
        created_at: data.session.user.created_at || 'unknown',
        last_refresh_at: data.session.refresh_token 
          ? new Date(parseInt(data.session.refresh_token.split('.')[1]) * 1000).toISOString()
          : 'unknown'
      };
      
      console.log(safeSession);
    }
    
    // Check local storage for session data
    console.log('\nLocal Storage Session Information:');
    const localStorageKeys = [
      'supabase.auth.token',
      'current_user',
      'has_session',
      'auth_user_id',
      'session_expires_at',
      'last_session_refresh'
    ];
    
    localStorageKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`${key}: ${value ? 'Present' : 'Not found'}`);
    });
    
    // Session expiry check
    const expiresAtStr = localStorage.getItem('session_expires_at');
    if (expiresAtStr) {
      const expiresAt = new Date(expiresAtStr);
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      
      console.log(`\nSession expires in: ${Math.floor(diff / 1000 / 60)} minutes`);
      console.log(`Session expiry time: ${expiresAt.toLocaleString()}`);
    }
    
  } catch (e) {
    console.error('Error during session debugging:', e);
  }
  
  console.groupEnd();
};

/**
 * Performs a complete sign-out and clears all session data
 * Useful for recovering from corrupted sessions
 */
export const emergencySessionRecovery = async (): Promise<boolean> => {
  try {
    console.log('Performing emergency session recovery...');
    
    // Clear all local storage items related to auth
    const authKeys = [
      'supabase.auth.token',
      'current_user',
      'has_session',
      'auth_user_id',
      'session_expires_at', 
      'last_session_refresh'
    ];
    
    authKeys.forEach(key => localStorage.removeItem(key));
    
    // Attempt sign out from Supabase
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error during Supabase signOut:', e);
      // Continue with recovery regardless of signOut success
    }
    
    // Clear any session cookies
    document.cookie.split(";").forEach(c => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });
    
    console.log('Emergency session recovery completed.');
    console.log('Please reload the page and sign in again.');
    
    // Return true to indicate recovery was performed
    return true;
  } catch (e) {
    console.error('Error during emergency session recovery:', e);
    return false;
  }
};

// Call this when user gets the "Auth session missing" error
export const handleAuthSessionMissing = (): void => {
  console.log('Auth session missing error detected. Attempting recovery...');
  
  // First try to debug the current session state
  debugSession();
  
  // Show guidance to user
  alert(
    'Authentication issue detected. This might be caused by an expired or corrupted session. ' +
    'The page will now reload to fix this issue. Please sign in again after the reload.'
  );
  
  // Perform recovery
  emergencySessionRecovery();
  
  // Redirect to login after a short delay
  setTimeout(() => {
    window.location.href = '/login?recovery=true';
  }, 1000);
};

export default { debugSession, emergencySessionRecovery, handleAuthSessionMissing }; 