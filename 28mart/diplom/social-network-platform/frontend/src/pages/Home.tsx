import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
// ...existing imports...
import FlyingEmojis from '../components/animations/FlyingEmojis';
import ConfettiButton from '../components/animations/ConfettiButton';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const [showEmojis, setShowEmojis] = useState(true);
  // ...existing code...

  return (
    <div className="home-container">
      {/* Flying emojis for engagement */}
      <FlyingEmojis enabled={showEmojis} />
      
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t('home.title', 'Home')}</h1>
        
        {/* Toggle for emojis with confetti effect */}
        <div className="flex items-center">
          <ConfettiButton
            onClick={() => setShowEmojis(prev => !prev)}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded flex items-center"
            confettiCount={30}
          >
            {showEmojis ? '✨ Hide Emojis' : '✨ Show Emojis'}
          </ConfettiButton>
        </div>
      </div>
      
      {/* ...existing home page content... */}
    </div>
  );
};

export default Home;
