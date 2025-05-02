import React, { useEffect, useState } from 'react';
import './FlyingEmojis.css';

interface Emoji {
  id: number;
  emoji: string;
  left: number;
  animationDuration: number;
  size: number;
}

interface FlyingEmojisProps {
  enabled?: boolean;
}

const emojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '✨', '💬', '📱', '👋', '🤝', '🚀'];

const FlyingEmojis: React.FC<FlyingEmojisProps> = ({ enabled = true }) => {
  const [activeEmojis, setActiveEmojis] = useState<Emoji[]>([]);

  useEffect(() => {
    if (!enabled) return;

    // Create a new emoji at random intervals
    const interval = setInterval(() => {
      if (activeEmojis.length < 10) { // Limit number of emojis on screen
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        const left = Math.random() * 80 + 10; // 10% to 90% of screen width
        const animationDuration = Math.random() * 5 + 5; // 5-10 seconds
        const size = Math.random() * 1.5 + 1; // 1-2.5em size

        setActiveEmojis(prev => [
          ...prev,
          {
            id: Date.now(),
            emoji,
            left,
            animationDuration,
            size
          }
        ]);
      }
    }, 2000);

    // Clean up emojis that have completed animation
    const cleanupInterval = setInterval(() => {
      setActiveEmojis(prev => prev.filter(emoji => {
        // Remove emojis that have been around for more than their animation duration + buffer
        return Date.now() - emoji.id < emoji.animationDuration * 1000 + 1000;
      }));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(cleanupInterval);
    };
  }, [enabled, activeEmojis.length]);

  if (!enabled || activeEmojis.length === 0) {
    return null;
  }

  return (
    <div className="flying-emojis-container">
      {activeEmojis.map((emoji) => (
        <div
          key={emoji.id}
          className="flying-emoji"
          style={{
            left: `${emoji.left}%`,
            animationDuration: `${emoji.animationDuration}s`,
            fontSize: `${emoji.size}em`
          }}
        >
          {emoji.emoji}
        </div>
      ))}
    </div>
  );
};

export default FlyingEmojis;
