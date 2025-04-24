import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-[#121212] border-t border-gray-200 dark:border-white/10 mt-auto py-4 transition-colors duration-200">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-white/60">
            &copy; {new Date().getFullYear()} ConnectMe. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-sm text-gray-600 hover:text-gray-900 dark:text-white/60 dark:hover:text-white/90 transition-colors duration-200">Privacy Policy</a>
            <a href="#" className="text-sm text-gray-600 hover:text-gray-900 dark:text-white/60 dark:hover:text-white/90 transition-colors duration-200">Terms of Service</a>
            <a href="#" className="text-sm text-gray-600 hover:text-gray-900 dark:text-white/60 dark:hover:text-white/90 transition-colors duration-200">Contact Us</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
