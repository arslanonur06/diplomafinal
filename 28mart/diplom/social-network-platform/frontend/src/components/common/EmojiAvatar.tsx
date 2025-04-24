import React from 'react';

interface EmojiAvatarProps {
  emoji?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackInitials?: string;
  onClick?: () => void;
}

const EmojiAvatar: React.FC<EmojiAvatarProps> = ({ 
  emoji, 
  size = 'md', 
  className = '',
  fallbackInitials = '',
  onClick
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-base',
    md: 'w-12 h-12 text-xl',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-24 h-24 text-3xl'
  };
  
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  // Calculate initials from fallback text
  const initials = fallbackInitials
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <div 
      className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center ${emoji ? 'bg-gradient-to-br from-pink-100 to-rose-200 dark:from-rose-900 dark:to-pink-800' : 'bg-blue-500'} ${className}`}
      onClick={onClick}
    >
      {emoji ? (
        <span className="select-none">{emoji}</span>
      ) : (
        <span className="text-white font-semibold">{initials || '?'}</span>
      )}
    </div>
  );
};

export default EmojiAvatar; 