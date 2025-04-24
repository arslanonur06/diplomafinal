import React, { useState } from 'react';
import { FaBookmark, FaShare, FaEllipsisH } from 'react-icons/fa';
import { CONTENT_IMAGES } from '../constants/images';
import { useLanguage } from '../contexts/LanguageContext';

const SavedItemsPage = () => {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: t('saved.categories.all') || 'All Items', emoji: '🌐' },
    { id: 'articles', name: t('saved.categories.articles') || 'Articles', emoji: '📝' },
    { id: 'photos', name: t('saved.categories.photos') || 'Photos', emoji: '📸' },
    { id: 'videos', name: t('saved.categories.videos') || 'Videos', emoji: '🎬' },
  ];

  const savedItems = [
    {
      id: 1,
      type: 'article',
      title: 'The Future of Web Development',
      description: 'Exploring upcoming trends in web development for 2025',
      image: CONTENT_IMAGES.WEB_DEVELOPMENT,
      author: 'Tech Insights',
      date: '2025-02-20',
      readTime: t('saved.readTime5') || '5 min read',
    },
    {
      id: 2,
      type: 'photo',
      title: 'Urban Photography Collection',
      description: 'A stunning collection of city landscapes',
      image: CONTENT_IMAGES.URBAN_PHOTOGRAPHY,
      author: 'Urban Shots',
      date: '2025-02-19',
    },
    {
      id: 3,
      type: 'video',
      title: 'Digital Art Tutorial',
      description: 'Learn digital art techniques from professionals',
      image: CONTENT_IMAGES.DIGITAL_ART,
      author: 'Creative Arts',
      date: '2025-02-18',
      duration: '15:30',
    },
    {
      id: 4,
      type: 'article',
      title: 'Sustainable Living Guide',
      description: 'Tips for a more eco-friendly lifestyle',
      image: CONTENT_IMAGES.ECO_LIVING,
      author: 'Green Living',
      date: '2025-02-17',
      readTime: t('saved.readTime8') || '8 min read',
    },
    {
      id: 5,
      type: 'photo',
      title: 'Wildlife Photography',
      description: 'Capturing nature\'s most beautiful moments',
      image: CONTENT_IMAGES.WILDLIFE,
      author: 'Nature Lens',
      date: '2025-02-16',
    },
    {
      id: 6,
      type: 'video',
      title: 'Cooking Masterclass',
      description: 'Learn to cook like a professional chef',
      image: CONTENT_IMAGES.COOKING,
      author: 'Culinary Arts',
      date: '2025-02-15',
      duration: '25:45',
    },
  ];

  const filteredItems = selectedCategory === 'all'
    ? savedItems
    : savedItems.filter(item => item.type === selectedCategory.slice(0, -1));

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 dark:bg-neutral-800 min-h-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          {t('saved.title') || 'Saved Items'}
        </h1>

        <div className="flex space-x-3 overflow-x-auto pb-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center shadow-sm ${
                selectedCategory === category.id
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
              }`}
            >
              <span className="mr-2 text-lg" role="img" aria-label={category.name}>
                {category.emoji}
              </span>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Items Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-gray-700 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all transform hover:-translate-y-1 border border-gray-200 dark:border-gray-600"
          >
            <div className="relative h-40">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              
              {/* Item type badge */}
              <div className="absolute top-2 left-2 flex items-center">
                <span className="text-xs font-medium bg-black/60 text-white px-2 py-1 rounded-full flex items-center">
                  {item.type === 'article' && '📝'}
                  {item.type === 'photo' && '📸'}
                  {item.type === 'video' && '🎬'}
                  <span className="ml-1 capitalize">{item.type}</span>
                </span>
              </div>
              
              {/* Video duration */}
              {item.type === 'video' && (
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded-full font-medium">
                  {item.duration}
                </div>
              )}
              
              {/* Read time */}
              {item.readTime && (
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded-full font-medium">
                  {item.readTime}
                </div>
              )}
            </div>
            
            <div className="p-3">
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="font-medium text-gray-600 dark:text-gray-300 truncate max-w-[120px]">
                  {item.author}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {new Date(item.date).toLocaleDateString()}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 truncate">
                {item.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-3 h-8">
                {item.description}
              </p>
              
              <div className="flex justify-between items-center">
                <button className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  <FaShare className="w-3.5 h-3.5" />
                </button>
                
                <button className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white rounded-full shadow-sm hover:shadow transition-all">
                  {t('buttons.view') || 'View'}
                </button>
                
                <button className="p-1.5 text-rose-500 hover:text-rose-600 transition-colors bg-rose-50 dark:bg-rose-900/20 rounded-full">
                  <FaBookmark className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-700 rounded-xl shadow-md my-6 border border-gray-200 dark:border-gray-600">
          <div className="bg-gray-100 dark:bg-gray-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaBookmark className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('saved.no_items_title') || 'No saved items found'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {t('saved.no_items_message') || 'Items you save will appear here. Browse content and click the bookmark icon to save items.'}
          </p>
          <button className="mt-4 px-4 py-2 text-sm font-medium bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white rounded-full shadow-sm hover:shadow transition-all">
            {t('saved.buttons.explore') || 'Explore Content'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SavedItemsPage;
