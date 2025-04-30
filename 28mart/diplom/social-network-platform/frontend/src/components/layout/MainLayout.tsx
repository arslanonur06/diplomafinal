import { useState, useEffect } from 'react';
import { useLocation, Outlet, useNavigate } from 'react-router-dom';
import Navbar from '../Navbar';
import Sidebar, { SidebarBody, SidebarLink } from '../ui/sidebar';
import { useTranslation } from 'react-i18next';
import { 
  FaHome, 
  FaUsers, 
  FaCalendarAlt, 
  FaComments, 
  FaUserFriends, 
  FaBookmark, 
  FaCog,
  FaUser,
  FaCompass,
  FaStar,
  FaBell
} from 'react-icons/fa';

// Rename to make it clear this is the primary app layout
const MainLayout = () => {
  const [primaryNavOpen, setPrimaryNavOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Effect to scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Dispatch a custom event for route changes
    window.dispatchEvent(new Event('routeChange'));
  }, [location.pathname]);

  // Define navigation links with new structure
  const mainLinks = [
    { href: '/home', label: 'home', icon: <FaHome size={18} /> },
    { href: '/profile', label: 'profile', icon: <FaUser size={18} /> },
    { href: '/groups', label: 'groups', icon: <FaUsers size={18} /> },
    { href: '/events', label: 'events', icon: <FaCalendarAlt size={18} /> },
  ];

  const shortcutLinks = [
    { href: '/friends', label: 'friends', icon: <FaUserFriends size={18} /> },
    { href: '/notifications', label: 'notifications', icon: <FaBell size={18} /> },
    { href: '/messages', label: 'messages', icon: <FaComments size={18} /> },
  ];

  // New section for the requested links
  const resourceLinks = [
    { href: '/discover', label: 'discover', icon: <FaCompass size={18} /> },
    { href: '/saved', label: 'saved', icon: <FaBookmark size={18} /> },
    { href: '/favorites', label: 'favorites', icon: <FaStar size={18} /> },
    { href: '/settings', label: 'settings', icon: <FaCog size={18} /> },
  ];

  // Handle link clicks to ensure proper state updates
  const handleLinkClick = (href: string) => {
    if (location.pathname !== href) {
      navigate(href);
      window.dispatchEvent(new Event('routeChange'));
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-800">
      {/* Navbar - Fixed at the top */}
      <header className="sticky top-0 z-50 w-full">
        <Navbar />
      </header>

      {/* Main Content Area with Sidebar */}
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Primary Navigation Sidebar - Desktop Only */}
        <aside className="hidden lg:block flex-shrink-0 w-[240px] sticky top-16 h-[calc(100vh-4rem)] overflow-hidden">
          <Sidebar open={primaryNavOpen} setOpen={setPrimaryNavOpen}>
            <SidebarBody className="flex flex-col h-full py-4 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
              <div className="mb-6">
                <h3 className="px-4 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold mb-2">{t('nav.main')}</h3>
                <div className="space-y-1">
                  {mainLinks.map((link) => (
                    <SidebarLink 
                      key={link.href} 
                      link={link} 
                      onClick={() => handleLinkClick(link.href)}
                    />
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="px-4 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold mb-2">{t('nav.shortcuts')}</h3>
                <div className="space-y-1">
                  {shortcutLinks.map((link) => (
                    <SidebarLink 
                      key={link.href} 
                      link={link}
                      onClick={() => handleLinkClick(link.href)}
                    />
                  ))}
                </div>
              </div>

              {/* New Section for Resources */}
              <div className="mb-6">
                <h3 className="px-4 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold mb-2">{t('nav.resources')}</h3>
                <div className="space-y-1">
                  {resourceLinks.map((link) => (
                    <SidebarLink 
                      key={link.href} 
                      link={link}
                      onClick={() => handleLinkClick(link.href)}
                    />
                  ))}
                </div>
              </div>
            </SidebarBody>
          </Sidebar>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Add scroll-to-top effect on route changes
export default MainLayout; 