import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '../ui/popover';
import { FiBell, FiBellOff, FiUser, FiCheckCircle, FiInfo } from 'react-icons/fi';

interface SignInPopoverProps {
  children: React.ReactNode;
}

const SignInPopover: React.FC<SignInPopoverProps> = ({ children }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [recentlySignedIn, setRecentlySignedIn] = useState(false);

  // Check if user just signed in
  useEffect(() => {
    if (user) {
      const lastSignIn = localStorage.getItem('lastSignIn');
      const currentTime = new Date().getTime();
      
      if (!lastSignIn || (currentTime - parseInt(lastSignIn)) > 60000) {
        // If more than a minute has passed since the last sign-in
        localStorage.setItem('lastSignIn', currentTime.toString());
        setRecentlySignedIn(true);
        setIsOpen(true);
        
        // Auto-close after 5 seconds
        const timer = setTimeout(() => {
          setIsOpen(false);
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80" showArrow={true}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FiCheckCircle className="h-5 w-5 text-green-500" />
            <h4 className="font-medium text-lg">Welcome back!</h4>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You've successfully signed in to your account.
          </p>
          
          {!user?.user_metadata?.is_profile_complete && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800 flex items-start gap-2">
              <FiInfo className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="text-xs text-blue-700 dark:text-blue-300">
                Please complete your profile to get the most out of our platform.
              </div>
            </div>
          )}
          
          <div className="flex justify-end mt-2">
            <button 
              onClick={() => setIsOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center gap-1.5"
            >
              <FiBellOff className="h-3.5 w-3.5" />
              Dismiss
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SignInPopover; 