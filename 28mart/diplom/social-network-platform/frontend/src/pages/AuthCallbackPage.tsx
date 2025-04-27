import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase'; // Use the main client now
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js'; // Keep createClient for local instance if needed

// Re-add environment variables for clarity, ensure they match .env.local
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ohserebigziyxlxpkaib.supabase.co'; // Replace with your project URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oc2VyZWJpZ3ppeXhseHBrYWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjMxMTUsImV4cCI6MjA1NTczOTExNX0.EWSzRxtsyEz9rGdwuPS-0E-vTmZip-q2ZapDyZpx-uI'; // Replace with your anon key

console.log('Using Supabase URL:', SUPABASE_URL);
console.log('Using Supabase Key:', SUPABASE_KEY);

// Re-introduce the local Supabase client specifically for the manual setSession if needed
const callbackSupabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Manual processing
  },
});

const AuthCallbackPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null); // Use any for complex debug object
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);
        setError(null);

        console.log('AuthCallbackPage: Processing OAuth callback...');
        console.log('CURRENT URL:', window.location.href);

        // Ensure the full URL is passed to exchangeCodeForSession
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);

        if (exchangeError) {
          console.error('AuthCallbackPage: Error during exchangeCodeForSession:', exchangeError);
          throw new Error(exchangeError.message || 'Failed to exchange code for session.');
        }

        // Check if the session was successfully established
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !sessionData?.session) {
          console.error('AuthCallbackPage: No session found after code exchange:', sessionError);
          throw new Error('Unable to establish session. Please try logging in again.');
        }

        console.log('AuthCallbackPage: Session established successfully:', sessionData.session.user.id);
        toast.success('Successfully signed in!');
        navigate('/home', { replace: true });
      } catch (err: any) {
        console.error('AuthCallbackPage: Error during callback handling:', err);
        setError(err.message || 'An unknown error occurred during authentication.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // UI Remains similar to previous versions, showing loading or error state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-neutral-900 p-4">
      <div className="text-center max-w-lg w-full">
        {loading && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Processing Authentication...</h1>
            <p className="text-gray-600 dark:text-gray-400">Please wait while we verify your login.</p>
          </>
        )}
        {error && (
          <>
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-xl font-semibold text-red-600 dark:text-red-400 mt-4 mb-2">Authentication Failed</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4 whitespace-pre-wrap">{error}</p>
            <button 
              onClick={() => navigate('/login', { replace: true })}
              className="mt-6 px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600 transition-colors"
            >
              Return to Login
            </button>
          </>
        )}
        {/* Optional Debug Output */}
        {debugInfo && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400">Show Debug Info</summary>
            <pre className="mt-2 text-xs bg-gray-200 dark:bg-gray-800 p-3 rounded overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default AuthCallbackPage;