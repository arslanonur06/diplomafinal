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
// import { Post } from '../../types/supabase'; // FIXME: This file is not a module. Run Supabase type generation.
import ProfileAvatar from '../profile/ProfileAvatar';

// FIXME: Define a temporary Post type if the import is commented out
// Replace this with the actual import once src/types/supabase.ts is fixed
type Post = any; 

interface PostCreateProps {
  onPostCreated: (post: Post) => void; // Changed from optional to required
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
interface RelationshipWithProfiles {
  requester_id: string;
  addressee_id: string;
  profile_requester: { // Assuming the join returns a single object or null
    id: string;
    full_name: string;
    avatar_url: string | null;
    avatar_emoji?: string | null;
  } | null;
  profile_addressee: { // Assuming the join returns a single object or null
    id: string;
    full_name: string;
    avatar_url: string | null;
    avatar_emoji?: string | null;
  } | null;
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
    if (!user) return; // Add guard clause
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
        .eq('user_id', user.id); // Use user.id safely

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
    if (!user) return; // Add guard clause
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('events(id, title)')
        .eq('user_id', user.id); // Use user.id safely

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
      setUserEvents([]); // Set empty array on error
    }
  };

  const fetchUserFriends = async () => {
    if (!user) return;

    try {
      // Fetch relationships where the current user is either the requester or addressee
      // and the status is 'accepted'. Join with the profiles table to get friend details.
      const { data: relationships, error } = await supabase
        .from('relationships')
        .select(`
          requester_id,
          addressee_id,
          profile_requester:profiles!relationships_requester_id_fkey(id, full_name, avatar_url, avatar_emoji),
          profile_addressee:profiles!relationships_addressee_id_fkey(id, full_name, avatar_url, avatar_emoji)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) {
        console.error('Error fetching user friends:', error);
        setUserFriends([]);
        return;
      }

      if (!relationships || relationships.length === 0) {
        setUserFriends([]);
        return;
      }

      // Type the response data correctly
      const typedRelationships = relationships as unknown as RelationshipWithProfiles[];

      // Map relationships to potential User objects or null
      const mappedFriends: (User | null)[] = typedRelationships.map((relationship) => {
          const isRequester = relationship.requester_id === user.id;
          const friendProfile = isRequester ? relationship.profile_addressee : relationship.profile_requester;

          if (friendProfile) {
            // Create an object that matches the User interface
            const potentialUser: User = {
              id: friendProfile.id,
              full_name: friendProfile.full_name,
              // Assign avatar_url only if it exists, otherwise it remains undefined (matching User type)
              ...(friendProfile.avatar_url && { avatar_url: friendProfile.avatar_url }),
            };
            return potentialUser;
          }
          return null;
        });

      // Filter out the null values using the type predicate
      const friends: User[] = mappedFriends.filter((friend): friend is User => friend !== null);

      // Remove duplicates
      const uniqueFriends = Array.from(new Map(friends.map(friend => [friend.id, friend])).values());

      setUserFriends(uniqueFriends);
    } catch (error) {
      console.error('Error processing user friends:', error);
      setUserFriends([]);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Extract hashtags from the content
    const hashtags = newContent.match(/#[a-zA-Z0-9_]+/g) || []; // Ensure result is string[]
    setExtractedHashtags(hashtags); // State is correctly typed as string[]

    // Suggest popular hashtags based on the extracted hashtags
    const currentTags = hashtags.map(tag => tag.substring(1).toLowerCase()); // Get tag names without '#'
    const suggestions = SUGGESTED_HASHTAGS.filter(tag => !currentTags.includes(tag.toLowerCase()));
    setSuggestedHashtags(suggestions);
  };

  const addHashtag = (tag: string) => {
    setContent(prevContent => `${prevContent} #${tag}`);
    setShowHashtagSuggestions(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(prevImages => [...prevImages, ...files]);

    // Generate preview URLs for the selected images
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prevUrls => [...prevUrls, ...newPreviewUrls]);
  };

  const removeImage = (index: number) => {
    setImages(prevImages => prevImages.filter((_, i) => i !== index));
    setPreviewUrls(prevUrls => prevUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!content.trim() && images.length === 0) {
      toast.error(t('post.errors.emptyContent') || 'Please enter some content or select images to post.');
      return;
    }

    // Check if user is logged in
    if (!user) {
      toast.error(t('auth.errors.notLoggedIn') || 'You must be logged in to create posts.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images to Supabase storage
      const imageUrls: string[] = [];
      
      if (images.length > 0) {
        for (const image of images) {
          const uniqueFileName = `${uuidv4()}-${image.name}`;
          
          console.log(`Uploading image: ${uniqueFileName}`);
          
          // Ensure image is valid
          if (!(image instanceof File) || image.size === 0) {
            console.error('Invalid image file:', image);
            continue;
          }
          
          // Upload with more explicit error handling and content type
          try {
            const { data, error } = await supabase.storage
              .from('post-images')
              .upload(`public/${uniqueFileName}`, image, {
                cacheControl: '3600',
                contentType: image.type, // Explicitly set content type
                upsert: false
              });

            if (error) {
              console.error('Error uploading image:', error);
              toast.error(`${t('post.errors.imageUpload') || 'Error uploading image'}: ${error.message}`);
              continue; 
            }

            if (!data || !data.path) {
              console.error('No data returned from upload');
              continue;
            }

            // Get public URL
            const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(data.path);
            if (urlData?.publicUrl) {
              console.log(`Image uploaded successfully: ${urlData.publicUrl}`);
              imageUrls.push(urlData.publicUrl);
            }
          } catch (uploadError) {
            console.error('Exception during image upload:', uploadError);
          }
        }
      }

      // Extract hashtags
      const finalHashtags = content.match(/#[a-zA-Z0-9_]+/g) || [];

      // Check if user session is still valid
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error(t('post.errors.sessionExpired') || 'Session expired. Please log in again');
      }
      
      // Confirm we're using the current user's ID
      console.log('Current authenticated user ID:', sessionData.session.user.id);
      console.log('Using user_id for post:', user.id);

      // Prepare post data with user_id
      const postData = {
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrls.length > 0 ? imageUrls[0] : null,
        created_at: new Date().toISOString()
      };

      // Log for debugging
      console.log('Creating post with data:', JSON.stringify(postData));

      // Insert the post with detailed logging
      const { data: insertedPost, error: postError } = await supabase
        .from('posts')
        .insert(postData)
        .select('*')
        .single();

      if (postError) {
        console.error('Error creating post:', postError);
        
        // Handle specific error types with better messages
        if (postError.code === '42501' || postError.message.includes('policy')) {
          throw new Error(t('post.errors.rls') || 'Permission denied to create post');
        }
        
        throw new Error(postError.message);
      }

      console.log('Post created successfully:', insertedPost);

      // Reset form
      setContent('');
      setImages([]);
      setPreviewUrls([]);
      setExtractedHashtags([]);
      setSuggestedHashtags([]);
      setSelectedGroup(null);
      setSelectedEvent(null);
      setSelectedFriend(null);

      // Notify parent component about the new post
      if (insertedPost) {
        toast.success(t('post.success') || 'Post created successfully!');
        // Use setTimeout to ensure state updates before callback
        setTimeout(() => {
          onPostCreated(insertedPost);
        }, 0);
      } else {
        console.warn("Post created but data not returned from insert");
        toast.success(t('post.success') || 'Post created successfully!');
        // Trigger refresh anyway
        onPostCreated({id: 'refresh-trigger-' + Date.now()} as any);
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
      
      // Handle different error types with appropriate translations
      let errorMessage = '';
      
      if (error.message.includes('session expired') || error.message.includes('not authenticated')) {
        errorMessage = t('post.errors.sessionExpired') || 'Session expired. Please log in again';
      } else if (error.message.includes('policy') || error.message.includes('permission')) {
        errorMessage = t('post.errors.rls') || 'Permission denied to create post';
      } else {
        errorMessage = `${t('post.errors.create') || 'Error creating post'}: ${error.message || ''}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4 border border-gray-200 dark:border-gray-700">
      {/* Profile Completion Modal */}
      <Dialog open={false} onOpenChange={setShowCompleteProfileModal}>
        {/* ... existing Dialog content ... */}
      </Dialog>

      <form onSubmit={handleSubmit}>
        <div className="flex items-start space-x-3">
          <ProfileAvatar
            userId={user?.id}
            avatarUrl={user?.user_metadata?.avatar_url}
            avatarEmoji={user?.user_metadata?.avatar_emoji}
            fullName={user?.user_metadata?.full_name}
            size="sm"
          />
          <textarea
            value={content}
            onChange={handleContentChange}
            onClick={() => !isProfileComplete && setShowCompleteProfileModal(true)}
            placeholder={t('post.placeholder') || "What's on your mind?"}
            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-rose-500 focus:border-rose-500 dark:bg-gray-700 dark:text-white resize-none min-h-[60px]"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        {/* Hashtag Suggestions */}
        {showHashtagSuggestions && suggestedHashtags.length > 0 && (
          <div className="mt-2 ml-12 p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-md max-h-32 overflow-y-auto z-10">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('post.suggestedHashtags') || 'Suggested Hashtags'}:</p>
            {suggestedHashtags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => addHashtag(tag)}
                className="block w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Image Previews */}
        {previewUrls.length > 0 && (
          <div className="mt-3 ml-12 grid grid-cols-3 gap-2">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img src={url} alt={`Preview ${index}`} className="w-full h-24 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  <FiX size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-3 ml-12">
          <div className="flex space-x-2 text-gray-500 dark:text-gray-400">
            {/* Image Upload */}
            <label htmlFor="image-upload" className="cursor-pointer p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30">
              <FiImageIcon className="text-green-600 dark:text-green-400" />
            </label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="hidden"
              disabled={isSubmitting}
            />

            {/* Hashtag Button */}
            <button
              type="button"
              onClick={() => setShowHashtagSuggestions(!showHashtagSuggestions)}
              className="p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30"
            >
              <FiHash className="text-blue-600 dark:text-blue-400" />
            </button>

            {/* Group Selector */}
            <button
              type="button"
              onClick={() => { setShowGroupSelector(!showGroupSelector); setShowEventSelector(false); setShowFriendSelector(false); }}
              className="p-2 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30"
            >
              <FiUsers className="text-purple-600 dark:text-purple-400" />
            </button>

            {/* Event Selector */}
            <button
              type="button"
              onClick={() => { setShowEventSelector(!showEventSelector); setShowGroupSelector(false); setShowFriendSelector(false); }}
              className="p-2 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/30"
            >
              <FiCalendar className="text-orange-600 dark:text-orange-400" />
            </button>

            {/* Friend Selector */}
            <button
              type="button"
              onClick={() => { setShowFriendSelector(!showFriendSelector); setShowGroupSelector(false); setShowEventSelector(false); }}
              className="p-2 rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/30"
            >
              <FiUserPlus className="text-teal-600 dark:text-teal-400" />
            </button>

            {/* Emoji Picker (Placeholder) */}
            {/* <button type="button" className={`p-2 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900/30 ${!isProfileComplete ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!isProfileComplete}>
              <FiSmile className="text-yellow-600 dark:text-yellow-400" />
            </button> */}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={(!content.trim() && images.length === 0) || isSubmitting}
            className="min-w-[100px]"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('buttons.posting') || 'Posting...'}
              </div>
            ) : (t('buttons.post') || 'Post')}
          </Button>
        </div>

        {/* Selected Destination Indicator */}
        {(selectedGroup || selectedEvent || selectedFriend) && (
          <div className="mt-2 ml-12 text-xs text-gray-600 dark:text-gray-400 flex items-center">
            <span>{t('post.postingTo') || 'Posting to'}: </span>
            <span className="ml-1 font-medium bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
              {selectedGroup && userGroups.find(g => g.id === selectedGroup)?.name}
              {selectedEvent && userEvents.find(e => e.id === selectedEvent)?.title}
              {selectedFriend && userFriends.find(f => f.id === selectedFriend)?.full_name}
            </span>
            <button
              type="button"
              onClick={() => { setSelectedGroup(null); setSelectedEvent(null); setSelectedFriend(null); }}
              className="ml-1 text-red-500 hover:text-red-700"
              aria-label="Clear destination"
            >
              <FiX size={12} />
            </button>
          </div>
        )}

        {/* Group selector dropdown */}
        {showGroupSelector && userGroups.length > 0 && (
          <div className="mt-2 ml-12 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('post.selectGroup') || 'Share in group'}:</p>
            <div className="space-y-1">
              {userGroups.map(group => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setSelectedGroup(group.id);
                    setSelectedEvent(null); // Ensure only one destination type is selected
                    setSelectedFriend(null);
                    setShowGroupSelector(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg text-gray-800 dark:text-gray-200"
                >
                  {group.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {showGroupSelector && userGroups.length === 0 && (
           <div className="mt-2 ml-12 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg text-center">
             <p className="text-gray-600 dark:text-gray-300">{t('groups.no_groups_message') || 'You haven\'t joined any groups yet.'}</p>
             <button
               type="button"
               onClick={() => navigate('/groups')} // Navigate to group discovery page
               className="mt-2 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600"
             >
               {t('groups.buttons.findGroups') || 'Find Groups'}
             </button>
           </div>
        )}

        {/* Event selector dropdown */}
        {showEventSelector && userEvents.length > 0 && (
          <div className="mt-2 ml-12 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('post.selectEvent') || 'Share to event'}:</p>
            <div className="space-y-1">
              {userEvents.map(event => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => {
                    setSelectedEvent(event.id);
                    setSelectedGroup(null); // Ensure only one destination type is selected
                    setSelectedFriend(null);
                    setShowEventSelector(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg text-gray-800 dark:text-gray-200"
                >
                  {event.title}
                </button>
              ))}
            </div>
          </div>
        )}
         {showEventSelector && userEvents.length === 0 && (
           <div className="mt-2 ml-12 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg text-center">
             <p className="text-gray-600 dark:text-gray-300">{t('events.no_events_message') || 'You haven\'t joined any events yet.'}</p>
             <button
               type="button"
               onClick={() => navigate('/events')} // Navigate to event discovery page
               className="mt-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
             >
               {t('events.buttons.findEvents') || 'Find Events'}
             </button>
           </div>
        )}

        {/* Friend selector dropdown */}
        {showFriendSelector && userFriends.length > 0 && (
          <div className="mt-2 ml-12 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('post.selectFriend') || 'Share with friend'}:</p>
            <div className="space-y-1">
              {userFriends.map(friend => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => {
                    setSelectedFriend(friend.id);
                    setSelectedGroup(null); // Ensure only one destination type is selected
                    setSelectedEvent(null);
                    setShowFriendSelector(false);
                  }}
                  // Apply styling to the button itself if needed
                  className="w-full text-left px-3 py-2 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg flex items-center text-gray-800 dark:text-gray-200"
                >
                  <ProfileAvatar
                     userId={friend.id}
                     avatarUrl={friend.avatar_url}
                     fullName={friend.full_name}
                     size="sm"
                     // Remove className prop as it's not accepted by ProfileAvatar
                     // className="mr-2"
                  />
                  {/* Add margin to the span if needed */}
                  <span className="ml-2">{friend.full_name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showFriendSelector && userFriends.length === 0 && (
          <div className="mt-2 ml-12 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg text-center">
            <p className="text-gray-600 dark:text-gray-300">{t('friends.no_friends_message') || 'You haven\'t added any friends yet.'}</p>
            <button
              type="button"
              onClick={() => navigate('/friends')} // Navigate to a page where users can find friends
              className="mt-2 px-4 py-2 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600"
            >
              {t('friends.buttons.findPeople') || 'Find People'}
            </button>
          </div>
        )}

      </form>
    </div>
  ); // Close the return statement
};

export default PostCreate;
