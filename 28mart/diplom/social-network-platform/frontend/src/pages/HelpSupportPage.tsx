import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTelegram, FaEnvelope, FaHeadset, FaSearch, FaExternalLinkAlt, FaQuestionCircle, FaVideo } from 'react-icons/fa';
import { FiBook } from 'react-icons/fi';
import toast from 'react-hot-toast';

const HelpSupportPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const faqItems = [
    {
      question: t('faq.createGroup.question'),
      answer: t('faq.createGroup.answer')
    },
    {
      question: t('faq.addFriends.question'),
      answer: t('faq.addFriends.answer')
    },
    {
      question: t('faq.privacy.question'),
      answer: t('faq.privacy.answer')
    },
    {
      question: t('faq.notifications.question'),
      answer: t('faq.notifications.answer')
    },
    {
      question: t('faq.deleteAccount.question'),
      answer: t('faq.deleteAccount.answer')
    }
  ];

  const filteredFAQs = faqItems.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTelegramSupport = () => {
    window.open('https://t.me/your_support_bot', '_blank');
    toast.success('Opening Telegram support');
  };

  const handleEmailSupport = () => {
    window.location.href = 'mailto:support@yourapp.com';
    toast.success('Opening email client');
  };

  const handleHelpCenter = () => {
    // This could link to a more detailed documentation page
    toast.success(t('helpAndSupport.redirectingToHelp'));
    // Simulate opening a help center page
    setTimeout(() => {
      window.open('https://help.yourdomain.com', '_blank');
    }, 1000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 dark:bg-neutral-800">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-8 mb-10 shadow-lg">
        <h1 className="text-3xl font-bold mb-2 text-white">
          {t('helpAndSupport.helpAndSupport')}
        </h1>
        <p className="text-white text-opacity-90 max-w-2xl">
          {t('helpAndSupport.helpAndSupportDescription')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Telegram Support */}
        <div 
          onClick={handleTelegramSupport}
          className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow cursor-pointer group border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full mr-4">
              <FaTelegram className="text-2xl text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
                {t('helpAndSupport.telegramSupport')}
                <FaExternalLinkAlt className="ml-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t('helpAndSupport.telegramSupportDescription')}
              </p>
            </div>
          </div>
        </div>

        {/* Email Support */}
        <div
          onClick={handleEmailSupport}
          className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow cursor-pointer group border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center mb-4">
            <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full mr-4">
              <FaEnvelope className="text-2xl text-red-500 dark:text-red-400 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
                {t('helpAndSupport.emailSupport')}
                <FaExternalLinkAlt className="ml-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t('helpAndSupport.emailSupportDescription')}
              </p>
            </div>
          </div>
        </div>

        {/* Help Center */}
        <div
          onClick={handleHelpCenter}
          className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow cursor-pointer group border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center mb-4">
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full mr-4">
              <FaHeadset className="text-2xl text-green-500 dark:text-green-400 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
                {t('helpAndSupport.helpCenter')}
                <FaExternalLinkAlt className="ml-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t('helpAndSupport.helpCenterDescription')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full mr-4">
              <FiBook className="text-2xl text-purple-500 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
              Documentation
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Browse our comprehensive documentation to learn more about all features.
          </p>
          <button className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
            View Documentation
          </button>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-full mr-4">
              <FaVideo className="text-2xl text-yellow-500 dark:text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
              Video Tutorials
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Watch our video tutorials to get started quickly with our platform.
          </p>
          <button className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
            Watch Tutorials
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-md mb-8 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center mb-6">
          <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full mr-4">
            <FaQuestionCircle className="text-2xl text-blue-500 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
            {t('helpAndSupport.frequentlyAskedQuestions')}
          </h2>
        </div>
        
        <div className="relative mb-6">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('actions.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((item, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all"
              >
                <button
                  className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                >
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex justify-between items-center">
                    {item.question}
                    <svg
                      className={`h-5 w-5 transform transition-transform ${
                        expandedFAQ === index ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </h3>
                </button>
                {expandedFAQ === index && (
                  <div className="p-4 bg-white dark:bg-gray-800">
                    <p className="text-gray-600 dark:text-gray-300">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-gray-600 dark:text-gray-300">
                {t('helpAndSupport.noMatchingFAQs')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpSupportPage;