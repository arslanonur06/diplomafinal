import * as React from 'react';
import { Link } from 'react-router-dom';
import { FiHome, FiUsers, FiMessageSquare, FiSettings } from 'react-icons/fi';

interface SidebarProps {
  className?: string;
}

// use React.FC so TS sees JSX namespace
const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  return (
    <div className={`sidebar ${className}`}>
      <nav className="flex flex-col space-y-2 p-4">
        <SidebarLink to="/" icon={<FiHome />} label="Home" />
        <SidebarLink to="/groups" icon={<FiUsers />} label="Groups" />
        <SidebarLink to="/messages" icon={<FiMessageSquare />} label="Messages" />
        <SidebarLink to="/settings" icon={<FiSettings />} label="Settings" />
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
