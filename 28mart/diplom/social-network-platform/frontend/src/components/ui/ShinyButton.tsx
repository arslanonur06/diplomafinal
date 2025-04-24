import React, { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface ShinyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'transparent';
}

export const ShinyButton = React.forwardRef<
  HTMLButtonElement,
  ShinyButtonProps
>(({ children, className, variant = 'default', ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        'relative inline-flex items-center justify-center px-6 py-3 text-lg font-medium rounded-full transition-all duration-300 overflow-hidden focus:outline-none',
        variant === 'default' && 'text-white hover:text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md hover:shadow-lg transform hover:-translate-y-1',
        variant === 'outline' && 'border-2 border-blue-500 text-blue-500 hover:text-white hover:bg-blue-500 bg-transparent',
        variant === 'transparent' && 'bg-transparent text-blue-500 hover:text-blue-700',
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
    </button>
  );
});

ShinyButton.displayName = 'ShinyButton';

export default ShinyButton; 