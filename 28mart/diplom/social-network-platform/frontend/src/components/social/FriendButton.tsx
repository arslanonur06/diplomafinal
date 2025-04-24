import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { toast } from 'react-hot-toast';
import { FiUserPlus, FiUserCheck, FiUserX, FiLoader, FiMessageSquare } from 'react-icons/fi';

interface FriendButtonProps {
  targetUserId: string;
  size?: 'sm' | 'md' | 'lg';
  showMessageButton?: boolean;
  onStatusChange?: () => void;
}

const FriendButton: React.FC<FriendButtonProps> = ({
  targetUserId,
  size = 'md',
  showMessageButton = true,
  onStatusChange
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends'>('none');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const buttonClass = sizeClasses[size] || sizeClasses.md;

  useEffect(() => {
    const checkFriendshipStatus = async () => {
      if (!user || !targetUserId || user.id === targetUserId) {
        setInitialLoading(false);
        return;
      }

      try {
        // Check for sent request
        const { data: sentRequest, error: sentError } = await supabase
          .from('friendships')
          .select('status')
          .eq('user_id', user.id)
          .eq('friend_id', targetUserId)
          .maybeSingle();

        if (sentError && sentError.code !== 'PGRST116') {
          console.error('Error checking sent friend request:', sentError);
          throw sentError;
        }

        // Check for received request
        const { data: receivedRequest, error: receivedError } = await supabase
          .from('friendships')
          .select('status')
          .eq('user_id', targetUserId)
          .eq('friend_id', user.id)
          .maybeSingle();

        if (receivedError && receivedError.code !== 'PGRST116') {
          console.error('Error checking received friend request:', receivedError);
          throw receivedError;
        }

        if (sentRequest?.status === 'accepted' || receivedRequest?.status === 'accepted') {
          setStatus('friends');
        } else if (sentRequest?.status === 'pending') {
          setStatus('pending_sent');
        } else if (receivedRequest?.status === 'pending') {
          setStatus('pending_received');
        } else {
          setStatus('none');
        }
      } catch (error) {
        console.error('Error checking friendship status:', error);
        toast.error('Unable to check friendship status');
      } finally {
        setInitialLoading(false);
      }
    };

    checkFriendshipStatus();
  }, [user, targetUserId]);

  const handleSendRequest = async () => {
    if (!user || !targetUserId) return;
    
    setLoading(true);
    try {
      // Insert friend request
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: targetUserId,
          status: 'pending'
        });

      if (error) throw error;

      // Create notification for the recipient
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          type: 'friend_request',
          content: `You have a new friend request`,
          related_id: user.id,
          is_read: false
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      setStatus('pending_sent');
      toast.success('Friend request sent!');
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!user || !targetUserId) return;
    
    setLoading(true);
    try {
      // Delete the pending request
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', targetUserId);

      if (error) throw error;

      // Delete the notification
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', targetUserId)
        .eq('type', 'friend_request')
        .eq('related_id', user.id);

      setStatus('none');
      toast.success('Friend request cancelled');
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      toast.error('Failed to cancel friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!user || !targetUserId) return;
    
    setLoading(true);
    try {
      // Update the status to accepted
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('user_id', targetUserId)
        .eq('friend_id', user.id);

      if (error) throw error;

      // Create notification for the sender
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          type: 'friend_accepted',
          content: `Your friend request was accepted`,
          related_id: user.id,
          is_read: false
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      setStatus('friends');
      toast.success('Friend request accepted');
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error('Failed to accept friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!user || !targetUserId) return;
    
    setLoading(true);
    try {
      // Delete the pending request
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', targetUserId)
        .eq('friend_id', user.id);

      if (error) throw error;

      setStatus('none');
      toast.success('Friend request rejected');
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error('Failed to reject friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!user || !targetUserId) return;
    
    setLoading(true);
    try {
      // Delete the friendship record in both directions
      const { error: error1 } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', targetUserId);

      const { error: error2 } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', targetUserId)
        .eq('friend_id', user.id);

      if (error1) console.error('Error removing friendship 1:', error1);
      if (error2) console.error('Error removing friendship 2:', error2);
      if (error1 && error2) throw error1;

      setStatus('none');
      toast.success('Friend removed');
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('Failed to remove friend');
    } finally {
      setLoading(false);
    }
  };

  const navigateToChat = () => {
    navigate(`/messages/${targetUserId}`);
  };

  if (initialLoading) {
    return (
      <button 
        disabled
        className={`${buttonClass} bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center`}
      >
        <FiLoader className="animate-spin" />
      </button>
    );
  }

  if (!user || user.id === targetUserId) {
    return null;
  }

  return (
    <div className="flex space-x-2">
      {status === 'none' && (
        <button
          onClick={handleSendRequest}
          disabled={loading}
          className={`${buttonClass} bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center transition-colors`}
        >
          {loading ? <FiLoader className="animate-spin mr-1" /> : <FiUserPlus className="mr-1" />}
          Add Friend
        </button>
      )}

      {status === 'pending_sent' && (
        <button
          onClick={handleCancelRequest}
          disabled={loading}
          className={`${buttonClass} bg-gray-500 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors`}
        >
          {loading ? <FiLoader className="animate-spin mr-1" /> : <FiUserX className="mr-1" />}
          Cancel Request
        </button>
      )}

      {status === 'pending_received' && (
        <div className="flex space-x-2">
          <button
            onClick={handleAcceptRequest}
            disabled={loading}
            className={`${buttonClass} bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors`}
          >
            {loading ? <FiLoader className="animate-spin" /> : <FiUserCheck className="mr-1" />}
            Accept
          </button>
          <button
            onClick={handleRejectRequest}
            disabled={loading}
            className={`${buttonClass} bg-gray-500 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors`}
          >
            {loading ? <FiLoader className="animate-spin" /> : <FiUserX className="mr-1" />}
            Reject
          </button>
        </div>
      )}

      {status === 'friends' && (
        <div className="flex space-x-2">
          {showMessageButton && (
            <button
              onClick={navigateToChat}
              className={`${buttonClass} bg-indigo-500 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center transition-colors`}
            >
              <FiMessageSquare className="mr-1" />
              Message
            </button>
          )}
          <button
            onClick={handleRemoveFriend}
            disabled={loading}
            className={`${buttonClass} bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors`}
          >
            {loading ? <FiLoader className="animate-spin mr-1" /> : <FiUserCheck className="mr-1" />}
            Friends
          </button>
        </div>
      )}
    </div>
  );
};

export default FriendButton; 