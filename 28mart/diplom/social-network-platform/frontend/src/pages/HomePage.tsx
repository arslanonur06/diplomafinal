import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../services/supabase';
// Change import to useAuthContext
import { useAuthContext } from '../contexts/AuthContext';
import PostCreate from '../components/post/PostCreate';
import { FiPlus, FiHeart, FiMessageSquare, FiShare2, FiBookmark, FiSearch, FiMoreHorizontal, FiTrash2 } from 'react-icons/fi';
import ErrorMessage from '../components/ui/ErrorMessage';
import { formatDistanceToNow } from 'date-fns'; // For relative time
import { Button } from '../components/ui/Button'; // Changed from button to Button
import { useLanguage } from '../contexts/LanguageContext';

interface PostType {
  id: string;
  user_id: string;
  content: string;
  images?: string[];
  created_at: string;
  profile: {
    full_name: string;
    avatar_url: string | null;
  };
  likes_count: number;
  comments_count: number;
  shares: number;
  is_liked: boolean;
  is_saved: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

const PostCard: React.FC<{
  post: PostType;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onCommentClick: (post: PostType) => void;
  onShare: (postId: string) => void;
  onDelete: (postId: string) => void;
  currentUserId: string | undefined;
}> = ({ post, onLike, onSave, onCommentClick, onShare, onDelete, currentUserId }) => {
  const { t } = useLanguage();
  const [showFullContent, setShowFullContent] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const contentPreviewLength = 150; // Show more threshold

  const toggleShowFullContent = () => {
    setShowFullContent(!showFullContent);
  };

  const displayContent = showFullContent || post.content.length <= contentPreviewLength
    ? post.content
    : `${post.content.substring(0, contentPreviewLength)}...`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300">
      {/* Post Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <img
            src={post.profile.avatar_url || '/default-avatar.png'}
            alt={post.profile.full_name}
            className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 object-cover"
          />
          <div>
            <Link to={`/profile/${post.user_id}`} className="font-semibold text-sm text-gray-900 dark:text-white hover:underline">
              {post.profile.full_name}
            </Link>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        {/* More actions dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowOptions(!showOptions)} 
            className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-1 focus:outline-none"
            aria-label={t('common.more_options') || 'More options'}
          >
            <FiMoreHorizontal size={16} />
          </button>
          {/* Options Popover */}
          {showOptions && (
            <div 
              className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-600"
              onMouseLeave={() => setShowOptions(false)} // Hide on mouse leave
            >
              {/* Conditionally show Delete option */} 
              {currentUserId && currentUserId === post.user_id && (
                <button
                  onClick={() => {
                    onDelete(post.id);
                    setShowOptions(false); // Close popover after click
                  }}
                  className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <FiTrash2 className="mr-2" size={14}/> 
                  {t('buttons.delete') || 'Delete'}
                </button>
              )}
              {/* Add other options here if needed */}
              <button 
                 onClick={() => setShowOptions(false)} // Just close for now
                 className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                {t('actions.report') || 'Report'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Post Content */}
      <div className="px-3 pb-2">
        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {displayContent}
        </p>
        {post.content.length > contentPreviewLength && (
          <button onClick={toggleShowFullContent} className="text-xs text-rose-600 dark:text-rose-400 hover:underline mt-1">
            {showFullContent ? (t('actions.showLess') || 'Show Less') : (t('actions.showMore') || 'Show More')}
          </button>
        )}
      </div>

      {/* Post Image */}
      {post.images && post.images.length > 0 && (
        <div className="bg-gray-100 dark:bg-gray-700">
          <img
            src={post.images[0]} // Displaying only the first image for simplicity
            alt="Post media"
            className="w-full h-auto max-h-[40vh] object-contain" // Reduced from 60vh
          />
        </div>
      )}

      {/* Post Stats */}
      {(post.likes_count > 0 || post.comments_count > 0 || post.shares > 0) && (
        <div className="px-3 py-1 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            {post.likes_count > 0 && <span>{post.likes_count} Likes</span>}
            <div className="flex space-x-2">
              {post.comments_count > 0 && <span>{post.comments_count} Comments</span>}
              {post.shares > 0 && <span>{post.shares} Shares</span>}
            </div>
          </div>
        </div>
      )}

      {/* Post Actions */}
      <div className="flex justify-around items-center px-2 py-1 border-t border-gray-200 dark:border-gray-700 gap-1">
        <Button
          onClick={() => onLike(post.id)}
          className={`h-8 w-1/3 ${post.is_liked ? 'ring-1 ring-rose-500' : ''}`}
          variant="ghost"
        >
          <FiHeart className={`w-4 h-4 ${post.is_liked ? 'fill-rose-500 text-rose-500' : ''}`} />
          <span className="text-xs">{t('buttons.like') || 'Like'}</span>
        </Button>
        
        <Button
          onClick={() => onCommentClick(post)}
          className="h-8 w-1/3"
          variant="ghost"
        >
          <FiMessageSquare className="w-4 h-4" />
          <span className="text-xs">{t('buttons.comment') || 'Comment'}</span>
        </Button>
        
        <Button
          onClick={() => onShare(post.id)}
          className="h-8 w-1/3"
          variant="ghost"
        >
          <FiShare2 className="w-4 h-4" />
          <span className="text-xs">{t('buttons.share') || 'Share'}</span>
        </Button>
        
        <Button
          onClick={() => onSave(post.id)}
          title={post.is_saved ? (t('buttons.unsave') || 'Unsave') : (t('buttons.save') || 'Save')}
          className={`h-8 w-1/3 ${post.is_saved ? 'ring-1 ring-amber-500' : ''}`}
          variant="ghost"
        >
          <FiBookmark className={`w-4 h-4 ${post.is_saved ? 'fill-amber-500 text-amber-500' : ''}`} />
          <span className="text-xs">{post.is_saved ? (t('buttons.saved') || 'Saved') : (t('buttons.save') || 'Save')}</span>
        </Button>
      </div>
    </div>
  );
};

const HomePage = () => {
  // Change useAuth to useAuthContext 
  const { user } = useAuthContext();
  const { t } = useLanguage();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPostForComments, setSelectedPostForComments] = useState<PostType | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (!user?.id) {
      console.log('HomePage: User not available yet, skipping post fetch.');
      setLoading(false); // Stop loading if no user
        return;
    }
    console.log('HomePage: Fetching posts for user', user.id);
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profile:profiles!user_id(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(30); // Fetch more posts
      
      // If on "my" tab, filter to only show current user's posts
      if (activeTab === 'my') {
        query = query.eq('user_id', user.id);
      }

      let { data: postsData, error: postsError } = await query;

      if (postsError) throw postsError;

      const postIds = postsData?.map(p => p.id) || [];

      // Fetch engagement data in parallel
      const [likesData, commentsData, savesData] = await Promise.all([
        supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
        supabase.from('post_comments').select('post_id, id', { count: 'exact' }).in('post_id', postIds),
        supabase.from('saved_posts').select('post_id').eq('user_id', user.id).in('post_id', postIds)
      ]);

      if (likesData.error) console.error("Error fetching likes:", likesData.error);
      if (commentsData.error) console.error("Error fetching comments count:", commentsData.error);
      if (savesData.error) console.error("Error fetching saves:", savesData.error);

      const userLikedPostIds = new Set(likesData.data?.map(l => l.post_id));
      const userSavedPostIds = new Set(savesData.data?.map(s => s.post_id));
      const commentsCountMap = new Map<string, number>();
      commentsData.data?.forEach(c => {
        commentsCountMap.set(c.post_id, (commentsCountMap.get(c.post_id) || 0) + 1); // Simple count
      });

      // Aggregate likes count separately (consider optimizing this in backend/DB function later)
      const { data: allLikesData, error: allLikesError } = await supabase
        .from('post_likes')
        .select('post_id')
        .in('post_id', postIds);

      if (allLikesError) console.error("Error fetching all likes:", allLikesError);

      const likesCountMap = new Map<string, number>();
      allLikesData?.forEach(l => {
        likesCountMap.set(l.post_id, (likesCountMap.get(l.post_id) || 0) + 1);
      });


      const enhancedPosts = postsData?.map(post => ({
        ...post,
        likes_count: likesCountMap.get(post.id) || 0,
        comments_count: commentsCountMap.get(post.id) || 0,
        shares: post.shares || 0, // Assuming shares field exists
        is_liked: userLikedPostIds.has(post.id),
        is_saved: userSavedPostIds.has(post.id),
        profile: post.profile || { full_name: 'Unknown User', avatar_url: null } // Add fallback
      })) || [];
      
      setPosts(enhancedPosts);

    } catch (error: any) {
      console.error('Error fetching posts:', error);
      setError('Error fetching posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [user, activeTab]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const fetchComments = useCallback(async (postId: string) => {
    if (!postId) return;
    setLoadingComments(true);
    setComments([]); // Clear previous comments
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((data as Comment[]) || []);
    } catch (err) {
      console.error("Error fetching comments:", err);
      toast.error('Error fetching comments. Please try again later.');
    } finally {
      setLoadingComments(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPostForComments) {
      fetchComments(selectedPostForComments.id);
    }
  }, [selectedPostForComments, fetchComments]);

  const handleLike = async (postId: string) => {
    if (!user) return toast.error('Login required');
    const originalPosts = [...posts]; // Store original state for optimistic update rollback

    // Optimistic Update
    setPosts(prev =>
        prev.map(p => {
            if (p.id === postId) {
                const isLiked = !p.is_liked;
                const likesCount = p.is_liked ? p.likes_count - 1 : p.likes_count + 1;
                return { ...p, is_liked: isLiked, likes_count: Math.max(0, likesCount) }; // Ensure likes don't go below 0
            }
            return p;
        })
    );

    try {
        const post = originalPosts.find(p => p.id === postId);
      if (!post) return;

      if (post.is_liked) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        if (error) throw error;
            // toast.success(t('success.unliked')); // Optional: notify on success
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
            // toast.success(t('success.liked')); // Optional: notify on success
        }
    } catch (error: any) {
      console.error('Error toggling like:', error);
        toast.error('Action failed. Please try again later.');
        setPosts(originalPosts); // Rollback optimistic update on error
    }
  };

