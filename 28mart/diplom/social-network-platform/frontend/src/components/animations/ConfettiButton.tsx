import React, { useState } from 'react';

interface ConfettiButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  confettiCount?: number;
  duration?: number;
}

// Fix: Simply cast the function component correctly to solve the TypeScript error
const ConfettiButton: React.FC<ConfettiButtonProps> = (props) => {
  const {
    onClick,
    children,
    className = '',
    confettiCount = 50,
    duration = 2000
  } = props;
  
  const [confetti, setConfetti] = useState<React.ReactElement[]>([]);
  const [isExploding, setIsExploding] = useState(false);
  
  const handleClick = () => {
    // Trigger explosion
    setIsExploding(true);
    
    // Create confetti
    const newConfetti: React.ReactElement[] = [];
    const explosionId = Date.now();
    
    for (let i = 0; i < confettiCount; i++) {
      // Random confetti properties
      const size = 6 + Math.random() * 8;
      const color = `hsl(${Math.random() * 360}, 80%, 60%)`;
      const angle = Math.random() * Math.PI * 2; // Random angle in radians
      const velocity = 2 + Math.random() * 3; // Random velocity
      const rotationSpeed = Math.random() * 600 - 300; // Random rotation speed
      
      newConfetti.push(
        <span
          key={`${explosionId}-${i}`}
          className="absolute rounded-sm"
          style={{
            width: `${size}px`,
            height: `${size * (0.6 + Math.random() * 0.4)}px`,
            backgroundColor: color,
            transform: 'translate(-50%, -50%)',
            animation: `confetti-fly-out ${0.5 + Math.random() * 1.5}s forwards`,
            '--angle': angle,
            '--velocity': velocity,
            '--rotation-speed': rotationSpeed,
          } as React.CSSProperties}
        />
      );
    }
    
    setConfetti(newConfetti);
    
    // Call original onClick if provided
    if (onClick) onClick();
    
    // Clean up after animation
    setTimeout(() => {
      setConfetti([]);
      setIsExploding(false);
    }, duration);
  };
  
  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        className={`relative z-10 ${className}`}
        disabled={isExploding}
      >
        {children}
      </button>
      <div className="absolute top-1/2 left-1/2 pointer-events-none z-0">
        {confetti}
      </div>
    </div>
  );
};

export default ConfettiButton;
