import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FiUsers, FiUser, FiHeart, FiStar, FiClock, FiMessageCircle } from 'react-icons/fi';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import Avatar from '../components/common/Avatar';
import { Link } from 'react-router-dom';

interface FavoriteGroup {
  id: string;
  name: string;
  members: number;
  lastActive: string;
  image: string;
  description: string;
}

interface FavoriteConnection {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

// Define the shapes based on what Supabase actually returns
interface GroupMemberData {
  group_id: string;
  groups: {
    id: string;
    name: string;
    member_count?: number;
    last_activity?: string;
    banner_url?: string;
    description?: string;
  };
}

interface UserConnectionData {
  friend_id: string;
  profiles: {
    full_name: string;
    headline?: string;
    avatar_url?: string;
  };
}

const FavoritesPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'groups' | 'connections'>('groups');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [favoriteGroups, setFavoriteGroups] = useState<FavoriteGroup[]>([]);
  const [favoriteConnections, setFavoriteConnections] = useState<FavoriteConnection[]>([]);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user, activeTab]);

  const fetchFavorites = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      if (activeTab === 'groups') {
        const { data, error } = await supabase
          .from('group_members')
          .select('group_id, groups(*)')
          .eq('user_id', user.id)
          .eq('is_favorite', true);
        
        if (error) throw error;
        
        const formattedGroups = data?.map((item: any) => ({
          id: item.groups.id,
          name: item.groups.name,
          members: item.groups.member_count || 0,
          lastActive: item.groups.last_activity || new Date().toISOString(),
          image: item.groups.banner_url || `https://source.unsplash.com/800x600/?${item.groups.name.toLowerCase().replace(/ /g, '-')}`,
          description: item.groups.description || ''
        })) || [];
        
        setFavoriteGroups(formattedGroups);
      } else {
        const { data, error } = await supabase
          .from('user_connections')
          .select('friend_id, profiles:friend_id(*)')
          .eq('user_id', user.id)
          .eq('status', 'accepted')
          .eq('is_favorite', true);
        
        if (error) throw error;
        
        const formattedConnections = data?.map((item: any) => ({
          id: item.friend_id,
          name: item.profiles.full_name,
          role: item.profiles.headline || t('favorites.noHeadline') || 'No headline',
          avatar: item.profiles.avatar_url || ''
        })) || [];
        
        setFavoriteConnections(formattedConnections);
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (id: string, type: 'group' | 'connection') => {
    if (!user) return;
    
    try {
      if (type === 'group') {
        const { error } = await supabase
          .from('group_members')
          .update({ is_favorite: false })
          .eq('user_id', user.id)
          .eq('group_id', id);
        
        if (error) throw error;
        
        setFavoriteGroups(prev => prev.filter(group => group.id !== id));
      } else {
        const { error } = await supabase
          .from('user_connections')
          .update({ is_favorite: false })
          .eq('user_id', user.id)
          .eq('friend_id', id);
        
        if (error) throw error;
        
        setFavoriteConnections(prev => prev.filter(conn => conn.id !== id));
      }
    } catch (err) {
      console.error('Error updating favorite status:', err);
    }
  };

  const fallbackHeadline = t('favorites.noHeadline') || 'No headline';
  const fallbackGroups: FavoriteGroup[] = [
    { id: '1', name: t('favorites.tabs.groups') || 'Groups', members: 1250, lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), image: 'https://source.unsplash.com/800x600/?photography', description: t('favorites.tabs.groups') || 'Groups' },
    { id: '2', name: t('favorites.tabs.groups') || 'Groups', members: 3420, lastActive: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), image: 'https://source.unsplash.com/800x600/?technology', description: t('favorites.tabs.groups') || 'Groups' },
    { id: '3', name: t('favorites.tabs.groups') || 'Groups', members: 2150, lastActive: new Date(Date.now() - 30 * 60 * 1000).toISOString(), image: 'https://source.unsplash.com/800x600/?travel', description: t('favorites.tabs.groups') || 'Groups' }
  ];

  const fallbackConnections: FavoriteConnection[] = [
    { id: '1', name: t('favorites.tabs.connections') || 'Connections', role: fallbackHeadline, avatar: 'https://i.pravatar.cc/150?img=4' },
    { id: '2', name: t('favorites.tabs.connections') || 'Connections', role: fallbackHeadline, avatar: 'https://i.pravatar.cc/150?img=5' },
    { id: '3', name: t('favorites.tabs.connections') || 'Connections', role: fallbackHeadline, avatar: 'https://i.pravatar.cc/150?img=6' }
  ];

  const displayGroups = favoriteGroups.length > 0 ? favoriteGroups : fallbackGroups;
  const displayConnections = favoriteConnections.length > 0 ? favoriteConnections : fallbackConnections;

  const formatTimeAgo = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white flex items-center">
          <FiStar className="mr-3 h-6 w-6" /> {t('favorites.title') || 'Favorites'}
        </h1>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8">
          <button
            onClick={() => setActiveTab('groups')}
            className={`py-4 px-6 font-medium text-base focus:outline-none ${ activeTab === 'groups' ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300' }`}
          >
            <span className="flex items-center">
              <FiUsers className="mr-2" /> 
              {t('favorites.tabs.groups') || 'Groups'}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`py-4 px-6 font-medium text-base focus:outline-none ${ activeTab === 'connections' ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300' }`}
          >
            <span className="flex items-center">
              <FiUser className="mr-2" /> 
              {t('favorites.tabs.connections') || 'Connections'}
            </span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : activeTab === 'groups' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayGroups.map(group => (
              <div key={group.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group border border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <img src={group.image} alt={group.name} className="w-full h-48 object-cover" />
                  <button 
                    onClick={() => toggleFavorite(group.id, 'group')}
                    className="absolute top-3 right-3 bg-white dark:bg-gray-800 p-2 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label={t('favorites.buttons.remove') || 'Remove from Favorites'}
                  >
                    <FiHeart className="h-5 w-5 text-red-500" />
                  </button>
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{group.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{group.description}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center"><FiUsers className="mr-1" /> {group.members} {t('groups.members') || 'members'}</span> 
                    <span className="flex items-center"><FiClock className="mr-1" /> {formatTimeAgo(group.lastActive)}</span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-t border-gray-200 dark:border-gray-700">
                  <Link 
                    to={`/groups/${group.id}`}
                    className="w-full block text-center py-2 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium rounded-full hover:shadow transition-all"
                  >
                    {t('favorites.buttons.viewGroup') || 'View Group'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayConnections.map(connection => (
              <div key={connection.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col group border border-gray-200 dark:border-gray-700">
                <div className="p-6 flex flex-col items-center text-center flex-grow">
                  <div className="relative mb-4">
                    <Avatar src={connection.avatar} name={connection.name} size="lg" />
                    <button 
                      onClick={() => toggleFavorite(connection.id, 'connection')}
                      className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 p-2 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label={t('favorites.buttons.remove') || 'Remove from Favorites'}
                    >
                      <FiHeart className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                  <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">{connection.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{connection.role || fallbackHeadline}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <Link 
                      to={`/profile/${connection.id}`}
                      className="flex-1 block text-center py-2 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium rounded-full hover:shadow transition-all"
                    >
                      {t('buttons.viewProfile') || 'View Profile'}
                    </Link>
                    <Link 
                      to={`/messages/${connection.id}`}
                      className="w-auto block text-center py-2 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-full hover:shadow transition-all"
                      aria-label={t('buttons.message') || 'Message'}
                    >
                      <FiMessageCircle className="h-5 w-5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && activeTab === 'groups' && displayGroups.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400">{t('favorites.no_groups') || 'You haven\'t favorited any groups yet.'}</p>
          </div>
        )}
        {!isLoading && activeTab === 'connections' && displayConnections.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400">{t('favorites.no_connections') || 'You haven\'t favorited any connections yet.'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
