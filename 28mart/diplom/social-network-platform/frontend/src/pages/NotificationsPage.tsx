import React, { useState, useEffect } from 'react';
import { FaUserPlus, FaHeart, FaComment, FaUsers, FaCalendarAlt } from 'react-icons/fa';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  type: string;
  content: string;
  created_at: string;
  read: boolean;
  user_id: string;
  related_id?: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

const NotificationsPage: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      console.log("Fetching notifications for user:", user?.id);
      
      const { data, error } = await supabase
        .from('notifications')
        .select(`*`)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error; // Re-throw to propagate
      }

      console.log("Raw notifications data:", data);

      // Now for each notification with a related_id, fetch the profile data separately
      const notificationsWithProfiles = await Promise.all((data || []).map(async (notification) => {
        if (notification.related_id) {
          try {
            // Debug için log ekliyoruz
            console.log(`Fetching profile for notification type: ${notification.type}, related_id: ${notification.related_id}`);
            
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', notification.related_id)
              .single();
              
            if (profileError) {
              console.error("Error fetching profile:", profileError);
              return notification;
            }
              
            if (profileData) {
              console.log("Profile data found:", profileData);
              return {
                ...notification,
                sender: profileData
              };
            }
          } catch (err) {
            console.error('Error fetching profile for notification:', err);
          }
        }
        return notification;
      }));
      
      console.log("Final notifications with profiles:", notificationsWithProfiles);
      setNotifications(notificationsWithProfiles);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter(n => !n.read)
        .map(n => n.id);
      
      if (unreadIds.length === 0) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  const handleDeleteAll = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;

      setNotifications([]);
      toast.success('All notifications deleted');
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Failed to delete notifications');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <FaUserPlus className="w-4 h-4 text-indigo-500" />;
      case 'friend_accepted':
        return <FaUserPlus className="w-4 h-4 text-green-500" />;
      case 'like':
        return <FaHeart className="w-4 h-4 text-rose-500" />;
      case 'comment':
        return <FaComment className="w-4 h-4 text-green-500" />;
      case 'group':
        return <FaUsers className="w-4 h-4 text-purple-500" />;
      case 'event':
        return <FaCalendarAlt className="w-4 h-4 text-yellow-500" />;
      default:
        return <FaComment className="w-4 h-4 text-blue-500" />;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !notification.read;
    return notification.type.includes(activeFilter);
  });

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 dark:bg-neutral-800">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('notifications.title')}
        </h1>
        <div className="space-x-2">
          <button
            onClick={handleMarkAllAsRead}
            className="px-3 py-1 text-sm bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-800/30"
          >
            {t('notifications.markAllAsRead')}
          </button>
          <button
            onClick={handleDeleteAll}
            className="px-3 py-1 text-sm bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-800/30"
          >
            {t('notifications.deleteAll')}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow overflow-hidden mb-6">
        <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-200 dark:border-gray-700">
          <button
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeFilter === 'all'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-600 dark:text-gray-300'
            }`}
            onClick={() => setActiveFilter('all')}
          >
            {t('notifications.all')}
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeFilter === 'unread'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-600 dark:text-gray-300'
            }`}
            onClick={() => setActiveFilter('unread')}
          >
            {t('notifications.unread')}
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeFilter === 'friend'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-600 dark:text-gray-300'
            }`}
            onClick={() => setActiveFilter('friend')}
          >
            {t('notifications.friends')}
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeFilter === 'like'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-600 dark:text-gray-300'
            }`}
            onClick={() => setActiveFilter('like')}
          >
            {t('notifications.likes')}
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeFilter === 'comment'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-600 dark:text-gray-300'
            }`}
            onClick={() => setActiveFilter('comment')}
          >
            {t('notifications.comments')}
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t('loading')}</p>
          </div>
        ) : (
          <>
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">{t('notifications.empty')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 flex ${
                      notification.read
                        ? 'bg-white dark:bg-neutral-800'
                        : 'bg-indigo-50 dark:bg-indigo-900/20'
                    }`}
                  >
                    <div className="flex-shrink-0 mr-4">
                      {notification.sender?.avatar_url ? (
                        <img
                          src={notification.sender.avatar_url}
                          alt={notification.sender.full_name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center">
                          {getIcon(notification.type)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {notification.content}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                        >
                          {t('notifications.markAsRead')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
