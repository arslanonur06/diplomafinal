import React from 'react';
import Navbar from './Navbar';
// import Sidebar from './ui/sidebar'; // Sidebar is not used here
import Sidebar from '../ui/sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200 flex">
      {/* <Sidebar /> Removed unused Sidebar component */}
      <div className="flex-1 ml-64 min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <Navbar />
        <div className="px-6 py-4 pt-16 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
