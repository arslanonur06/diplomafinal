import React, { useEffect, useState } from 'react';
import './ConfettiExplosion.css';

interface ConfettiExplosionProps {
  autoExplode?: boolean;
  delay?: number;
}

const ConfettiExplosion: React.FC<ConfettiExplosionProps> = ({ 
  autoExplode = true,
  delay = 500
}) => {
  const [confetti, setConfetti] = useState<React.ReactElement[]>([]);
  const [hasExploded, setHasExploded] = useState(false);

  // Function to create the confetti explosion
  const explode = () => {
    if (hasExploded) return;
    
    setHasExploded(true);
    const pieces: React.ReactElement[] = [];
    const colors = [
      '#FF5252', '#FF4081', '#E040FB', '#7C4DFF', 
      '#536DFE', '#448AFF', '#40C4FF', '#18FFFF', 
      '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41', 
      '#FFFF00', '#FFD740', '#FFAB40', '#FF6E40'
    ];
    
    // Create multiple explosions for a more spectacular effect
    for (let centerX = 0; centerX <= 100; centerX += 25) {
      // Center points at 0%, 25%, 50%, 75%, and 100% of the width
      const actualCenterX = centerX === 0 ? 10 : (centerX === 100 ? 90 : centerX);
      
      for (let i = 0; i < 40; i++) { // 40 pieces per center
        // Get random properties for each confetti piece
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = 5 + Math.random() * 10; // 5-15px
        const rotation = Math.random() * 360; // 0-360 degrees
        const duration = 1 + Math.random() * 3; // 1-4 seconds
        const delay = Math.random() * 0.5; // 0-0.5 second delay
        const shape = Math.floor(Math.random() * 4); // 0-3 for different shapes
        
        // Calculate velocity and direction
        const angle = Math.random() * Math.PI * 2; // 0-2π radians (full circle)
        const velocity = 10 + Math.random() * 30; // 10-40 pixels distance
        const velocityX = Math.cos(angle) * velocity;
        const velocityY = Math.sin(angle) * velocity - 10; // Upward bias
        
        pieces.push(
          <div
            key={`confetti-${actualCenterX}-${i}`}
            className={`confetti-piece shape-${shape}`}
            style={{
              left: `${actualCenterX}%`,
              top: '50%',
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color,
              transform: `rotate(${rotation}deg)`,
              animation: `confetti-fall ${duration}s ease-out ${delay}s forwards`,
              '--velocity-x': `${velocityX}px`,
              '--velocity-y': `${velocityY}px`,
            } as React.CSSProperties}
          />
        );
      }
    }
    
    setConfetti(pieces);
    
    // Clean up confetti after animation completes
    setTimeout(() => {
      setConfetti([]);
    }, 5000); // Clean up after 5 seconds
  };

  useEffect(() => {
    if (autoExplode) {
      const timer = setTimeout(() => {
        explode();
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [autoExplode, delay]);

  return (
    <div className="confetti-container">
      {confetti}
    </div>
  );
};

// Add proper default export
export default ConfettiExplosion;
