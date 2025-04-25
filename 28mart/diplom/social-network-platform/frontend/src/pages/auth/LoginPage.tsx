import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Link } from 'react-router-dom';
import logo from '../../logo.svg';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/input';
import { FiMail, FiLock, FiEye, FiEyeOff, FiLogIn } from 'react-icons/fi';
import { FaGithub, FaGoogle } from 'react-icons/fa';

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  const { language, translateText } = useLanguage();
  const [translations, setTranslations] = useState({
    signInToAccount: 'Sign in to your account',
    connectWithCommunity: 'Connect with your community and friends',
    signInWithGoogle: 'Sign in with Google',
    signingIn: 'Signing in...',
    redirectingToOAuth: 'Redirecting to authentication service...',
    back: 'Back'
  });

  // Translate all texts on language change
  useEffect(() => {
    const updateTranslations = async () => {
      if (language === 'EN') return;
      
      try {
        const [
          signInToAccount,
          connectWithCommunity,
          signInWithGoogle,
          signingIn,
          redirectingToOAuth,
          back
        ] = await Promise.all([
          translateText('Sign in to your account'),
          translateText('Connect with your community and friends'),
          translateText('Sign in with Google'),
          translateText('Signing in...'),
          translateText('Redirecting to authentication service...'),
          translateText('Back')
        ]);

        setTranslations({
          signInToAccount,
          connectWithCommunity,
          signInWithGoogle,
          signingIn,
          redirectingToOAuth,
          back
        });
      } catch (error) {
        console.error('Error translating login texts:', error);
      }
    };

    updateTranslations();
  }, [language, translateText]);

  // Add better error handling for Google login
  const handleGoogleLogin = async () => {
    setLoading(true);
    console.log('Starting Google OAuth sign-in process...');
    
    try {

      const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
      // Use the current window origin to build the redirect URL
      const redirectTo = `${backendUrl}/api/auth/google/callback`;
      console.log(`Using dynamic redirect URL: ${redirectTo}`);
      
      // Call the signInWithGoogle function with the dynamic redirect URL
      const { error } = await signInWithGoogle(redirectTo);
      
      if (error) {
        console.error('Error during Google login initiation:', error);
        const errorMessage = await translateText(error.message || 'Login failed. Please try again.');
        toast.error(errorMessage);
        setLoading(false);
      } else {
        const infoMessage = await translateText('Redirecting to Google for authentication...');
        toast.success(infoMessage, { duration: 5000 });
        // Keep loading true as the redirect will happen
      }
    } catch (err) {
      console.error('Unexpected error during Google login initiation:', err);
      const errorMessage = await translateText('An unexpected error occurred. Please try again.');
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
        <div className="flex flex-col items-center">
          <img src={logo} alt="Logo" className="h-20 mb-4" />
          <h2 className="mt-6 text-center text-3xl font-extrabold bg-gradient-to-r from-gray-700 via-indigo-500 to-rose-500 text-transparent bg-clip-text dark:from-gray-300 dark:via-indigo-400 dark:to-rose-400" data-i18n>
            {translations.signInToAccount}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400" data-i18n>
            {translations.connectWithCommunity}
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <form>
            <div className="mt-6">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </div>

            <div className="my-6 flex items-center">
              <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
              <span className="mx-4 flex-shrink text-sm text-gray-500 dark:text-gray-400">OR</span>
              <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
            </div>

            <div className="space-y-3">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleGoogleLogin} 
                className="w-full"
              >
                <FaGoogle className="mr-2" /> {translations.signInWithGoogle}
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => toast('GitHub login not implemented yet')}
                className="w-full"
              >
                <FaGithub className="mr-2" /> Sign in with GitHub
              </Button>
            </div>
          </form>
          
          <Link to="/">
            <Button className="w-full bg-gradient-to-r from-gray-400 to-gray-600">
              <span data-i18n>{translations.back}</span>
            </Button>
          </Link>
          
          {loading && (
            <div className="flex justify-center">
              <div className="animate-pulse text-sm text-gray-500 dark:text-gray-400 mt-4 text-center" data-i18n>
                {translations.redirectingToOAuth}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 