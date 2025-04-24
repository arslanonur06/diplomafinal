import React, { useEffect, useState, createContext, useContext } from 'react';
import { supabase } from '../services/supabase';

// Create a single instance of GoTrueClient to be used throughout the app
const supabaseAuth = supabase.auth;

interface User {
  id: string;
  email?: string;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  authStatus: AuthStatus;
  updatePassword: (newPassword: string) => Promise<void>;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  authStatus: 'loading',
  updatePassword: async () => {}
});

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  // Function to check if profile is complete
  const checkProfileCompletion = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    }
  };

  useEffect(() => {
    console.log('AuthProvider: Initializing...', { supabaseUrl: import.meta.env.VITE_SUPABASE_URL });
    
    // Use the existing supabaseAuth instance instead of supabase.auth
    const getSession = async () => {
      console.log('AuthProvider: Getting session...');
      try {
        const { data, error } = await supabaseAuth.getSession();
        if (error) {
          throw error;
        }
        
        if (data.session?.user) {
          setUser(data.session.user);
          checkProfileCompletion(data.session.user.id);
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('unauthenticated');
        }
        
        return data.session;
      } catch (error) {
        console.error('Error getting session:', error);
        setAuthStatus('unauthenticated');
        return null;
      }
    };

    // Initial session check
    getSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabaseAuth.onAuthStateChange(
      async (event: string, session: any) => {
        console.log('AuthProvider: Auth state changed:', event);
        if (session?.user) {
          console.log('AuthProvider: New user state:', session.user.id);
          setUser(session.user);
          checkProfileCompletion(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setAuthStatus(event === 'SIGNED_IN' ? 'authenticated' : 'unauthenticated');
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Update password function
  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabaseAuth.updateUser({ password: newPassword });
      if (error) throw error;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  };

  // Provide auth context to children
  return (
    <AuthContext.Provider value={{ 
      user, 
      profile,
      authStatus,
      updatePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};