import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RequireAuthProps {
  children: React.ReactNode;
}

// Varsayılan bir AuthContext değeri ekleyelim, eğer useAuth tanımsızsa kullanılır
const defaultAuthContext = {
  user: null,
  loading: true, // Start as loading
  hasCompletedProfile: false,
};

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  // useAuth'dan gelen değerleri alırken varsayılan değerleri kullan
  const {
    user,
    loading, // Directly use loading from context
    hasCompletedProfile = false // Default if context value is not ready
  } = useAuth() || defaultAuthContext;

  const location = useLocation();
  const [redirectCount, setRedirectCount] = useState(0);

  useEffect(() => {
    const lastRedirectTime = parseInt(sessionStorage.getItem('last_redirect_time') || '0', 10);
    const now = Date.now();
    
    if (now - lastRedirectTime < 1000) {
      setRedirectCount(prev => prev + 1);
    } else {
      setRedirectCount(0);
    }
    
    if (redirectCount === 0) {
        sessionStorage.setItem('last_redirect_time', now.toString());
    }
    
    if (redirectCount > 5) {
      console.error('RequireAuth: Muhtemelen bir yönlendirme döngüsüne girildi!');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  console.log('RequireAuth State:', { path: location.pathname, user: !!user, loading, hasCompletedProfile, redirectCount });
  
  const isPublicPath = ['/', '/login', '/register', '/callback', '/reset-password'].includes(location.pathname) || location.pathname.startsWith('/callback');
    
  const isCompleteProfilePage = location.pathname === '/complete-profile';

  if (redirectCount > 5) {
    console.log('RequireAuth: Too many redirects detected.');
    sessionStorage.removeItem('last_redirect_time');

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-black">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">Authentication Error</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            An authentication loop was detected. Please try clearing your browser cache and cookies, then sign in again.
          </p>
          <a
            href="/login"
            className="inline-block px-4 py-2 bg-gradient-to-r from-indigo-500 to-rose-500 text-white rounded hover:from-indigo-600 hover:to-rose-600 transition-all"
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = '/login';
            }}
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }
  
  if (loading) {
    console.log('RequireAuth: AuthContext is loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-black">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
          <p className="text-gray-700 dark:text-gray-300 text-lg">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    if (!isPublicPath) {
      console.log('RequireAuth: Not authenticated (after load), redirecting to login.');
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    console.log('RequireAuth: Not authenticated, on public path.');
    if (redirectCount > 0) setRedirectCount(0);
    sessionStorage.removeItem('last_redirect_time');
    return <>{children}</>;
  }

  if (hasCompletedProfile && (location.pathname === '/login' || location.pathname === '/register')) {
    console.log('RequireAuth: Authenticated and profile complete, redirecting from login/register.');
    const targetPath = location.state?.from?.pathname || '/home';
    return <Navigate to={targetPath} replace />;
  }
  
  if (!hasCompletedProfile && !isCompleteProfilePage) {
    if (!isPublicPath) {
      console.log('RequireAuth: Authenticated but profile incomplete, redirecting to /complete-profile.');
      return <Navigate to="/complete-profile" state={{ from: location }} replace />;
    }
  }

  console.log('RequireAuth: All checks passed, allowing access.');
  if (redirectCount > 0) setRedirectCount(0);
  sessionStorage.removeItem('last_redirect_time');

  return <>{children}</>;
};

export default RequireAuth; 