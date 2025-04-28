import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { User, Session, AuthError, Provider } from '@supabase/supabase-js';

// Update the return type for signInWithGoogle
interface GoogleSignInResponse {
  data: {
    provider?: Provider;
    url?: string | null;
  } | null;
  error: AuthError | null;
}

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
  signInWithGoogle: (redirectTo?: string) => Promise<GoogleSignInResponse>;
  refreshSession: () => Promise<{
    success: boolean;
    session?: Session;
    error?: Error;
  }>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (token: string, newPassword: string) => Promise<void>;
  redirectToHome: () => void;
  refreshUserData: () => Promise<void>;
  isAuthenticated: boolean;
}

// Create context with default values
const defaultContext: AuthContextType = {
  user: null,
  setUser: () => {},
  loading: true,
  error: null,
  hasCompletedProfile: false,
  setHasCompletedProfile: () => {},
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  emergencySignOut: () => {},
  signInWithGoogle: async () => ({ data: null, error: null }),
  refreshSession: async () => ({ success: false }),
  resetPassword: async () => {},
  updatePassword: async () => {},
  redirectToHome: () => {},
  refreshUserData: async () => {},
  isAuthenticated: false
};

export const AuthContext = createContext<AuthContextType>(defaultContext);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (err) {
        console.error('Error checking session:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (redirectTo?: string): Promise<GoogleSignInResponse> => {
    try {
      const response = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });
      
      return {
        data: response.data,
        error: response.error,
      };
    } catch (error) {
      return {
        data: null,
        error: error as AuthError,
      };
    }
  };

  const value: AuthContextType = {
    user,
    setUser,
    loading,
    error,
    hasCompletedProfile,
    setHasCompletedProfile,
    signUp: async () => {}, // Implement as needed
    signIn: async () => {}, // Implement as needed
    signOut: async () => {}, // Implement as needed
    emergencySignOut: () => {}, // Implement as needed
    signInWithGoogle,
    refreshSession: async () => ({ success: false }), // Implement as needed
    resetPassword: async () => {}, // Implement as needed
    updatePassword: async () => {}, // Implement as needed
    redirectToHome: () => {}, // Implement as needed
    refreshUserData: async () => {}, // Implement as needed
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ...rest of your code...
