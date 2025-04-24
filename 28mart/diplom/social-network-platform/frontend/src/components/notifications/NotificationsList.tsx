import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { IoCheckmarkDone, IoNotifications, IoClose } from 'react-icons/io5';

export const NotificationsList: React.FC = () => {
  const { t } = useTranslation();
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();

  // Memoize the markAsRead handler to prevent unnecessary re-renders
  const handleMarkAsRead = useCallback((id: string) => {
    markAsRead(id);
  }, [markAsRead]);

  // Memoize the markAllAsRead handler to prevent unnecessary re-renders
  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        <IoNotifications className="mx-auto h-8 w-8 mb-2" />
        <p>{t('notifications.noNotifications')}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('notifications.title')}
        </h3>
        {notifications.length > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center"
          >
            <IoCheckmarkDone className="h-4 w-4 mr-1" />
            {t('notifications.markAllAsRead')}
          </button>
        )}
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative group"
          >
            <div className="pr-8">
              <p className="text-sm text-gray-900 dark:text-white">
                {notification.content}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </p>
            </div>
            <button
              onClick={() => handleMarkAsRead(notification.id)}
              className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              title={t('notifications.markAsRead')}
              aria-label={t('notifications.markAsRead')}
            >
              <IoClose className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
