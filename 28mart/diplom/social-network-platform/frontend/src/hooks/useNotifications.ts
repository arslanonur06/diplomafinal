import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../utils/supabaseClient';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  content: string;
  read: boolean;
  created_at: string;
  related_id?: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  // Memoize fetchNotifications to prevent unnecessary re-renders
  const fetchNotifications = useCallback(async (force = false) => {
    // Skip fetching if it's been less than 30 seconds since the last fetch
    // unless force is true
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < 30000) {
      return;
    }
    
    if (!user?.id) return;
    
    lastFetchTimeRef.current = now;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // For each notification with related_id, fetch the profile info
      const notificationsWithProfiles = await Promise.all((data || []).map(async (notification) => {
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
      
      // Explicit type assertion with check
      setNotifications(notificationsWithProfiles as unknown as Notification[]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Memoize markAsRead to prevent unnecessary re-renders
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Remove the notification from the local state immediately for better UX
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Force a refresh to ensure the count is updated properly
      setTimeout(() => {
        fetchNotifications(true);
      }, 100);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [fetchNotifications, user?.id]);

  // Memoize markAllAsRead to prevent unnecessary re-renders
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      // Clear all notifications from local state immediately for better UX
      setNotifications([]);
      
      // Force a refresh to ensure the count is updated properly
      setTimeout(() => {
        fetchNotifications(true);
      }, 100);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [user?.id, fetchNotifications]);

  // Set up subscription to real-time notifications
  useEffect(() => {
    if (!user) return;
    
    // Initial fetch
    fetchNotifications(true);
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
        }
      )
      .subscribe();
    
    subscriptionRef.current = subscription;
    
    // Clean up subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [user, fetchNotifications]);

  return {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    fetchNotifications: () => fetchNotifications(true) // Force refresh when called directly
  };
};
