import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  FiHome, 
  FiUsers, 
  FiMessageSquare, 
  FiSettings, 
  FiUser, 
  FiCalendar,
  FiCompass,
  FiBookmark,
  FiStar,
  FiHelpCircle,
  FiBell
} from 'react-icons/fi';

interface SidebarProps {
  className?: string;
}

// use React.FC so TS sees JSX namespace
const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  
  return (
    <div className={`sidebar ${className}`}>
      <nav className="flex flex-col space-y-2 p-4">
        <SidebarLink to="/" icon={<FiHome />} label={t('sidebar.home')} />
        <SidebarLink to="/profile" icon={<FiUser />} label={t('sidebar.profile')} />
        <SidebarLink to="/messages" icon={<FiMessageSquare />} label={t('sidebar.messages')} />
        <SidebarLink to="/friends" icon={<FiUsers />} label={t('sidebar.friends')} />
        <SidebarLink to="/notifications" icon={<FiBell />} label={t('sidebar.notifications')} />
        <SidebarLink to="/discover" icon={<FiCompass />} label={t('sidebar.discover')} />
        <SidebarLink to="/groups" icon={<FiUsers />} label={t('sidebar.groups')} />
        <SidebarLink to="/events" icon={<FiCalendar />} label={t('sidebar.events')} />
        <SidebarLink to="/saved" icon={<FiBookmark />} label={t('sidebar.saved')} />
        <SidebarLink to="/favorites" icon={<FiStar />} label={t('sidebar.favorites')} />
        <SidebarLink to="/settings" icon={<FiSettings />} label={t('sidebar.settings')} />
        <SidebarLink to="/help" icon={<FiHelpCircle />} label={t('sidebar.helpAndSupport')} />
      </nav>
    </div>
  );
};

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

// same here
const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon, label }) => {
  return (
    <Link
      to={to}
      className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
    >
      <span className="text-gray-500">{icon}</span>
      <span>{label}</span>
    </Link>
  );
};

export default Sidebar;
