import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FiUserPlus, FiX, FiCheck, FiLoader } from 'react-icons/fi';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  username: string;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export default function UserSuggestions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsers();
    fetchPendingRequests();
  }, [user]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username')
        .neq('id', user?.id)
        .limit(20);

      if (error) throw error;
      setUsers(profiles || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(t('Failed to load user suggestions'));
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    if (!user) return;

    try {
      const { data: requests, error } = await supabase
        .from('friend_requests')
        .select('receiver_id')
        .eq('sender_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      setPendingRequests(new Set(requests?.map(r => r.receiver_id)));
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!user || processingRequests.has(receiverId)) return;

    setProcessingRequests(prev => new Set([...prev, receiverId]));

    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert([
          {
            sender_id: user.id,
            receiver_id: receiverId,
            status: 'pending'
          }
        ]);

      if (error) throw error;

      setPendingRequests(prev => new Set([...prev, receiverId]));
      toast.success(t('Friend request sent!'));
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error(t('Failed to send friend request'));
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(receiverId);
        return newSet;
      });
    }
  };

  const cancelFriendRequest = async (receiverId: string) => {
    if (!user || processingRequests.has(receiverId)) return;

    setProcessingRequests(prev => new Set([...prev, receiverId]));

    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .match({ sender_id: user.id, receiver_id: receiverId });

      if (error) throw error;

      setPendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(receiverId);
        return newSet;
      });
      toast.success(t('Friend request cancelled'));
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      toast.error(t('Failed to cancel friend request'));
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(receiverId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <FiLoader className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('People you may know')}
        </h2>
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {users.map((profile) => (
          <div key={profile.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <div className="flex items-center space-x-3">
              <img
                src={profile.avatar_url || '/default-avatar.png'}
                alt={profile.full_name}
                className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/default-avatar.png';
                }}
              />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {profile.full_name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  @{profile.username}
                </p>
              </div>
            </div>
            
            {pendingRequests.has(profile.id) ? (
              <button
                onClick={() => cancelFriendRequest(profile.id)}
                disabled={processingRequests.has(profile.id)}
                className="flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {processingRequests.has(profile.id) ? (
                  <FiLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <FiX className="w-4 h-4" />
                    <span>{t('Cancel')}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => sendFriendRequest(profile.id)}
                disabled={processingRequests.has(profile.id)}
                className="flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
              >
                {processingRequests.has(profile.id) ? (
                  <FiLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <FiUserPlus className="w-4 h-4" />
                    <span>{t('Add')}</span>
                  </>
                )}
              </button>
            )}
          </div>
        ))}
        
        {users.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {t('No suggestions available')}
          </div>
        )}
      </div>
    </div>
  );
} 