  const handleSave = async (postId: string) => {
    if (!user) return toast.error('Login required');
    const originalPosts = [...posts];

    // Optimistic Update
    setPosts(prev =>
        prev.map(p => {
            if (p.id === postId) {
                return { ...p, is_saved: !p.is_saved };
            }
            return p;
        })
    );

    try {
        const post = originalPosts.find(p => p.id === postId);
      if (!post) return;

      if (post.is_saved) {
        const { error } = await supabase
          .from('saved_posts')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        if (error) throw error;
        toast.success('Post unsaved');
      } else {
        const { error } = await supabase
          .from('saved_posts')
          .insert([{ post_id: postId, user_id: user.id }]);
        if (error) throw error;
        toast.success('Post saved');
      }
    } catch (error: any) {
      console.error('Error toggling save:', error);
        toast.error('Action failed. Please try again later.');
        setPosts(originalPosts); // Rollback
    }
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim() || !selectedPostForComments || !user) {
        toast.error('Comment error');
      return;
    }

    const tempCommentId = `temp-${Date.now()}`; // Temporary ID for optimistic update
    const commentToAdd: Comment = {
        id: tempCommentId,
        content: newComment,
        created_at: new Date().toISOString(),
        user_id: user.id,
        profiles: {
            full_name: user.user_metadata?.full_name || 'You',
            avatar_url: user.user_metadata?.avatar_url || null,
        },
    };

