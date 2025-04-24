import React, { useState, useEffect } from 'react';

// Popular emojis categorized
const emojiCategories = {
  faces: ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '🥸', '😍', '🥰', '😘', '😗', '😙', '🥲', '😚', '😐', '😑', '😶', '🫥'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🦆', '🦅', '🦉', '🦇'],
  food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🌮', '🍕', '🍔', '🍟'],
  activities: ['⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🎯', '🎮', '🎲', '🧩', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁'],
  travel: ['✈️', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🛺', '🚔', '🚍', '🚘', '🚖', '🚠'],
  objects: ['💻', '📱', '📲', '💾', '📷', '🔋', '🔌', '📡', '🛢', '⛽️', '🪔', '🔦', '🧯', '🛠', '⚙️', '🔩', '⚖️', '📫', '💰', '💳', '💎', '⚱️', '🧸', '📚'],
  symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '☯️']
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  selectedEmoji?: string;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, selectedEmoji }) => {
  const [activeCategory, setActiveCategory] = useState<keyof typeof emojiCategories>('faces');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  useEffect(() => {
    // Load recent emojis from localStorage if available
    const savedRecents = localStorage.getItem('recentEmojis');
    if (savedRecents) {
      setRecentEmojis(JSON.parse(savedRecents).slice(0, 24));
    }
  }, []);

  const handleEmojiSelect = (emoji: string) => {
    onSelect(emoji);
    
    // Update recent emojis
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 24);
    setRecentEmojis(updated);
    localStorage.setItem('recentEmojis', JSON.stringify(updated));
  };

  return (
    <div className="border dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-lg">
      {/* Categories nav */}
      <div className="flex border-b dark:border-gray-700 overflow-x-auto">
        <button 
          className={`px-3 py-2 text-sm flex-shrink-0 ${recentEmojis.length > 0 && activeCategory === 'faces' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-gray-500 dark:text-gray-400'}`}
          onClick={() => setActiveCategory('faces')}
        >
          Recent
        </button>
        {Object.keys(emojiCategories).map((category) => (
          <button 
            key={category}
            className={`px-3 py-2 text-sm flex-shrink-0 ${activeCategory === category ? 'text-rose-600 border-b-2 border-rose-600' : 'text-gray-500 dark:text-gray-400'}`}
            onClick={() => setActiveCategory(category as keyof typeof emojiCategories)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Emoji grid */}
      <div className="p-2 max-h-60 overflow-y-auto">
        <div className="grid grid-cols-8 gap-1">
          {(recentEmojis.length > 0 && activeCategory === 'faces' ? recentEmojis : emojiCategories[activeCategory]).map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              className={`w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${selectedEmoji === emoji ? 'bg-rose-100 dark:bg-rose-900' : ''}`}
              onClick={() => handleEmojiSelect(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="p-2 border-t dark:border-gray-700 text-xs text-center text-gray-500 dark:text-gray-400">
        Select an emoji as your avatar
      </div>
    </div>
  );
};

export default EmojiPicker; 