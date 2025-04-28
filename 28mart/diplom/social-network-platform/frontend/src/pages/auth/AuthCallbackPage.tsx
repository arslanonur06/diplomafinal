import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase } from '../supabaseClient';

const AuthCallbackPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('code') || hashParams.get('code');

        if (!code) {
          throw new Error('No authorization code found');
        }

        // Exchange code for session
        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

        if (sessionError) {
          throw sessionError;
        }

        if (data?.session) {
          toast.success('Successfully signed in!');
          navigate('/dashboard', { replace: true });
        }
      } catch (err: any) {
        console.error('AuthCallbackPage Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate]);

  // ...rest of the component...
};

export default AuthCallbackPage;
