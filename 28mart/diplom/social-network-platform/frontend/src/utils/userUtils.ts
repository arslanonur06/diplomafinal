import { supabase } from '../services/supabase';

/**
 * User types and utility functions for working with users
 */

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  avatar_emoji?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  created_at: string;
  updated_at?: string | null;
}

/**
 * Get a user profile by ID
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!userId) return null;
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

/**
 * Format a user's display name
 */
export const formatUserName = (user: UserProfile | null | undefined): string => {
  if (!user) return 'Unknown User';
  return user.full_name || 'Unnamed User';
};

/**
 * Get an avatar URL for a user
 */
export const getUserAvatar = (user: UserProfile | null | undefined): string => {
  if (!user) return '';
  return user.avatar_url || '';
};

/**
 * Notification types supported by the system
 */
export type NotificationType = 
  | 'friend_request' 
  | 'friend_accepted' 
  | 'like' 
  | 'comment' 
  | 'group_invite'
  | 'group_joined'
  | 'event_invite'
  | 'event_reminder'
  | 'mention';

/**
 * Generate consistent notification content based on type and context
 */
export const generateNotificationContent = async (
  type: NotificationType, 
  actorId: string,
  targetName?: string
): Promise<string> => {
  try {
    // Get the actor's profile
    const actor = await getUserProfile(actorId);
    const actorName = formatUserName(actor);
    
    switch (type) {
      case 'friend_request':
        return `${actorName} sent you a friend request`;
      
      case 'friend_accepted':
        return `${actorName} accepted your friend request`;
      
      case 'like':
        return `${actorName} liked your post`;
      
      case 'comment':
        return `${actorName} commented on your post`;
      
      case 'group_invite':
        return `${actorName} invited you to join ${targetName || 'a group'}`;
      
      case 'group_joined':
        return `${actorName} joined ${targetName || 'your group'}`;
      
      case 'event_invite':
        return `${actorName} invited you to ${targetName || 'an event'}`;
      
      case 'event_reminder':
        return `Reminder: ${targetName || 'Your event'} is coming up soon`;
      
      case 'mention':
        return `${actorName} mentioned you in a ${targetName || 'post'}`;
      
      default:
        return `${actorName} interacted with you`;
    }
  } catch (error) {
    console.error('Error generating notification content:', error);
    return 'You have a new notification';
  }
};

/**
 * Create a notification in the database
 */
export const createNotification = async (
  userId: string,
  type: NotificationType,
  actorId: string,
  targetName?: string
): Promise<boolean> => {
  try {
    const content = await generateNotificationContent(type, actorId, targetName);
    
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        content,
        related_id: actorId,
        read: false
      });
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return false;
  }
};

/**
 * Mark a specific notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}; 