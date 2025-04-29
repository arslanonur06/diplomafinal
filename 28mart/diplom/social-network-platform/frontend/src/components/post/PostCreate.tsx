import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { FiHash, FiUsers, FiCalendar, FiImage as FiImageIcon, FiSmile, FiTrash2, FiX, FiUserPlus } from 'react-icons/fi';
import { supabase } from '../../services/supabase';
// Change import to useAuth
import { useAuth } from '../../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '../ui/Button'; // Changed from button to Button
import { useLanguage } from '../../contexts/LanguageContext';
import { Post } from '../../types/supabase';
import ProfileAvatar from '../profile/ProfileAvatar';

interface PostCreateProps {
  onPostCreated: (post: Post) => void; // Change from optional to required
}

interface Group {
  id: string;
  name: string;
}

interface Event {
  id: string;
  title: string;
}

interface User {
  id: string;
  full_name: string;
  avatar_url?: string;
}

// Properly typed response structures for Supabase queries
interface GroupMemberResponse {
  group_id: string;
  groups: {
    id: string;
    name: string;
  } | null;
}

interface EventAttendeeResponse {
  events: {
    id: string;
    title: string;
  } | null;
}

// Define a type matching the expected Supabase structure for the friends query
interface RelationshipWithProfile {
  requester_id: string;
  addressee_id: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// Popular hashtag suggestions
const SUGGESTED_HASHTAGS = [
  'tech', 'gaming', 'travel', 'food', 'music', 
  'art', 'fashion', 'fitness', 'health', 'books',
  'movies', 'nature', 'photography', 'sports', 'science'
];

const PostCreate: React.FC<PostCreateProps> = ({ onPostCreated }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  // Change useAuth to useAuth
  const { user } = useAuth();
  const { isProfileComplete } = useProfileCompletion();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [extractedHashtags, setExtractedHashtags] = useState<string[]>([]);
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [userFriends, setUserFriends] = useState<User[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [showEventSelector, setShowEventSelector] = useState(false);
  const [showFriendSelector, setShowFriendSelector] = useState(false);
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);

  useEffect(() => {
    if (user) {
      // Fetch user's groups
      fetchUserGroups();
      // Fetch user's events
      fetchUserEvents();
      // Fetch user's friends
      fetchUserFriends();
    }
  }, [user]);

  const fetchUserGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups:group_id (
            id, 
            name
          )
        `)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error fetching user groups:', error);
        setUserGroups([]); // Set empty array on error
        return;
      }

      if (!data || data.length === 0) {
        setUserGroups([]);
        return;
      }

      // Properly type the response data
      const typedData = data as unknown as GroupMemberResponse[];

      // Transform data to expected format
      const groups: Group[] = typedData
        .filter(item => item.groups) // Filter out any null groups
        .map(item => ({
          id: item.groups!.id,
          name: item.groups!.name
        }));

      setUserGroups(groups);
    } catch (error) {
      console.error('Error fetching user groups:', error);
      setUserGroups([]); // Set empty array on error
    }
  };

  const fetchUserEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('events(id, title)')
        .eq('user_id', user?.id);

      if (error) throw error;
      
      if (!data || data.length === 0) {
        setUserEvents([]);
        return;
      }

      // Type the response data correctly
      const typedData = data as unknown as EventAttendeeResponse[];
      
      // Transform data to expected format
      const events: Event[] = typedData
        .map(item => {
          if (item.events) {
            return {
              id: item.events.id,
              title: item.events.title
            };
          }
          return null;
        })
        .filter((event): event is Event => event !== null);

      setUserEvents(events);
    } catch (error) {
      console.error('Error fetching user events:', error);
    }
  };

  const fetchUserFriends = async () => {
    if (!user) return;

    try {
      const { data: relationships, error } = await supabase
        .from('relationships')
        .select(`
          requester_id,
          addressee_id,
          profiles!relationships_addressee_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) {
        console.error('Error fetching user friends:', error);
        return;
      }

      if (!relationships || relationships.length === 0) {
        setUserFriends([]);
        return;
      }

