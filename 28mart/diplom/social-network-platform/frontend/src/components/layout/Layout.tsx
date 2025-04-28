import React from 'react';
import Navbar from '../Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useTheme } from '../../contexts/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''} flex`}>
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-sm z-20">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Navbar */}
        <div className="sticky top-0 z-30 bg-white shadow-sm">
          <Navbar />
        </div>

        {/* Page Content */}
        <main className={`container mx-auto px-6 py-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
