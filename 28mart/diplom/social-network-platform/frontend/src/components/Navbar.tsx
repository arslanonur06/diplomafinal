import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import NotificationBell from './notification/NotificationBell';
import MobileMenu from './MobileMenu';
import { FaSun, FaMoon, FaSearch, FaBell, FaCommentDots } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useNotifications } from '../hooks/useNotifications';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';
import { FiMessageCircle, FiGlobe } from 'react-icons/fi';

const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  const { notifications, fetchNotifications } = useNotifications();

  useEffect(() => {
    if (user && isNotificationPanelOpen) {
      fetchNotifications();
    }
  }, [user, isNotificationPanelOpen, fetchNotifications]);

  const handleThemeToggle = () => {
    toggleDarkMode();
  };

  const handleSignOut = async () => {
    try {
        await signOut();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout Error:', error);
      toast.error('Logout failed. Please try again.');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-neutral-800 shadow-md border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-rose-500">
              ConnectMe
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {/* Search Bar */}
            <div className="hidden md:block flex-1 max-w-xs">
              {/* ... search bar code ... */}
            </div>

            {/* Right-side icons & user menu */}
            <div className="flex items-center space-x-4 md:space-x-5">
              <LanguageSwitcher />

              {/* Theme Toggle */}
              <button 
                onClick={handleThemeToggle} 
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
              </button>
              
              {/* Notifications - REMOVE the simple Link icon */}
              {/* 
              <Link 
                to="/notifications"
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                aria-label="Notifications"
              >
                <FaBell className="h-5 w-5" />
              </Link>
              */}

              {/* Messages */}
              <Link 
                to="/messages"
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                aria-label="Messages"
              >
                <FaCommentDots className="h-5 w-5" />
              </Link>

              {/* User Menu */}
              {user ? (
                <div className="flex items-center space-x-4">
                  {/* Keep NotificationBell component */}
                  <div ref={notificationRef} className="relative">
                    <NotificationBell />
                  </div>

                  {/* Keep Profile Dropdown */}
                  <div ref={profileRef} className="relative">
                      <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500">
                          <img
                              className="h-8 w-8 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                              src={user.user_metadata?.avatar_url || '/default-avatar.png'}
                              alt="User profile"
                          />
                          <span 
                              onClick={(e) => {
                                  e.stopPropagation(); // Prevent dropdown from opening
                                  navigate('/profile');
                              }}
                              className="ml-2 text-gray-700 dark:text-gray-300 hidden sm:inline cursor-pointer hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                          >
                              {user.user_metadata?.username || user.email}
                          </span>
                  </button>
                      <AnimatePresence>
                      {isProfileDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-[60]"
                        >
                          <button onClick={() => { navigate('/settings'); setIsProfileDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Settings</button>
                          <button onClick={() => { handleSignOut(); setIsProfileDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Sign Out</button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <Button onClick={() => navigate('/login')} className="px-5 py-2 rounded-lg text-sm">
                  Sign In
                </Button>
              )}
            </div>
          </div>

          <div className="-mr-2 flex md:hidden">
            <MobileMenu />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
