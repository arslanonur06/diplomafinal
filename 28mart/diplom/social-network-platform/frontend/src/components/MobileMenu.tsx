import { useState, useEffect } from 'react';
import { FiMenu, FiX } from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  FaHome, 
  FaUser, 
  FaUsers, 
  FaCalendarAlt, 
  FaComments, 
  FaBookmark, 
  FaCog,
  FaUserFriends,
  FaBell,
  FaComment
} from 'react-icons/fa';

export const MobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  // Close menu when changing routes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const mainLinks = [
    { path: '/', label: t('sidebar.home'), icon: <FaHome size={20} /> },
    { path: '/profile', label: t('sidebar.profile'), icon: <FaUser size={20} /> },
    { path: '/groups', label: t('sidebar.groups'), icon: <FaUsers size={20} /> },
    { path: '/events', label: t('sidebar.events'), icon: <FaCalendarAlt size={20} /> },
  ];
  
  const utilLinks = [
    { path: '/friends', label: t('sidebar.friends'), icon: <FaUserFriends size={20} /> },
    { path: '/chat', label: t('sidebar.chat'), icon: <FaComment size={20} /> },
    { path: '/messages', label: t('sidebar.messages'), icon: <FaComments size={20} /> },
    { path: '/notifications', label: t('notifications.title'), icon: <FaBell size={20} /> },
    { path: '/saved', label: t('sidebar.saved'), icon: <FaBookmark size={20} /> },
    { path: '/settings', label: t('sidebar.settings'), icon: <FaCog size={20} /> },
  ];

  const handleLinkClick = () => {
    setIsOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        aria-label="Toggle mobile menu"
      >
        {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div 
            className="absolute left-0 top-0 h-full w-3/4 max-w-[280px] bg-white dark:bg-gray-800 shadow-xl p-4 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile Menu Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500 dark:from-indigo-400 dark:to-purple-300">
                ConnectMe
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FiX size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* Main Navigation Section */}
            <div className="mb-6">
              <h3 className="px-3 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold mb-2">
                {t('sidebar.main')}
              </h3>
              <div className="space-y-1">
                {mainLinks.map(link => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                      isActive(link.path) 
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                    onClick={handleLinkClick}
                  >
                    <span className="mr-3">{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Utilities Section */}
            <div>
              <h3 className="px-3 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold mb-2">
                {t('sidebar.resources')}
              </h3>
              <div className="space-y-1">
                {utilLinks.map(link => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                      isActive(link.path) 
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                    onClick={handleLinkClick}
                  >
                    <span className="mr-3">{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileMenu; 