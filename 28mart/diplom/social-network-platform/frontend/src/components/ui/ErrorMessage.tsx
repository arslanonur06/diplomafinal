import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

interface ErrorMessageProps {
  message: string | null;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  className = '' 
}) => {
  if (!message) return null;
  
  return (
    <div className={`bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-start ${className}`}>
      <FiAlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
      <div>
        <h3 className="font-medium">Error</h3>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
};

export default ErrorMessage; 