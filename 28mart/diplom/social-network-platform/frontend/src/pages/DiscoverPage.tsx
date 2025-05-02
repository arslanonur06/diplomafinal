import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useLanguage } from '../contexts/LanguageContext';
import { Trending } from '../types/supabase';

// Map of trending topics to relevant images
const TOPIC_IMAGES: Record<string, string> = {
  technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
  gaming: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
  travel: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
  food: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
  music: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
  art: 'https://images.unsplash.com/photo-1579783483458-83d02161294e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
  fashion: 'https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
  fitness: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
  health: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
  books: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
  movies: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
  nature: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
  sports: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
  science: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
};

// Default image for categories not in the map
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80';

const DiscoverPage: React.FC = () => {
  const { t } = useLanguage();
  const [trendingTopics, setTrendingTopics] = useState<Trending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrendingTopics = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try to fetch trending topics from database
        const { data, error } = await supabase
          .from('trending_topics')
          .select('*')
          .order('count', { ascending: false })
          .limit(12);

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          console.log('Fetched trending topics:', data);
          
          // Enhance data with proper images
          const enhancedData = data.map(topic => ({
            ...topic,
            image_url: topic.image_url || getImageForTopic(topic.title, topic.category)
          }));
          
          setTrendingTopics(enhancedData);
        } else {
          // If no data found, use sample data
          console.log('No trending topics found, using sample data');
          const sampleTopics = generateSampleTrendingTopics();
          setTrendingTopics(sampleTopics);
        }
      } catch (err: any) {
        console.error('Error fetching trending topics:', err);
        setError(err.message || 'Failed to load trending topics');
        // Still use sample data on error
        const sampleTopics = generateSampleTrendingTopics();
        setTrendingTopics(sampleTopics);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingTopics();
  }, []);

  // Get a relevant image based on topic title or category
  const getImageForTopic = (title: string, category?: string | null): string => {
    // Look for keywords in the title
    const titleLower = title.toLowerCase();
    for (const [keyword, imageUrl] of Object.entries(TOPIC_IMAGES)) {
      if (titleLower.includes(keyword)) {
        return imageUrl;
      }
    }

    // If nothing found in title, check category if available
    if (category) {
      const categoryLower = category.toLowerCase();
      for (const [keyword, imageUrl] of Object.entries(TOPIC_IMAGES)) {
        if (categoryLower.includes(keyword)) {
          return imageUrl;
        }
      }
    }

    // Use default image if no matches found
    return DEFAULT_IMAGE;
  };

  // Generate sample trending topics if database fetch fails
  const generateSampleTrendingTopics = (): Trending[] => {
    return [
      { id: '1', title: 'Technology Trends', description: 'Latest tech innovations and gadgets', category: 'technology', count: 1250, created_at: new Date().toISOString(), image_url: TOPIC_IMAGES.technology },
      { id: '2', title: 'Gaming Community', description: 'Updates on popular games', category: 'gaming', count: 980, created_at: new Date().toISOString(), image_url: TOPIC_IMAGES.gaming },
      { id: '3', title: 'Travel Destinations', description: 'Explore amazing places around the world', category: 'travel', count: 875, created_at: new Date().toISOString(), image_url: TOPIC_IMAGES.travel },
      { id: '4', title: 'Food & Cuisine', description: 'Delicious recipes and food reviews', category: 'food', count: 740, created_at: new Date().toISOString(), image_url: TOPIC_IMAGES.food },
      { id: '5', title: 'Music Events', description: 'Upcoming concerts and releases', category: 'music', count: 690, created_at: new Date().toISOString(), image_url: TOPIC_IMAGES.music },
      { id: '6', title: 'Art & Design', description: 'Creative artwork and designs', category: 'art', count: 630, created_at: new Date().toISOString(), image_url: TOPIC_IMAGES.art },
      { id: '7', title: 'Fashion Trends', description: 'Latest styles and fashion news', category: 'fashion', count: 580, created_at: new Date().toISOString(), image_url: TOPIC_IMAGES.fashion },
      { id: '8', title: 'Fitness Tips', description: 'Workout routines and fitness advice', category: 'fitness', count: 520, created_at: new Date().toISOString(), image_url: TOPIC_IMAGES.fitness },
      { id: '9', title: 'Health & Wellness', description: 'Tips for healthy living', category: 'health', count: 490, created_at: new Date().toISOString(), image_url: TOPIC_IMAGES.health },
      { id: '10', title: 'Book Recommendations', description: 'Must-read books in various genres', category: 'books', count: 450, created_at: new Date().toISOString(), image_url: TOPIC_IMAGES.books },
      { id: '11', title: 'Movie Reviews', description: 'Latest film reviews and discussions', category: 'movies', count: 420, created_at: new Date().toISOString(), image_url: TOPIC_IMAGES.movies },
      { id: '12', title: 'Nature & Environment', description: 'Environmental news and nature photography', category: 'nature', count: 380, created_at: new Date().toISOString(), image_url: TOPIC_IMAGES.nature },
    ];
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('discover.title') || 'Discover'}
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            {t('discover.subtitle') || 'Explore trending topics and find content that interests you'}
          </p>
        </div>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            {t('discover.trending') || 'Trending Topics'}
          </h2>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-8">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {trendingTopics.map(topic => (
                <Link 
                  to={`/topics/${topic.id}`} 
                  key={topic.id}
                  className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
                    {topic.image_url ? (
                      <img 
                        src={topic.image_url} 
                        alt={topic.title} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback if image fails to load
                          e.currentTarget.src = DEFAULT_IMAGE;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-rose-400 to-orange-500">
                        <span className="text-white font-bold text-2xl opacity-70">#</span>
                      </div>
                    )}
                    {topic.count && (
                      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                        {topic.count.toLocaleString()} {topic.count === 1 ? 'post' : 'posts'}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                      {topic.title}
                    </h3>
                    {topic.description && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                        {topic.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Additional sections can be added here */}
      </div>
    </div>
  );
};

export default DiscoverPage;
