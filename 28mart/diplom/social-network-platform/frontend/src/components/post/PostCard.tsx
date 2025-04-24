import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiMoreVertical, FiTrash2, FiHeart, FiMessageSquare, FiShare2 } from 'react-icons/fi';
import { format } from 'date-fns';
import type { Post } from '../../types/post';
import ProfileAvatar from '../profile/ProfileAvatar';

interface PostCardProps {
  post: Post;
  isOwner: boolean;
  onDelete: () => Promise<void>;
}

const PostCard: React.FC<PostCardProps> = ({ post, isOwner, onDelete }) => {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete();
    } catch (error) {
      console.error('Error deleting post:', error);
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ProfileAvatar
            userId={post.user?.id}
            avatarUrl={post.user?.avatar_url}
            avatarEmoji={post.user?.avatar_emoji}
            fullName={post.user?.full_name}
            size="sm"
          />
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {post.user?.full_name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(post.created_at || ''), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {isOwner && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FiMoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5">
                <div className="py-1">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center"
                  >
                    <FiTrash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? t('post.deleting') : t('post.delete')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Content */}
      <div className="px-4 pb-4">
        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Post Image */}
      {post.image_url && (
        <div className="relative">
          <img
            src={post.image_url}
            alt="Post"
            className="w-full object-cover max-h-96"
          />
        </div>
      )}

      {/* Post Actions */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-6">
          <button className="flex items-center text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">
            <FiHeart className="w-5 h-5 mr-1.5" />
            <span className="text-sm">0</span>
          </button>
          <button className="flex items-center text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">
            <FiMessageSquare className="w-5 h-5 mr-1.5" />
            <span className="text-sm">0</span>
          </button>
          <button className="flex items-center text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">
            <FiShare2 className="w-5 h-5 mr-1.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
