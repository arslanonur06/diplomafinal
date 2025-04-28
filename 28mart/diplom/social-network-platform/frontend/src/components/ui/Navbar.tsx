import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FaSun, FaMoon, FaUserCircle, FaBars, FaSearch } from 'react-icons/fa';

const Navbar: React.FC = () => {
  const { user, signOut } = useAuthContext();
  // Use only isDarkMode from ThemeContext which appears to exist
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-2 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            ConnectMe
          </Link>
          
          <div className="hidden md:flex relative rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1.5">
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-none focus:outline-none text-sm text-gray-800 dark:text-gray-200 w-56"
            />
            <FaSearch className="absolute right-3 top-2.5 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleDarkMode} // Use toggleDarkMode function directly
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <FaSun className="text-gray-300" /> : <FaMoon className="text-gray-700" />}
          </button>
          
          {user ? (
            <>
              <Link 
                to="/profile" 
                className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg"
              >
                <FaUserCircle className="text-gray-700 dark:text-gray-300 text-xl" />
                <span className="hidden md:inline text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user.user_metadata?.full_name || 'Profile'}
                </span>
              </Link>
              <button 
                onClick={signOut}
                className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500 ml-4"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link 
              to="/login" 
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
            >
              Sign In
            </Link>
          )}
          
          <button className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <FaBars className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
