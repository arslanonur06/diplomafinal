import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RequireProfileCompletionProps {
  children: React.ReactNode;
}

/**
 * Component that ensures the user has completed their profile before accessing protected routes
 */
const RequireProfileCompletion: React.FC<RequireProfileCompletionProps> = ({ children }) => {
  const { user, loading, hasCompletedProfile } = useAuth();
  const location = useLocation();

  console.log('RequireProfileCompletion: Current path:', location.pathname);
  console.log('RequireProfileCompletion: Profile completed:', hasCompletedProfile);
  
  // If user is already on the complete-profile page, render the children regardless
  if (location.pathname === '/complete-profile') {
    return <>{children}</>;
  }

  // Don't show loading if user exists - prevents flashing
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-black">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
          <p className="text-gray-700 dark:text-gray-300 text-lg">Loading profile...</p>
        </div>
      </div>
    );
  }

  // If we have a user and profile is not complete, redirect to complete profile
  if (user && hasCompletedProfile === false && location.pathname !== '/complete-profile') {
    console.log('RequireProfileCompletion: Redirecting to complete profile');
    return <Navigate to="/complete-profile" state={{ from: location }} replace />;
  }

  // For all other cases, render the children
  return <>{children}</>;
};

export default RequireProfileCompletion; 