      // Transform the relationships data into friends list
      const friends = relationships
        .map(rel => {
          // Type assertion for the relationship data
          const relationship = rel as unknown as RelationshipWithProfile;
          const friendProfile = relationship.profiles;

          if (!friendProfile) return null;

          const friend: User = {
            id: friendProfile.id,
            full_name: friendProfile.full_name,
            avatar_url: friendProfile.avatar_url || undefined
          };

          return friend;
        })
        .filter((friend): friend is User => friend !== null);

      setUserFriends(friends);
    } catch (error) {
      console.error('Error fetching user friends:', error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      
      // Limit to 4 images
      if (images.length + selectedFiles.length > 4) {
        toast.error(t('errors.tooManyImagesMax4'));
        return;
      }
      
      // Generate preview URLs
      const newPreviewUrls = selectedFiles.map(file => URL.createObjectURL(file));
      
      setImages([...images, ...selectedFiles]);
      setPreviewUrls([...previewUrls, ...newPreviewUrls]);
    }
  };

  const removeImage = (index: number) => {
    // Remove the image and its preview
    setImages(images.filter((_, i) => i !== index));
    
    // Release the object URL to avoid memory leaks
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  };

  const extractHashtags = (text: string) => {
    const hashtagRegex = /#\w+/g;
    return [...new Set(text.match(hashtagRegex) || [])].map(tag => tag.substring(1));
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Extract hashtags for recommendations
    const extracted = extractHashtags(newContent);
    setExtractedHashtags(extracted);
    
    // Show hashtag suggestions if user is typing a hashtag
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newContent.substring(0, cursorPosition);
    const hashtagMatch = textBeforeCursor.match(/#(\w*)$/);
    
    if (hashtagMatch) {
      const partialTag = hashtagMatch[1].toLowerCase();
      // Filter suggested hashtags based on what user is typing
      const filtered = SUGGESTED_HASHTAGS.filter(tag => 
        tag.toLowerCase().startsWith(partialTag) && 
        !extracted.includes(tag)
      );
      setSuggestedHashtags(filtered);
      setShowHashtagSuggestions(filtered.length > 0);
    } else {
      setShowHashtagSuggestions(false);
    }
  };

  const addHashtag = (tag: string) => {
    // Get cursor position
    const cursorPosition = document.activeElement && 'selectionStart' in document.activeElement
      ? (document.activeElement as HTMLTextAreaElement).selectionStart
      : content.length;
    
    if (cursorPosition !== null) {
      // Find the start of the partial hashtag
      const textBeforeCursor = content.substring(0, cursorPosition);
      const hashtagMatch = textBeforeCursor.match(/#(\w*)$/);
      
      if (hashtagMatch) {
        const matchStart = hashtagMatch.index || 0;
        const matchEnd = matchStart + hashtagMatch[0].length;
        
        // Replace the partial hashtag with the complete one
        const newContent = content.substring(0, matchStart) + 
                          '#' + tag + ' ' + 
                          content.substring(matchEnd);
        
        setContent(newContent);
        // Update extracted hashtags with the new tag
        if (!extractedHashtags.includes(tag)) {
          setExtractedHashtags([...extractedHashtags, tag]);
        }
      } else {
        // Just append the hashtag if we're not currently typing one
        setContent(content + ' #' + tag + ' ');
        // Update extracted hashtags with the new tag
        if (!extractedHashtags.includes(tag)) {
          setExtractedHashtags([...extractedHashtags, tag]);
        }
      }
    }
    
    setShowHashtagSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error(t('errors.loginRequired'));
      return;
    }

    if (!isProfileComplete) {
      setShowCompleteProfileModal(true);
      return;
    }

    if (!content.trim() && images.length === 0) {
      toast.error(t('errors.postEmpty'));
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Upload images to Supabase storage
      let imageUrls: string[] = [];
      
      if (images.length > 0) {
        try {
          imageUrls = await Promise.all(
            images.map(async (file) => {
              const fileName = `${user.id}/${uuidv4()}-${file.name.replace(/\s+/g, '_')}`;
              const { data, error } = await supabase.storage
                .from('post-images')
                .upload(fileName, file);
              
              if (error) {
                console.error('Error uploading image:', error);
                throw new Error(`Failed to upload image: ${error.message}`);
              }
              
              if (!data || !data.path) {
                throw new Error('Failed to get upload path');
              }
              
              // Get public URL
              const { data: publicUrlData } = supabase.storage
                .from('post-images')
                .getPublicUrl(data.path);
                
              if (!publicUrlData || !publicUrlData.publicUrl) {
                throw new Error('Failed to get public URL for uploaded image');
              }
              
              return publicUrlData.publicUrl;
            })
          );
        } catch (uploadError: any) {
          console.error('Image upload error:', uploadError);
          toast.error(`Image upload failed: ${uploadError.message || 'Unknown error'}`);
          setIsSubmitting(false);
          return;
        }
      }

      const postHashtags = extractedHashtags.length > 0 
        ? extractedHashtags 
        : extractHashtags(content);
      
      // Prepare post data
      const postData = {
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrls.length > 0 ? imageUrls[0] : null, // Use first image as image_url
        hashtags: postHashtags.length > 0 ? postHashtags : null,
        group_id: selectedGroup || null,
        event_id: selectedEvent || null,
        created_at: new Date().toISOString(),
        tagged_user_id: selectedFriend || null
      };

      // Create post
      const { data, error } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating post:', error);
        throw new Error(`Failed to create post: ${error.message}`);
      }

      // Create hashtag entries for each unique hashtag
      if (postHashtags.length > 0) {
        try {
          const hashtagEntries = postHashtags.map(tag => ({
            tag: tag.toLowerCase(),
            post_count: 1
          }));

          // Upsert hashtags (insert if not exists, increment count if exists)
          await supabase.rpc('upsert_hashtags', { 
            hashtag_entries: hashtagEntries 
          });
        } catch (hashtagError) {
          // Don't fail the whole operation if hashtag processing fails
          console.error('Error processing hashtags:', hashtagError);
        }
      }

      // Reset form after successful submission
      setContent('');
      setImages([]);
      setPreviewUrls([]);
      setExtractedHashtags([]);
      setSelectedGroup(null);
      setSelectedEvent(null);
      setSelectedFriend(null);
      
      toast.success(t('success.postCreated'));
      
      if (onPostCreated) {
        onPostCreated(data as Post);
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error(error.message || t('errors.postCreationFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-100 to-pink-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('post.createTitle') || 'Create Post'}
          </h3>
        </div>

        {user && (
          <div className="flex items-center space-x-3 mb-4">
            <ProfileAvatar
              userId={user?.id}
              avatarUrl={user?.user_metadata?.avatar_url}
              avatarEmoji={user?.user_metadata?.avatar_emoji}
              fullName={user?.user_metadata?.full_name || 'User'}
              size="sm"
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">
                {user?.user_metadata?.full_name || 'User'}
              </p>
              
              {/* Destination indicators (group, event, friend) */}
              {(selectedGroup || selectedEvent || selectedFriend) && (
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                  {selectedGroup && (
                    <span className="flex items-center text-indigo-600 dark:text-indigo-400">
                      <FiUsers className="mr-1" size={14} />
                      {userGroups.find(g => g.id === selectedGroup)?.name}
                    </span>
                  )}
                  
                  {selectedEvent && (
                    <span className="flex items-center text-pink-600 dark:text-pink-400">
                      <FiCalendar className="mr-1" size={14} />
                      {userEvents.find(e => e.id === selectedEvent)?.title}
                    </span>
                  )}
                  
                  {selectedFriend && (
                    <span className="flex items-center text-green-600 dark:text-green-400">
                      <FiUserPlus className="mr-1" size={14} />
                      {userFriends.find(f => f.id === selectedFriend)?.full_name}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder={t('placeholder.shareThoughts') || "What's on your mind?"}
          className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white resize-none h-24 placeholder-gray-500 dark:placeholder-gray-400"
          disabled={isSubmitting}
        />
        
        {/* Hashtag suggestions */}
        {showHashtagSuggestions && (
          <div className="mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('post.popularHashtags') || 'Popular hashtags'}:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedHashtags.slice(0, 5).map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addHashtag(tag)}
                  className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center"
                >
                  <FiHash size={12} className="mr-1" /> {tag}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Image previews */}
        {previewUrls.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative rounded-lg overflow-hidden h-40 border border-gray-200 dark:border-gray-600">
                <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-gray-900/70 text-white rounded-full p-1 hover:bg-gray-900/90"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Selected destination */}
        {(selectedGroup || selectedEvent || selectedFriend) && (
          <div className="mt-3 p-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded-lg">
            {selectedGroup && (
              <div className="flex items-center">
                <FiUsers className="mr-1" />
                <span className="text-sm font-medium">
                  {t('post.postingToGroup') || 'Posting to group'}: {userGroups.find(g => g.id === selectedGroup)?.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  className="ml-2 text-indigo-500 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
                >
                  <FiX size={16} />
                </button>
              </div>
            )}
            
            {selectedEvent && (
              <div className="flex items-center">
                <FiCalendar className="mr-1" />
                <span className="text-sm font-medium">
                  {t('post.postingToEvent') || 'Posting to event'}: {userEvents.find(e => e.id === selectedEvent)?.title}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="ml-2 text-indigo-500 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
                >
                  <FiX size={16} />
                </button>
              </div>
            )}
            
            {selectedFriend && (
              <div className="flex items-center">
                <FiUserPlus className="mr-1" />
                <span className="text-sm font-medium">
                  {t('post.sharingWithFriend') || 'Sharing with'}: {userFriends.find(f => f.id === selectedFriend)?.full_name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFriend(null)}
                  className="ml-2 text-indigo-500 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
                >
                  <FiX size={16} />
                </button>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-3 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex space-x-2 mb-3 sm:mb-0">
            {/* Image upload button */}
            <label className="flex items-center p-2 rounded-full bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer shadow-sm transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                multiple
                disabled={isSubmitting || previewUrls.length >= 4}
              />
              <FiImageIcon className={`h-5 w-5 ${previewUrls.length >= 4 ? 'text-gray-400 dark:text-gray-500' : 'text-indigo-500 dark:text-indigo-400'}`} />
            </label>
            
            {/* Group selector button */}
            <button
              type="button"
              onClick={() => {
                setShowGroupSelector(!showGroupSelector);
                setShowEventSelector(false);
                setShowFriendSelector(false);
              }}
              className={`flex items-center p-2 rounded-full ${selectedGroup ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'} hover:bg-indigo-100 dark:hover:bg-indigo-900 shadow-sm transition-colors`}
              title={t('post.selectGroup') || 'Select group'}
            >
              <FiUsers className="h-5 w-5" />
            </button>
            
            {/* Event selector button */}
            <button
              type="button"
              onClick={() => {
                setShowEventSelector(!showEventSelector);
                setShowGroupSelector(false);
                setShowFriendSelector(false);
              }}
              className={`flex items-center p-2 rounded-full ${selectedEvent ? 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'} hover:bg-pink-100 dark:hover:bg-pink-900 shadow-sm transition-colors`}
              title={t('post.selectEvent') || 'Select event'}
            >
              <FiCalendar className="h-5 w-5" />
            </button>
            
            {/* Friend selector button */}
            <button
              type="button"
              onClick={() => {
                setShowFriendSelector(!showFriendSelector);
                setShowGroupSelector(false);
                setShowEventSelector(false);
              }}
              className={`flex items-center p-2 rounded-full ${selectedFriend ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'} hover:bg-green-100 dark:hover:bg-green-900 shadow-sm transition-colors`}
              title={t('post.selectFriend') || 'Share with friend'}
            >
              <FiUserPlus className="h-5 w-5" />
            </button>
            
            {/* Emoji button */}
            <button
              type="button"
              className="flex items-center p-2 rounded-full bg-white dark:bg-gray-700 hover:bg-amber-100 dark:hover:bg-amber-900 text-gray-600 dark:text-gray-300 shadow-sm transition-colors"
              title={t('post.addEmoji') || 'Add emoji'}
            >
              <FiSmile className="h-5 w-5" />
            </button>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={(!content.trim() && images.length === 0) || isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-rose-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('common.posting')}
              </>
            ) : (
              t('post.publish')
            )}
          </button>
        </div>
        
        {/* Group selector dropdown */}
        {showGroupSelector && userGroups.length > 0 && (
          <div className="mt-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('post.selectGroup') || 'Select a group to post to'}:</p>
            <div className="space-y-1">
              {userGroups.map(group => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setSelectedGroup(group.id);
                    setSelectedEvent(null);
                    setShowGroupSelector(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg flex items-center text-gray-800 dark:text-gray-200"
                >
                  <FiUsers className="mr-2 text-indigo-600 dark:text-indigo-400" />
                  <span>{group.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {showGroupSelector && userGroups.length === 0 && (
          <div className="mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg text-center">
            <p className="text-gray-600 dark:text-gray-300">{t('groups.no_my_groups_message') || 'You haven\'t joined any groups yet.'}</p>
            <button
              type="button"
              onClick={() => navigate('/groups')}
              className="mt-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600"
            >
              {t('groups.buttons.create') || 'Create Group'}
            </button>
          </div>
        )}
        
        {/* Event selector dropdown */}
        {showEventSelector && userEvents.length > 0 && (
          <div className="mt-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('post.selectEvent') || 'Select an event to post to'}:</p>
            <div className="space-y-1">
              {userEvents.map(event => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => {
                    setSelectedEvent(event.id);
                    setSelectedGroup(null);
                    setShowEventSelector(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-pink-50 dark:hover:bg-pink-900/30 rounded-lg flex items-center text-gray-800 dark:text-gray-200"
                >
                  <FiCalendar className="mr-2 text-pink-600 dark:text-pink-400" />
                  <span>{event.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {showEventSelector && userEvents.length === 0 && (
          <div className="mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg text-center">
            <p className="text-gray-600 dark:text-gray-300">{t('events.no_my_events_message') || 'You haven\'t joined any events yet.'}</p>
            <button
              type="button"
              onClick={() => navigate('/events')}
              className="mt-2 px-4 py-2 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600"
            >
              {t('events.buttons.create') || 'Create Event'}
            </button>
          </div>
        )}
        
        {/* Friend selector dropdown */}
        {showFriendSelector && userFriends.length > 0 && (
          <div className="mt-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('post.selectFriend') || 'Share with friend'}:</p>
            <div className="space-y-1">
              {userFriends.map(friend => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => {
                    setSelectedFriend(friend.id);
                    setShowFriendSelector(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg flex items-center text-gray-800 dark:text-gray-200"
                >
                  <FiUserPlus className="mr-2 text-green-600 dark:text-green-400" />
                  <span>{friend.full_name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {showFriendSelector && userFriends.length === 0 && (
          <div className="mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg text-center">
            <p className="text-gray-600 dark:text-gray-300">{t('friends.no_friends_message') || 'You haven\'t added any friends yet.'}</p>
            <button
              type="button"
              onClick={() => navigate('/friends')}
              className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
            >
              {t('friends.buttons.findPeople') || 'Find People'}
            </button>
          </div>
        )}
        
        {/* Popular hashtags */}
        {showHashtagSuggestions && (
          <div className="mt-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('post.popularHashtags') || 'Popular hashtags'}:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_HASHTAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addHashtag(tag)}
                  className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center"
                >
                  <FiHash size={12} className="mr-1" /> {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* Profile Completion Modal */}
      <Dialog open={showCompleteProfileModal} onOpenChange={setShowCompleteProfileModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profile.completeTitle')}</DialogTitle>
            <DialogDescription>
              {t('profile.completeMessage')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
            </DialogClose>
            <Button onClick={() => { navigate('/profile'); setShowCompleteProfileModal(false); }}>
              {t('profile.goToProfile')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostCreate;