    // Optimistic Update for Comments List
    setComments(prev => [...prev, commentToAdd]);
    const originalPosts = [...posts];
    // Optimistic Update for Post Comment Count
    setPosts(prev =>
      prev.map(p =>
        p.id === selectedPostForComments.id
          ? { ...p, comments_count: p.comments_count + 1 }
          : p
      )
    );
    const commentContent = newComment; // Store content before clearing
    setNewComment(''); // Clear input field immediately


    try {
      const { data, error } = await supabase
        .from('post_comments')
          .insert({
              content: commentContent,
              post_id: selectedPostForComments.id,
            user_id: user.id
          })
        .select(`
          *,
            profiles:user_id (full_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Replace temporary comment with real one from DB
      setComments(prev => prev.map(c => c.id === tempCommentId ? { ...data, profiles: data.profiles } as Comment : c));
      toast.success('Comment added');

    } catch (err: any) {
      console.error('Error adding comment:', err);
        toast.error('Action failed. Please try again later.');
        // Rollback optimistic updates
        setComments(prev => prev.filter(c => c.id !== tempCommentId)); // Remove temp comment
        setPosts(originalPosts); // Restore original post counts
        setNewComment(commentContent); // Restore input field content
    }
  };

  const handleShare = (postId: string) => {
    const postUrl = `${window.location.origin}/posts/${postId}`; // Example URL
    if (navigator.share) {
        navigator.share({
            title: 'Share Post',
            text: 'Check out this post!',
            url: postUrl,
        }).catch((error) => console.log('Error sharing:', error));
    } else {
        // Fallback for browsers that don't support navigator.share
        navigator.clipboard.writeText(postUrl).then(() => {
            toast.success('Link copied');
        }).catch(err => {
            console.error('Failed to copy link:', err);
            toast.error('Link copy failed');
        });
    }
    // Optional: Update share count in DB (add backend logic if needed)
     // updateShareCount(postId); // Example function call
  };

  // Function to handle post deletion
  const handleDeletePost = async (postId: string) => {
    if (!user) return toast.error('Login required');
    if (!confirm(t('confirm.deletePost') || 'Are you sure you want to delete this post?')) {
      return; // User canceled deletion
    }

    const originalPosts = [...posts];
    
    // Optimistic UI update
    setPosts(prev => prev.filter(p => p.id !== postId));
    
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id); // Only allow deleting own posts
  
      if (error) throw error;
      toast.success(t('success.postDeleted') || 'Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(t('errors.postDeleteFailed') || 'Failed to delete post');
      // Rollback UI change if deletion failed
      setPosts(originalPosts);
    }
  };

  const handlePostCreated = () => {
    setShowCreatePost(false);
    fetchPosts();
    toast.success(t('success.postCreated') || 'Post created successfully');
  };

  if (loading && posts.length === 0) {
    return (
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Feed
          </h1>
          <Button 
            onClick={() => setShowCreatePost(true)}
            className="flex items-center shadow-sm"
          >
            <FiPlus className="mr-2" />
            Create Post
          </Button>
        </div>

          {/* Skeleton for Posts */}
        <div className="max-w-xl mx-auto w-full">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 animate-pulse border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/6"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!user) {
    return (
              <div className="max-w-xl mx-auto py-6 px-4 text-center">
        <h2 className="text-xl font-semibold mb-4">Welcome</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Please log in to see your feed</p>
        <Link to="/login">
          <Button>
            Log In
          </Button>
                  </Link>
              </div>
    );
  }

  return (
    <div className="pt-20 pb-10 px-4 md:px-8 max-w-5xl mx-auto">
      
      {/* Tab Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-2" style={{display: 'none'}}>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'all'
                ? 'bg-rose-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
          >
            All Posts
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'my'
                ? 'bg-rose-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
          >
            My Posts
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder={t('home.search_placeholder') || 'Search posts...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-48 md:w-64 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Create Post Button */}
      <Button 
        onClick={() => setShowCreatePost(true)}
        className="mb-6 w-full flex items-center justify-center shadow"
      >
        <FiPlus className="mr-2"/>
        {t('buttons.createPost') || 'Create Post'}
      </Button>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="mb-6">
          <PostCreate
            onPostCreated={() => {
              handlePostCreated();
              setShowCreatePost(false);
            }} 
          />
          <button
            onClick={() => setShowCreatePost(false)}
            className="w-full mt-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {t('buttons.cancel') || 'Cancel'}
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && <ErrorMessage message={error} />}

      {/* Loading Indicator */}
      {loading && (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500"></div>
        </div>
      )}

      {/* Post List */}
      {!loading && posts.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <FiMessageSquare className="mx-auto h-10 w-10 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('home.no_posts_title') || 'No posts found'}</h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {activeTab === 'my' 
              ? (t('home.no_my_posts_message') || "You haven't created any posts yet.") 
              : (t('home.no_all_posts_message') || "There are no posts to display.")}
          </p>
          <button
            onClick={() => setShowCreatePost(true)}
            className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
          >
            {t('home.create_first_post') || 'Create your first post'}
          </button>
        </div>
      ) : (
        // Post listing
        <div>
          {posts
            .filter(post => post.content.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(post => (
              <PostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onSave={handleSave}
                onCommentClick={(post) => {
                  setSelectedPostForComments(post);
                  fetchComments(post.id);
                }}
                onShare={handleShare}
                onDelete={handleDeletePost}
                currentUserId={user?.id}
              />
            ))}
        </div>
      )}

      {/* Comments Modal */}
      {selectedPostForComments && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex">
          <div className="relative p-4 w-full max-w-2xl m-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl">
              <button
                      onClick={() => setSelectedPostForComments(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
              &times;
              </button>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t('comments.title') || 'Comments'}</h2>
            
            {/* Comments list */}
            <div className="mb-4 max-h-96 overflow-y-auto">
                  {loadingComments ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center py-4 text-gray-500 dark:text-gray-400">No comments yet</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="flex items-start">
                    <img
                      src={comment.profiles.avatar_url || '/default-avatar.png'}
                      alt={comment.profiles.full_name}
                        className="w-8 h-8 rounded-full mr-3 border border-gray-300 dark:border-gray-600"
                      />
                      <div>
                        <div className="flex items-baseline space-x-2">
                          <span className="font-medium text-gray-900 dark:text-white">{comment.profiles.full_name}</span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Comment form */}
            <div className="flex">
              <input
                type="text"
                placeholder={t('comments.writeCommentPlaceholder') || 'Write a comment...'}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:ring-1 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                    <button
                                  onClick={handleCommentSubmit}
                      disabled={!newComment.trim()}
                className="px-4 py-2 bg-rose-500 text-white rounded-r-lg hover:bg-rose-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                {t('buttons.send') || 'Send'}
                    </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
