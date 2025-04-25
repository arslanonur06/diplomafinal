import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaGoogle, FaArrowLeft, FaGithub } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/input';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
// Import the logo from public folder instead
// import logo from '../logo.svg';

const EmergencySignOutSection = ({ onEmergencySignOut }: { onEmergencySignOut: () => void }) => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const hasAuthIssue = params.has('emergency_logout') || 
                       params.has('session_expired') || 
                       params.has('auth_error');

  if (!hasAuthIssue) return null;

  return (
    <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
      <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
        Authentication Issues?
      </h3>
      <p className="text-xs text-red-700 dark:text-red-300 mb-3">
        If you're stuck in a login loop or experiencing authentication problems, use the emergency sign-out button to clear all session data.
      </p>
      <button
        onClick={onEmergencySignOut}
        className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
      >
        Emergency Sign Out
      </button>
    </div>
  );
};

const LoginPage: React.FC = () => {
  const { signIn, signInWithGoogle, emergencySignOut } = useAuth();
  const { language, translateText } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Set the path to the new logo
  const logoPath = '/connect-me-logo.png'; // This assumes you'll save the image as connect-me-logo.png in the public folder

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [translations, setTranslations] = useState({
    welcomeBack: 'Welcome Back',
    dontHaveAccount: "Don't have an account?",
    register: 'Register',
    signInWithGoogle: 'Sign in with Google',
    orContinueWithEmail: 'Or continue with email',
    emailAddress: 'Email address',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?', 
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    back: 'Back to Landing Page'
  });

  // Translate all texts on language change
  useEffect(() => {
    const updateTranslations = async () => {
      if (language === 'EN') return;
      
      try {
        const textsToTranslate = Object.keys(translations).map(key => translations[key as keyof typeof translations]);
        const translatedTexts = await Promise.all(
          textsToTranslate.map(text => translateText(text))
        );
        
        const keys = Object.keys(translations) as Array<keyof typeof translations>;
        const newTranslations = { ...translations };
        
        keys.forEach((key, index) => {
          newTranslations[key] = translatedTexts[index];
        });
        
        setTranslations(newTranslations);
      } catch (error) {
        console.error('Error translating login texts:', error);
      }
    };

    updateTranslations();
  }, [language, translateText, translations]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.email || !formData.password) {
      const errorMessage = await translateText('Please fill in all fields');
      setError(errorMessage);
      return;
    }
    
    try {
      setLoading(true);
      console.log('[LOGIN] Attempting to sign in with email...');
      
      // First clear any stale tokens that might be causing issues
      localStorage.removeItem('supabase.auth.token');
      
      // Attempt login with retry logic
      let attempts = 0;
      const maxAttempts = 2;
      let success = false;
      
      while (attempts < maxAttempts && !success) {
        try {
          attempts++;
          await signIn(formData.email, formData.password);
          console.log('[LOGIN] Sign in successful');
          success = true;
        } catch (err) {
          console.error(`[LOGIN] Sign in attempt ${attempts} failed:`, err);
          
          if (attempts >= maxAttempts) {
            throw err;
          }
          
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log(`[LOGIN] Retrying sign in (attempt ${attempts + 1})...`);
        }
      }
      
      const successMessage = await translateText('Successfully signed in!');
      toast.success(successMessage);
      
      // After successful login, check if we need to complete profile
      const { data: userData } = await supabase
        .from('profiles')
        .select('is_profile_complete')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      if (userData && !userData.is_profile_complete) {
        window.location.href = '/complete-profile';
      } else {
        window.location.href = '/home';
      }
    } catch (error) {
      console.error('[LOGIN] Final sign in error:', error);
      setLoading(false);
      
      let errorMessage = '';
      if (error instanceof Error) {
        console.error('[LOGIN] Error details:', error.message);
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = await translateText('Invalid email or password');
        } else if (error.message.includes('rate limit')) {
          errorMessage = await translateText('Too many login attempts. Please try again later');
        } else {
          errorMessage = await translateText('Failed to sign in');
        }
      } else {
        errorMessage = await translateText('An unknown error occurred');
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      console.log('[LoginPage] Environment vars:', {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Not set',
        supabaseKey: import.meta.env.VITE_SUPABASE_KEY ? 'Set (hidden)' : 'Not set',
        port: window.location.port,
        host: window.location.host
      });

      // Store the current URL as the redirect URL for later use in AuthCallback
      const redirectUrl = `${window.location.origin}/callback`;
      localStorage.setItem('redirectUrl', redirectUrl);
      console.log('[LoginPage] Stored redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          }
        }
      });

      if (error) {
        throw error;
      }

      console.log('[LoginPage] OAuth response received:', data ? 'Success' : 'No data');
      
      // If we have a URL to redirect to, go there now
      if (data?.url) {
        console.log('[LoginPage] Redirecting to provider URL:', data.url);
        window.location.href = data.url;
      } else {
        console.error('[LoginPage] No redirect URL provided by Supabase');
        toast.error('Authentication failed. Please try again.');
      }
    } catch (error: any) {
      console.error('[LoginPage] Google login error:', error);
      toast.error(`Failed to log in: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Logo Half */}
      <div className="hidden lg:flex w-1/2 flex-col items-center justify-center bg-white dark:bg-gray-900">
        <div className="p-12 flex flex-col items-center justify-center h-full w-full">
          <div className="flex-grow flex items-center justify-center w-full">
            <img 
              src={logoPath} 
              alt="ConnectMe" 
              className="w-full max-w-md object-contain"
              onError={(e) => {
                console.error("Logo failed to load");
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://via.placeholder.com/300x300?text=ConnectMe';
              }} 
            />
          </div>
          <p className="mt-8 text-center text-xl max-w-md bg-clip-text text-transparent bg-gradient-to-r from-gray-400 via-indigo-500 to-rose-500 dark:from-gray-300 dark:via-indigo-400 dark:to-rose-400 font-medium">
            Connect with friends, share moments, and build your network
          </p>
        </div>
      </div>

      {/* Login Form Half */}
      <div className="w-full lg:w-1/2 flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <div className="p-4 flex justify-between items-center">
          <Link to="/" className="flex items-center text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-white">
            <FaArrowLeft className="mr-2" />
            <span data-i18n>{translations.back}</span>
          </Link>
          <div className="lg:hidden flex items-center">
            <img 
              src={logoPath} 
              alt="ConnectMe" 
              className="h-10 w-auto"
              onError={(e) => {
                console.error("Small logo failed to load");
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://via.placeholder.com/40x40?text=CM';
              }} 
            />
          </div>
        </div>

        <div className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-md w-full space-y-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-center text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-700 via-indigo-500 to-rose-500 dark:from-gray-200 dark:via-indigo-400 dark:to-rose-400 mb-6" data-i18n>
                  {translations.welcomeBack}
                </h2>
                <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
                  <span data-i18n>{translations.dontHaveAccount}</span>{' '}
                  <Link
                    to="/register"
                    className="font-medium text-indigo-600 hover:text-rose-500 dark:text-indigo-400 dark:hover:text-rose-400"
                    data-i18n
                  >
                    {translations.register}
                  </Link>
                </p>
              </div>

              <div className="mt-8">
                <Button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center"
                >
                  <FaGoogle className="mr-2" />
                  <span data-i18n>
                    {translations.signInWithGoogle}
                  </span>
                </Button>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400" data-i18n>
                        {translations.orContinueWithEmail}
                      </span>
                    </div>
                  </div>
                </div>

                <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
                  {error && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
                      <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
                    </div>
                  )}
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300" data-i18n>
                      {translations.emailAddress}
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaEnvelope className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder={translations.emailPlaceholder}
                        className="block w-full pl-10 pr-3 py-2 placeholder-gray-400 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300" data-i18n>
                      {translations.password}
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        placeholder={translations.passwordPlaceholder}
                        className="block w-full pl-10 pr-10 py-2 placeholder-gray-400 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white sm:text-sm"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                        >
                          {showPassword ? (
                            <FaEyeSlash className="h-5 w-5" />
                          ) : (
                            <FaEye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300" data-i18n>
                        {translations.rememberMe}
                      </label>
                    </div>

                    <div className="text-sm">
                      <Link
                        to="/forgot-password"
                        className="font-medium text-indigo-600 hover:text-rose-500 dark:text-indigo-400 dark:hover:text-rose-400"
                        data-i18n
                      >
                        {translations.forgotPassword}
                      </Link>
                    </div>
                  </div>

                  <div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span data-i18n>{translations.signingIn}</span>
                        </div>
                      ) : (
                        <span data-i18n>{translations.signIn}</span>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EmergencySignOutSection onEmergencySignOut={emergencySignOut} />
    </div>
  );
};

export default LoginPage;
