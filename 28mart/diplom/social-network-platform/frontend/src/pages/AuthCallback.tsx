import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback: React.FC = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const [isProcessing, setIsProcessing] = useState(true);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    console.log('[AuthCallback] Mounting...');
    
    // Log URL details immediately
    const currentUrl = new URL(window.location.href);
    const urlParts = {
      protocol: currentUrl.protocol,
      host: currentUrl.host,
      hostname: currentUrl.hostname,
      port: currentUrl.port,
      pathname: currentUrl.pathname,
      search: currentUrl.search,
      hash: currentUrl.hash,
      fullUrl: window.location.href,
      localStorageRedirect: localStorage.getItem('redirectUrl') || 'Not set'
    };
    console.log('[AuthCallback] URL parts:', urlParts);
    setDebugInfo(urlParts);

    // Supabase client with detectSessionInUrl=true should handle the hash automatically.
    // We just need to wait for the session state to update in AuthContext.
    
    // Set a timeout to prevent getting stuck indefinitely
    const timer = setTimeout(() => {
      if (isProcessing) {
        console.warn('[AuthCallback] Processing timed out after 10 seconds.');
        setError('Authentication process timed out. Please try logging in again.');
        setIsProcessing(false);
      }
    }, 10000); // 10-second timeout

    return () => {
      clearTimeout(timer);
      console.log('[AuthCallback] Unmounting...');
    };
  }, []); // Run only once on mount

  useEffect(() => {
    // Monitor the session state from AuthContext
    console.log('[AuthCallback] Auth state check:', { user: !!user, authLoading });

    if (!authLoading) {
      if (user) {
        // Session established successfully
        console.log('[AuthCallback] Session found! Redirecting based on profile status...');
        localStorage.removeItem('redirectUrl'); // Clean up
        setIsProcessing(false);
        // Navigate component will handle the redirect
      } else {
        // If still no session after auth context loaded, check time elapsed
        const timeElapsed = Date.now() - startTime;
        if (timeElapsed > 3000) { // Allow 3 seconds for Supabase to process
          console.error('[AuthCallback] No session established after loading.');
          // Check if there was an error parameter in the hash
          const hashParams = new URLSearchParams(location.hash.substring(1));
          const errorParam = hashParams.get('error');
          const errorDesc = hashParams.get('error_description');
          
          if (errorParam) {
            setError(`Authentication failed: ${errorDesc || errorParam}`);
          } else if (!location.hash) {
             setError('Authentication failed: No token information found in URL.');
          } else {
             setError('Authentication failed. Please try logging in again.');
          }
          setIsProcessing(false);
        }
      }
    }
  }, [user, authLoading, location.hash, startTime]);

  // Redirect logic: If processing is done and we have a session, redirect to home or profile completion
  if (!isProcessing && user) {
    // Let RequireAuth/RequireProfileCompletion handle the final redirect
    // Usually redirect to home, assuming profile completion check happens elsewhere
    console.log('[AuthCallback] Redirecting to /home');
    return <Navigate to="/home" replace />;
  }

  // Display loading or error state
  if (isProcessing) {
    return (
      <div className="auth-processing" style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Processing authentication...</h2>
        <p>Please wait while we complete your sign in.</p>
        <pre style={{ fontSize: '0.7em', color: 'grey', marginTop: '20px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
    );
  }
  
  // If not processing and there's an error (or no session)
  return (
    <div className="auth-callback-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Authentication Failed</h1>
      
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '20px' }}>
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}
      
      <div className="debug-info" style={{ background: '#f5f5f5', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
        <h2>Debug Information</h2>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
        
        <div style={{ marginTop: '20px' }}>
          <h3>Environment Variables (Loaded)</h3>
          <p><strong>VITE_SUPABASE_URL:</strong> {import.meta.env.VITE_SUPABASE_URL || 'Not set'}</p>
          <p><strong>API Key:</strong> {import.meta.env.VITE_SUPABASE_KEY ? 'Set (hidden)' : 'Not set'}</p>
        </div>
      </div>
      
      <button 
        onClick={() => window.location.href = '/login'} 
        style={{ padding: '10px 15px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
      >
        Return to Login
      </button>
    </div>
  );
};

export default AuthCallback; 