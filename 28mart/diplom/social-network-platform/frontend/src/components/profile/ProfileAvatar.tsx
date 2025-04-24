import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import EmojiAvatar from '../common/EmojiAvatar';
import EmojiPicker from '../common/EmojiPicker';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface ProfileAvatarProps {
  userId?: string;
  avatarUrl?: string | null;
  avatarEmoji?: string | null;
  fullName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  onAvatarChange?: (type: 'url' | 'emoji' | 'file', value: string | File) => void;
  suggestedEmojis?: string[];
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  userId,
  avatarUrl = null,
  avatarEmoji = null,
  fullName = '',
  size = 'md',
  editable = false,
  onAvatarChange,
  suggestedEmojis
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if this is the current user's avatar
  const isCurrentUser = !userId || (user && user.id === userId);
  
  // Only allow editing if editable prop is true and it's the current user's avatar
  const canEdit = editable && isCurrentUser;

  const handleEmojiSelect = async (emoji: string) => {
    if (onAvatarChange) {
      onAvatarChange('emoji', emoji);
    } else if (user && canEdit) {
      setIsLoading(true);
      try {
        // Update in auth metadata
        await supabase.auth.updateUser({
          data: { avatar_emoji: emoji, avatar_url: null }
        });
        
        // Update in database
        await supabase
          .from('users')
          .update({ avatar_emoji: emoji, avatar_url: null })
          .eq('id', user.id);
          
        toast.success('Avatar updated successfully');
      } catch (error) {
        console.error('Error updating avatar emoji:', error);
        toast.error('Failed to update avatar');
      } finally {
        setIsLoading(false);
        setShowEmojiPicker(false);
      }
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !canEdit || !e.target.files || !e.target.files[0]) return;

    try {
      setIsLoading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (onAvatarChange) {
        onAvatarChange('url', publicUrl);
      } else {
        // Update in auth metadata
        await supabase.auth.updateUser({
          data: { avatar_url: publicUrl, avatar_emoji: null }
        });
        
        // Update in database
        await supabase
          .from('users')
          .update({ avatar_url: publicUrl, avatar_emoji: null })
          .eq('id', user.id);
      }
      
      toast.success('Avatar uploaded successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setIsLoading(false);
      setShowEmojiPicker(false);
    }
  };

  return (
    <div className="relative">
      {/* Avatar display */}
      {avatarEmoji ? (
        <EmojiAvatar
          emoji={avatarEmoji}
          size={size}
          fallbackInitials={fullName}
          className={canEdit ? 'cursor-pointer' : ''}
          onClick={canEdit ? () => setShowEmojiPicker(true) : undefined}
        />
      ) : avatarUrl ? (
        <div 
          className={`overflow-hidden rounded-full ${
            size === 'sm' ? 'w-8 h-8' : 
            size === 'md' ? 'w-12 h-12' : 
            size === 'lg' ? 'w-16 h-16' : 'w-24 h-24'
          } ${canEdit ? 'cursor-pointer' : ''}`}
          onClick={canEdit ? () => setShowEmojiPicker(true) : undefined}
        >
          <img 
            src={avatarUrl} 
            alt={fullName} 
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <EmojiAvatar
          fallbackInitials={fullName}
          size={size}
          className={canEdit ? 'cursor-pointer' : ''}
          onClick={canEdit ? () => setShowEmojiPicker(true) : undefined}
        />
      )}

      {/* Edit button (shown only for editable avatars) */}
      {canEdit && (
        <button
          type="button"
          onClick={() => setShowEmojiPicker(true)}
          disabled={isLoading}
          className="absolute bottom-0 right-0 bg-rose-500 text-white p-1 rounded-full shadow-md hover:bg-rose-600 disabled:opacity-50"
        >
          {isLoading ? (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          )}
        </button>
      )}

      {/* Emoji picker popup */}
      {showEmojiPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-md w-full">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Choose your avatar
              </h3>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Use an emoji
                </h4>
                <EmojiPicker 
                  onSelect={handleEmojiSelect} 
                  selectedEmoji={avatarEmoji || undefined} 
                />
              </div>
              
              <div className="border-t dark:border-gray-700 pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Or upload an image
                </h4>
                <label className="flex items-center justify-center w-full h-12 px-4 transition bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Choose a file
                  </span>
                  <input 
                    type="file" 
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={isLoading}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileAvatar; 