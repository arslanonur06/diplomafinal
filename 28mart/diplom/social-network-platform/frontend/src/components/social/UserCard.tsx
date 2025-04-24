import { FC, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../common/Avatar';
import { FiMessageSquare } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

export interface UserCardProps {
  user: {
    id: string;
    username?: string;
    full_name: string;
    avatar_url?: string;
  };
  relationship?: 'friend' | 'pending' | 'none';
  onStatusChange?: () => void;
  onMessageClick?: () => void;
}

const UserCard: FC<UserCardProps> = ({ user, relationship, onStatusChange, onMessageClick }) => {
  const { user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showUnfriendDialog, setShowUnfriendDialog] = useState(false);
  const { t } = useTranslation();

  const handleFriendRequest = async () => {
    try {
      setIsLoading(true);
      if (!currentUser) return;

      const { error } = await supabase.from('relationships').insert({
        requester_id: currentUser.id,
        addressee_id: user.id,
        status: 'pending'
      });

      if (error) throw error;
      if (onStatusChange) onStatusChange();
    } catch (error) {
      alert('Failed to send friend request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfriend = async () => {
    setIsLoading(true);
    if (!currentUser) return;

    const { error } = await supabase.from('relationships').delete().eq('requester_id', currentUser.id).eq('addressee_id', user.id);

    if (!error && onStatusChange) onStatusChange();
    setIsLoading(false);
    setShowUnfriendDialog(false);
  };

  return (
    <div className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow mb-2 hover:shadow-md transition-shadow duration-200">
      <Avatar src={user.avatar_url} name={user.full_name} size="md" />
      <div className="ml-4 flex-1">
        <h3 className="font-semibold text-gray-900 dark:text-white">{user.full_name}</h3>
        <p className="text-gray-600 dark:text-gray-300">@{user.username || 'user'}</p>
      </div>
      
      <div className="flex gap-2">
        {relationship === 'friend' && onMessageClick && (
          <button
            onClick={onMessageClick}
            className="px-3 py-1 flex items-center bg-gradient-to-r from-indigo-500 to-rose-500 text-white rounded-lg hover:opacity-90 transition-opacity duration-200"
          >
            <FiMessageSquare className="mr-1" />
            {t('buttons.message')}
          </button>
        )}
        
        {relationship === 'none' && (
          <button
            onClick={handleFriendRequest}
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-rose-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity duration-200"
          >
            {isLoading ? t('buttons.sending') : t('buttons.addFriend')}
          </button>
        )}
        
        {relationship === 'pending' && (
          <span className="px-4 py-2 text-gray-500">{t('buttons.requestSent')}</span>
        )}
        
        {relationship === 'friend' && (
          <div className="relative">
            <button
              onClick={() => setShowUnfriendDialog(true)}
              className="px-4 py-2 text-green-500 hover:text-red-600 transition-colors"
            >
              {t('buttons.friends')}
            </button>
            {showUnfriendDialog && (
              <div className="absolute right-0 bottom-full mb-2 p-4 bg-white dark:bg-gray-800
                rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
                animate-fade-in-up z-10">
                <p className="mb-2">{t('actions.unfriendConfirm', { username: user.username || 'user' })}</p>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    onClick={handleUnfriend}
                  >
                    {t('buttons.confirm')}
                  </button>
                  <button
                    className="px-3 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    onClick={() => setShowUnfriendDialog(false)}
                  >
                    {t('buttons.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserCard;
