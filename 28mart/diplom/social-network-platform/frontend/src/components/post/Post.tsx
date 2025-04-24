import React, { useState, useEffect } from 'react';
import { FiHeart, FiMessageSquare, FiBookmark, FiMoreHorizontal } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ProfileAvatar from '../profile/ProfileAvatar';
import { useLanguage } from '../../contexts/LanguageContext';

interface PostProps {
  post: {
    id: string;
    content: string;
    created_at: string;
    image_url?: string;
    author?: {
      name: string;
      avatar_url?: string;
      avatar_emoji?: string;
    };
    isAuthor?: boolean;
    comments_count?: number;
  };
  onLike?: (postId: string) => void;
  onSave?: (postId: string) => void;
}

export const Post: React.FC<PostProps> = ({ post, onLike, onSave }) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const fetchInitialStatus = async () => {
      if (!user || !post.id) return;

      try {
        const { data: likeData } = await supabase
          .from('post_likes')
          .select('id')
          .match({ user_id: user.id, post_id: post.id })
          .maybeSingle();

        setLiked(!!likeData);

        const { data: saveData } = await supabase
          .from('saved_posts')
          .select('id')
          .match({ user_id: user.id, post_id: post.id })
          .maybeSingle();

        setSaved(!!saveData);

        const { count } = await supabase
          .from('post_likes')
          .select('id', { count: 'exact' })
          .eq('post_id', post.id);

        setLikesCount(count || 0);
      } catch (error) {
        console.error('Error fetching post status:', error);
      }
    };

    fetchInitialStatus();
  }, [user, post.id]);

  const handleLike = async () => {
    if (!user) {
      toast.error(t('errors.loginRequired') || 'Login required');
      return;
    }

    try {
      const newLikedState = !liked;
      
      if (newLikedState) {
        const { error } = await supabase
          .from('post_likes')
          .insert([{ user_id: user.id, post_id: post.id }])
          .select()
          .single();

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .match({ user_id: user.id, post_id: post.id });

        if (error) throw error;
      }

      setLiked(newLikedState);
      setLikesCount(newLikedState ? likesCount + 1 : likesCount - 1);
      if (onLike) onLike(post.id);
    } catch (error) {
      console.error('Error liking/unliking post:', error);
      toast.error('Action failed');
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error(t('errors.loginRequired') || 'Login required');
      return;
    }

    try {
      const newSavedState = !saved;
      
      if (newSavedState) {
        const { error } = await supabase
          .from('saved_posts')
          .insert([{ 
            user_id: user.id, 
            post_id: post.id,
            created_at: new Date().toISOString()
          }]);

        if (error) throw error;
        toast.success(t('success.postSaved') || 'Post saved');
      } else {
        const { error } = await supabase
          .from('saved_posts')
          .delete()
          .match({ user_id: user.id, post_id: post.id });

        if (error) throw error;
        toast.success(t('success.postUnsaved') || 'Post unsaved');
      }

      setSaved(newSavedState);
      if (onSave) onSave(post.id);
    } catch (error) {
      console.error('Error saving/unsaving post:', error);
      toast.error(t('errors.savingFailed') || 'Saving failed');
    }
  };

  const handleHashtagClick = (hashtag: string) => {
    navigate(`/hashtag/${encodeURIComponent(hashtag)}`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4">
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ProfileAvatar
            avatarUrl={post.author?.avatar_url}
            avatarEmoji={post.author?.avatar_emoji}
            fullName={post.author?.name}
            size="sm"
          />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {post.author?.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(post.created_at))}
            </p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FiMoreHorizontal />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10">
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setShowMenu(false)}
              >
                Edit
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setShowMenu(false)}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Post Content */}
      <div className="px-4 py-2">
        {post.content.split(/(#\w+)/g).map((part, index) =>
          part.startsWith('#') ? (
            <button
              key={index}
              onClick={() => handleHashtagClick(part)}
              className="text-indigo-500 hover:underline"
            >
              {part}
            </button>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </div>

      {/* Post Images */}
      {post.image_url && (
        <div className="p-4">
          <img
            src={post.image_url}
            alt="Post image"
            className="rounded-lg w-full object-cover"
            style={{ maxHeight: '400px' }}
          />
        </div>
      )}

      {/* Post Actions */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button
              onClick={handleLike}
              className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              {liked ? (
                <FiHeart className="w-5 h-5 text-red-500" />
              ) : (
                <FiHeart className="w-5 h-5" />
              )}
              <span>{likesCount}</span>
            </button>
            <button className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              <FiMessageSquare className="w-5 h-5" />
              <span>{post.comments_count}</span>
            </button>
            <button className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              {t('post.share') || 'Share'}
            </button>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            title={saved ? t('post.unsave') || 'Unsave' : t('post.save') || 'Save'}
          >
            {saved ? (
              <FiBookmark className="w-5 h-5 text-blue-500" />
            ) : (
              <FiBookmark className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Post;
