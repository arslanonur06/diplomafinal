import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading state for a maximum of 2 seconds
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-gray-600">Please wait while we verify your session.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login and save the attempted URL
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If we're at the root path and authenticated, redirect to /home
  if (location.pathname === '/') {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}; 