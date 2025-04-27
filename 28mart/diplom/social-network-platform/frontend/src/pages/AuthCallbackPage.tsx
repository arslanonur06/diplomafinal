import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

// Environment variables (no hardcoded fallbacks, rely on render env vars)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Local Supabase client for manual setSession if needed
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

  // Helper function to parse hash fragment
  const parseHashFragment = (hash: string): Record<string, string> | null => {
    if (!hash || hash.length < 2) return null;
    
    const fragment = hash.substring(1); // remove leading '#'
    const pairs = fragment.split('&');
    const result: Record<string, string> = {};
    
    pairs.forEach(pair => {
      try {
        const [key, value] = pair.split('=');
        if (key && value) {
          result[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
        }
      } catch (e) {
        console.warn('AuthCallback: Failed to parse key-value pair in hash:', pair, e);
      }
    });
    
    return result;
  };

  useEffect(() => {
    let isMounted = true;
    
    const handleCallback = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);
        setError(null); // Clear previous errors
        
        console.log('=========================');
        console.log('AuthCallbackPage: Processing OAuth callback');
        console.log('CURRENT URL:', window.location.href);
        console.log('URL Hash:', window.location.hash);
        console.log('Environment check:');
        console.log('- VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL || 'NOT SET');
        console.log('- VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
        console.log('=========================');

        // Collect debug info
        const debugData = {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          hash: window.location.hash,
          supabaseUrlUsed: SUPABASE_URL,
          supabaseKeySet: !!SUPABASE_KEY,
          userAgent: navigator.userAgent,
          authMethodAttempted: 'None'
        };
        setDebugInfo(debugData);

        // APPROACH 1: Check existing session (using main supabase client)
        try {
          debugData.authMethodAttempted = 'getSession';
          setDebugInfo({...debugData});
          console.log('AuthCallback: Attempt 1 - Checking existing session...');
          const { data, error: getSessionError } = await supabase.auth.getSession();
          
          if (getSessionError) {
            console.error('AuthCallback: Error getting session:', getSessionError);
          } else if (data?.session) {
            console.log('AuthCallback: SUCCESS (Approach 1)! Valid session detected:', data.session.user.id);
            localStorage.setItem('auth_method', 'existing_session');
            toast.success('Already signed in!');
            navigate('/home', { replace: true });
            return;
          } else {
            console.log('AuthCallback: No existing session found.');
          }
        } catch (sessionErr) {
          console.error('AuthCallback: getSession check error:', sessionErr);
        }
          
        // APPROACH 2: Try standard code exchange (using main supabase client)
        try {
          debugData.authMethodAttempted = 'exchangeCodeForSession';
          setDebugInfo({...debugData});
          console.log('AuthCallback: Attempt 2 - Trying exchangeCodeForSession...');
          const query = new URLSearchParams(window.location.search);
          const code = query.get('code');
          
          if (code) {
            console.log('AuthCallback: Using code:', code);
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (exchangeError) {
              console.error('AuthCallback: Detailed exchangeCodeForSession error:', {
                message: exchangeError.message,
                name: exchangeError.name,
                status: exchangeError.status,
                stack: exchangeError.stack
              });
              throw exchangeError;
            }
            
            const { data: refreshData } = await supabase.auth.getSession();
            if (refreshData?.session) {
              console.log('AuthCallback: SUCCESS (Approach 2)! Session obtained via code exchange:', refreshData.session.user.id);
              localStorage.setItem('auth_method', 'code_exchange');
              toast.success('Successfully signed in!');
              navigate('/home', { replace: true });
              return;
            } else {
              console.error('AuthCallback: exchangeCodeForSession succeeded but no session found afterwards.');
              throw new Error('No session found after code exchange');
            }
          } else {
            console.error('AuthCallback: No code in query params');
            throw new Error('No authentication code provided');
          }
        } catch (exchangeErr) {
          console.error('AuthCallback: exchangeCodeForSession catch error:', exchangeErr);
        }
        
        // APPROACH 3: Manually process hash (using callbackSupabase client for setSession)
        if (window.location.hash) {
          try {
            debugData.authMethodAttempted = 'manualHashParsing';
            setDebugInfo({...debugData});
            console.log('AuthCallback: Attempt 3 - Processing hash fragment...');
            const hashParams = parseHashFragment(window.location.hash);
            
            if (hashParams && hashParams.access_token) {
              console.log('AuthCallback: Found access_token in hash. Params:', Object.keys(hashParams).join(', '));
              const sessionOptions = {
                access_token: hashParams.access_token,
                refresh_token: hashParams.refresh_token || ''
              };
              console.log('AuthCallback: Calling setSession with tokens...');
              
              const { data: sessionData, error: sessionError } = await callbackSupabase.auth.setSession(sessionOptions);
              
              if (sessionError) {
                console.error('AuthCallback: Error setting session manually:', sessionError);
                throw sessionError;
              }
              
              if (sessionData?.session) {
                console.log('AuthCallback: SUCCESS (Approach 3)! Session set manually:', sessionData.session.user.id);
                localStorage.setItem('auth_method', 'manual_hash');
                
                await supabase.auth.setSession(sessionOptions);
                
                toast.success('Successfully signed in!');
                navigate('/home', { replace: true });
                return;
              } else {
                console.error('AuthCallback: Manual setSession call did not return a session.');
              }
            } else if (hashParams?.error) {
              console.error('AuthCallback: Error found in hash fragment:', hashParams.error, hashParams.error_description);
              throw new Error(`OAuth Provider Error: ${hashParams.error_description || hashParams.error}`);
            } else {
              console.error('AuthCallback: No access_token or error found in hash.');
            }
          } catch (manualErr) {
            console.error('AuthCallback: Manual hash processing error:', manualErr);
            if (manualErr instanceof Error) throw manualErr;
          }
        } else {
          console.log('AuthCallback: No hash fragment present in URL.');
        }
        
        // If all approaches failed
        console.error('AuthCallback: All authentication approaches failed.');
        throw new Error('Unable to establish session. Please try logging in again.');

      } catch (err: any) {
        console.error('AuthCallbackPage: Fatal error during callback handling:', err);
        if (isMounted) {
          setError(err.message || 'An unknown error occurred during authentication.');
          setLoading(false);
          setDebugInfo((prev: any) => ({ ...prev, error: err.message, finalStatus: 'Failed' }));
        }
      }
    };

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

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