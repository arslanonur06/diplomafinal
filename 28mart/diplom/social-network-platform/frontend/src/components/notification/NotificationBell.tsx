import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { FiBell } from 'react-icons/fi';
import { FaUserPlus, FaHeart, FaComment, FaUsers, FaCalendarAlt } from 'react-icons/fa';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  content: string;
  read: boolean;
  created_at: string;
  related_id?: string;
  related_url?: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Close the dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        
        // Fetch notifications
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching notifications:', error);
          throw error;
        }

        console.log('Raw notifications:', data); // For debugging
        
        // If no notifications found, let's create some mock ones for testing
        const mockNotifications: Notification[] = [];
        
        if (!data || data.length === 0) {
          // Generate some mock notifications for testing
          mockNotifications.push(
            {
              id: 'mock1',
              user_id: user.id,
              type: 'friend_request',
              content: 'Alex Johnson sent you a friend request',
              read: false,
              created_at: new Date(Date.now() - 3600000).toISOString(),
              related_id: 'mock-user-1',
              related_url: '/profile/mock-user-1',
              sender: {
                id: 'mock-user-1',
                full_name: 'Alex Johnson',
                avatar_url: 'https://randomuser.me/api/portraits/men/32.jpg'
              }
            },
            {
              id: 'mock2',
              user_id: user.id,
              type: 'like',
              content: 'Maria Garcia liked your post',
              read: false,
              created_at: new Date(Date.now() - 7200000).toISOString(),
              related_id: 'mock-post-1',
              related_url: '/post/mock-post-1',
              sender: {
                id: 'mock-user-2',
                full_name: 'Maria Garcia',
                avatar_url: 'https://randomuser.me/api/portraits/women/44.jpg'
              }
            },
            {
              id: 'mock3',
              user_id: user.id,
              type: 'comment',
              content: 'James Smith commented on your post',
              read: true,
              created_at: new Date(Date.now() - 86400000).toISOString(),
              related_id: 'mock-post-2',
              related_url: '/post/mock-post-2',
              sender: {
                id: 'mock-user-3',
                full_name: 'James Smith',
                avatar_url: 'https://randomuser.me/api/portraits/men/45.jpg'
              }
            },
            {
              id: 'mock4',
              user_id: user.id,
              type: 'group',
              content: 'You were added to Photography Enthusiasts group',
              read: true,
              created_at: new Date(Date.now() - 172800000).toISOString(),
              related_id: 'mock-group-1',
              related_url: '/groups/mock-group-1',
              sender: {
                id: 'mock-user-4',
                full_name: 'Photography Enthusiasts',
                avatar_url: null
              }
            },
            {
              id: 'mock5',
              user_id: user.id,
              type: 'event',
              content: 'New event: Tech Conference 2023',
              read: false,
              created_at: new Date(Date.now() - 259200000).toISOString(),
              related_id: 'mock-event-1',
              related_url: '/events/mock-event-1',
              sender: {
                id: 'mock-user-5',
                full_name: 'Tech Events',
                avatar_url: null
              }
            }
          );
          
          setNotifications(mockNotifications);
          setUnreadCount(mockNotifications.filter(n => !n.read).length);
          setLoading(false);
          return;
        }

        // For each notification with related_id, fetch the profile info
        const notificationsWithProfiles = await Promise.all((data || []).map(async (notification) => {
          // For friend_request types, get profile info for related_id
          if (notification.related_id) {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', notification.related_id)
                .single();
                
              if (!profileError && profileData) {
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

        console.log('Notifications with profiles:', notificationsWithProfiles);
        setNotifications(notificationsWithProfiles);
        setUnreadCount(notificationsWithProfiles.filter(n => !n.read).length || 0);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        // Fallback to mock notifications on error
        createMockNotifications();
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Set up real-time subscription
    const subscription = supabase
      .channel('notifications_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, async (payload) => {
        console.log('New notification received:', payload);
        
        // Fetch sender details for the new notification
        const newNotification = payload.new as Notification;
        
        if (newNotification.related_id) {
          const { data: senderData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', newNotification.related_id)
            .single();
            
          if (senderData) {
            newNotification.sender = senderData;
          }
        }
        
        console.log('Processed new notification:', newNotification);
        setNotifications(prev => [newNotification, ...prev].slice(0, 10));
        setUnreadCount(prev => prev + 1);
        
        // Show notification sound or toast here
        try {
          const notificationSound = new Audio('/notification.mp3');
          notificationSound.play();
        } catch (error) {
          console.error('Error playing notification sound:', error);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);
  
  // Helper function to create mock notifications
  const createMockNotifications = () => {
    if (!user) return;
    
    const mockNotifications: Notification[] = [
      {
        id: 'mock1',
        user_id: user.id,
        type: 'friend_request',
        content: 'Alex Johnson sent you a friend request',
        read: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        related_id: 'mock-user-1',
        related_url: '/profile/mock-user-1',
        sender: {
          id: 'mock-user-1',
          full_name: 'Alex Johnson',
          avatar_url: 'https://randomuser.me/api/portraits/men/32.jpg'
        }
      },
      {
        id: 'mock2',
        user_id: user.id,
        type: 'like',
        content: 'Maria Garcia liked your post',
        read: false,
        created_at: new Date(Date.now() - 7200000).toISOString(),
        related_id: 'mock-post-1',
        related_url: '/post/mock-post-1',
        sender: {
          id: 'mock-user-2',
          full_name: 'Maria Garcia',
          avatar_url: 'https://randomuser.me/api/portraits/women/44.jpg'
        }
      },
      {
        id: 'mock3',
        user_id: user.id,
        type: 'comment',
        content: 'James Smith commented on your post',
        read: true,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        related_id: 'mock-post-2',
        related_url: '/post/mock-post-2',
        sender: {
          id: 'mock-user-3',
          full_name: 'James Smith',
          avatar_url: 'https://randomuser.me/api/portraits/men/45.jpg'
        }
      }
    ];
    
    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.read).length);
  };

  const handleMarkAllAsRead = async () => {
    if (!user || notifications.length === 0) return;

    try {
      // For real notifications
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      // Update UI
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      // For real notifications
      if (!id.startsWith('mock')) {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id);
  
        if (error) throw error;
      }

      // Update UI for all notifications (real and mock)
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
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

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
        aria-label="Notifications"
      >
        <FiBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-rose-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="flex justify-center mb-3">
                  <FiBell className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                </div>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const href = notification.related_url || '#';
                
                return (
                  <div 
                    key={notification.id}
                    className={`p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors relative ${notification.read ? '' : 'bg-indigo-50 dark:bg-indigo-900/10'}`}
                  >
                    <Link 
                      to={href} 
                      className="flex items-start space-x-3"
                      onClick={() => {
                        if (!notification.read) {
                          handleMarkAsRead(notification.id);
                        }
                      }}
                    >
                      <div className="mt-1.5 flex-shrink-0">
                        {notification.sender?.avatar_url ? (
                          <img 
                            src={notification.sender.avatar_url} 
                            alt={notification.sender.full_name || ''} 
                            className="w-9 h-9 rounded-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=' + 
                                (notification.sender?.full_name?.charAt(0) || '?');
                            }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                            {notification.sender?.full_name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-tight">
                          {notification.content}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center space-x-1">
                          <span className="inline-block mr-1">{getIcon(notification.type)}</span>
                          <span>{formatTimeAgo(notification.created_at)}</span>
                        </span>
                      </div>
                    </Link>
                    {!notification.read && (
                      <span className="absolute right-3 top-3 flex-shrink-0 rounded-full w-2 h-2 bg-indigo-500"></span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          <div className="p-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
            <Link 
              to="/notifications"
              className="w-full py-2 text-sm text-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md block transition-colors"
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 