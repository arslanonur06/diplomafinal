import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FiPlus, FiUser, FiUsers, FiEdit2, FiUserPlus, FiClock, 
  FiGrid, FiCalendar, FiMapPin, FiCheck, FiX, FiUserX, FiLink, FiArrowLeft
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import ProfileAvatar from '../components/profile/ProfileAvatar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import PostCard from '../components/post/PostCard';
import PostCreate from '../components/post/PostCreate';
import { toast } from 'react-hot-toast';
import Avatar from '../components/common/Avatar';
import { Button } from '../components/ui/Button'; // Changed from button to Button
import { Profile } from '../types/supabase'; // Import is now correct
import ProfileEditModal from '../components/profile/ProfileEditModal';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useLanguage } from '../contexts/LanguageContext';
import { createNotification } from '../utils/userUtils';
import { getProfileWithConnections } from '../services/supabase';

// Profile tipini genişletelim
interface ExtendedProfile extends Profile {
  friend_status?: 'pending' | 'accepted' | 'none' | 'error';
  friend_connection_id?: string | null;
}

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface SavedItemBase {
  id: string;
  user_id: string;
  created_at: string;
  post_id?: string | null;
  event_id?: string | null;
  group_id?: string | null;
}

interface SavedItem {
  id: string;
  user_id: string;
  type: 'post' | 'event' | 'group';
  item_id: string;
  created_at: string;
  content?: string;
  title?: string;
  description?: string;
  author?: { full_name: string | null; avatar_url: string | null };
}

interface SimpleProfile {
  id: string;
  full_name: string | null;
    avatar_url: string | null;
  headline?: string | null;
}

interface EventWithState {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  banner_url?: string;
  is_attending?: boolean;
  is_creator?: boolean;
}

const primaryButtonStyle = "bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 px-4 py-2 rounded-md shadow-sm transition duration-150 ease-in-out";
const actionButtonStyle = "text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-sm";
const outlineButtonStyle = "border border-rose-500 text-rose-600 hover:bg-rose-50 dark:border-rose-400 dark:text-rose-400 dark:hover:bg-rose-900/20 px-4 py-2 rounded-md shadow-sm transition duration-150 ease-in-out";

// Date tiplerini düzeltmek için yardımcı fonksiyon
const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
};

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { profileId } = useParams<{ profileId?: string }>();
  const { checkProfileCompletion } = useProfileCompletion();

  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [groupsData, setGroupsData] = useState<any[]>([]);
  const [eventsData, setEventsData] = useState<EventWithState[]>([]);
  const [friendsData, setFriendsData] = useState<SimpleProfile[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [friendStatus, setFriendStatus] = useState<'loading' | 'pending' | 'accepted' | 'none' | 'error'>('loading');
  const [isSendingFriendRequest, setIsSendingFriendRequest] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [friendConnectionId, setFriendConnectionId] = useState<string | null>(null);

  const effectiveProfileId = profileId || user?.id;

  const tabs: Tab[] = [
    { id: 'posts', label: t('profile.tabs.posts') || 'Posts', icon: FiGrid },
    { id: 'groups', label: t('profile.tabs.groups') || 'Groups', icon: FiUsers },
    { id: 'events', label: t('profile.tabs.events') || 'Events', icon: FiCalendar },
    { id: 'friends', label: t('profile.tabs.friends') || 'Friends', icon: FiUser },
  ].filter(tab => isOwnProfile || tab.id !== 'saved');

  const fetchProfileData = useCallback(async () => {
    console.log(`Fetching profile data for user ID: ${effectiveProfileId}`);
    
    if (!effectiveProfileId) {
      console.error("No user ID available to fetch profile");
      toast.error(t('profile.errors.userNotFound'));
      return;
    }
    
    console.log(`Current user ID: ${user?.id}`);
    
    // Check if viewing own profile and update state accordingly
    const isCurrentUserProfile = effectiveProfileId === user?.id;
    setIsOwnProfile(isCurrentUserProfile);
    
    try {
      setIsLoadingProfile(true);
      
      // getProfileWithConnections kullanarak profil verilerini alalım
      const { data, error } = await getProfileWithConnections(
        effectiveProfileId, 
        user?.id || ''
      );

      if (error) {
        console.error("Error fetching profile:", error);
        toast.error(t('profile.errors.fetchFailed'));
        return;
      }

      if (!data) {
        console.error("No profile data returned");
        toast.error(t('profile.errors.userNotFound'));
        return;
      }

      console.log("Profile data fetched successfully:", data);
      setProfile(data);
      
      // Interests ilişkisi olmadığı için bu kısmı yorum satırına alıyoruz
      /*
      if (data.interests) {
        setSelectedInterests(data.interests.map((interest: any) => interest.name));
      }
      */
      
      // Handle friend status if not own profile
      if (!isCurrentUserProfile && data.friend_status) {
        setFriendStatus(data.friend_status);
        if (data.friend_connection_id) {
          setFriendConnectionId(data.friend_connection_id);
        }
      }
    } catch (err) {
      console.error("Unexpected error in fetchProfileData:", err);
      toast.error(t('profile.errors.fetchFailed'));
    } finally {
      setIsLoadingProfile(false);
    }
  }, [effectiveProfileId, user?.id, t]);

  const fetchProfilePosts = useCallback(async () => {
    if (!effectiveProfileId) return;
    setIsLoadingPosts(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`*, profile:profiles!user_id(full_name, avatar_url)`)
        .eq('user_id', effectiveProfileId)
        .order('created_at', { ascending: false });
      if (error) throw error;
        setPosts(data || []);
    } catch (err) {
      console.error('Error fetching posts:', err);
      toast.error('Failed to load posts.');
    } finally {
      setIsLoadingPosts(false);
    }
  }, [effectiveProfileId]);

  const fetchGroups = useCallback(async () => {
    if (!effectiveProfileId) return;
    setIsLoadingGroups(true);
    try {
      const { data, error } = await supabase
          .rpc('get_user_groups', { p_user_id: effectiveProfileId });

      if (error) throw error;
      setGroupsData(data || []);
    } catch (err) {
      console.error("Error fetching groups:", err);
      toast.error('Failed to load groups.');
    } finally {
      setIsLoadingGroups(false);
    }
  }, [effectiveProfileId]);

  const fetchEvents = useCallback(async () => {
    if (!effectiveProfileId) return;
    setIsLoadingEvents(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', effectiveProfileId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      
      const eventsWithStatus: EventWithState[] = (data || []).map((event: any) => ({ 
        ...event,
        is_creator: true,
      }));

      setEventsData(eventsWithStatus);
    } catch (err: any) {
      console.error("Error fetching events:", err);
      toast.error(`Failed to load events: ${err.message}`);
      setEventsData([]);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [effectiveProfileId]);

  const fetchFriends = useCallback(async () => {
    if (!effectiveProfileId) return;
    setIsLoadingFriends(true);
    setFriendsData([]); // Clear previous data
    try {
      // 1. Fetch accepted connections involving the profile user
      const { data: connections, error: connectionsError } = await supabase
        .from('user_connections')
        .select('user_id, friend_id') // Only select IDs
        .or(`user_id.eq.${effectiveProfileId},friend_id.eq.${effectiveProfileId}`)
        .eq('status', 'accepted');

      if (connectionsError) throw connectionsError;

      if (!connections || connections.length === 0) {
        console.log('[fetchFriends] No accepted connections found.');
        setIsLoadingFriends(false);
        return;
      }

      // 2. Extract the IDs of the friends (the *other* user in each connection)
      const friendIds = connections.map(conn => 
        conn.user_id === effectiveProfileId ? conn.friend_id : conn.user_id
      );
      
      if (friendIds.length === 0) {
          console.log('[fetchFriends] No valid friend IDs extracted.');
          setIsLoadingFriends(false);
          return;
      }

      console.log('[fetchFriends] Friend IDs to fetch profiles for:', friendIds);

      // 3. Fetch the profiles for these friend IDs
      const { data: friendsProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, headline') // Select fields needed for SimpleProfile
        .in('id', friendIds);

      if (profilesError) throw profilesError;
      
      console.log('[fetchFriends] Fetched friend profiles:', friendsProfiles);
      setFriendsData((friendsProfiles as SimpleProfile[]) || []); // Cast to SimpleProfile[]

    } catch (err) {
      console.error("[fetchFriends] Error occurred:", err);
      toast.error('Failed to load friends.');
    } finally {
      setIsLoadingFriends(false);
    }
  }, [effectiveProfileId]);

  const fetchSavedItems = useCallback(async () => {
    if (!isOwnProfile || !user) return;
    setIsLoadingSaved(true);
    try {
      const { data: savedItemsBaseData, error: savedItemsError } = await supabase
        .from('saved_items')
        .select('id, user_id, created_at, post_id, event_id, group_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (savedItemsError) throw savedItemsError;
      if (!savedItemsBaseData || savedItemsBaseData.length === 0) {
        console.log('[fetchSavedItems] No saved items found.');
        setSavedItems([]);
        setIsLoadingSaved(false);
        return;
      }

      const postIds = savedItemsBaseData.map(item => item.post_id).filter(id => id != null) as string[];
      const eventIds = savedItemsBaseData.map(item => item.event_id).filter(id => id != null) as string[];
      const groupIds = savedItemsBaseData.map(item => item.group_id).filter(id => id != null) as string[];

      const [postDetails, eventDetails, groupDetails] = await Promise.all([
        postIds.length
          ? supabase.from('posts').select('id, content, user_id, profile:profiles(full_name, avatar_url)').in('id', postIds)
          : Promise.resolve({ data: [], error: null }),
        eventIds.length
          ? supabase.from('events').select('id, title, description, user_id, profile:profiles(full_name, avatar_url)').in('id', eventIds)
          : Promise.resolve({ data: [], error: null }),
        groupIds.length
          ? supabase.from('groups').select('id, name, description, user_id, profile:profiles(full_name, avatar_url)').in('id', groupIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (postDetails.error) throw postDetails.error;
      if (eventDetails.error) throw eventDetails.error;
      if (groupDetails.error) throw groupDetails.error;

      const combinedData: SavedItem[] = savedItemsBaseData.map((baseItem: SavedItemBase) => {
        let details: any = null;
        let type: 'post' | 'event' | 'group' | null = null;
        let specificData: Partial<SavedItem> = {};
        let fetchedAuthor: { full_name: string | null; avatar_url: string | null } | null = null;
        let itemId: string | null = null;

        if (baseItem.post_id && postDetails.data) {
          type = 'post';
          itemId = baseItem.post_id;
          details = postDetails.data.find(p => p.id === itemId);
          fetchedAuthor = details?.profile;
          specificData = { content: details?.content };
        } else if (baseItem.event_id && eventDetails.data) {
          type = 'event';
          itemId = baseItem.event_id;
          details = eventDetails.data.find(e => e.id === itemId);
          fetchedAuthor = details?.profile;
          specificData = { title: details?.title, description: details?.description };
        } else if (baseItem.group_id && groupDetails.data) {
          type = 'group';
          itemId = baseItem.group_id;
          details = groupDetails.data.find(g => g.id === itemId);
          fetchedAuthor = details?.profile;
          specificData = { title: details?.name, description: details?.description };
        }
        
        if (!type || !itemId) {
            console.warn(`[fetchSavedItems] Could not determine type, item ID, or find details for saved item ID: ${baseItem.id}`);
            return null;
        }

        const finalItem: SavedItem = {
            id: baseItem.id,
            user_id: baseItem.user_id,
            created_at: baseItem.created_at,
            type: type, 
            item_id: itemId as string,
            ...specificData,
            author: (fetchedAuthor?.full_name || fetchedAuthor?.avatar_url) ? fetchedAuthor : undefined
        };
        return finalItem;
      }).filter(item => item !== null) as SavedItem[];
      
      setSavedItems(combinedData);
    } catch (err) {
      console.error("[fetchSavedItems] Error occurred:", err);
      toast.error('Failed to load saved items.');
      setSavedItems([]);
    } finally {
      setIsLoadingSaved(false);
    }
  }, [isOwnProfile, user]);

  const checkFriendStatus = useCallback(async () => {
    // Skip this check if we're looking at our own profile, if we don't have an authenticated user,
    // or if we don't have a profile ID to check against
    if (isOwnProfile || !user || !profileId) {
      setFriendStatus('none');
      return;
    }
    
    // Skip if we already got the friend status from the profile
    if (profile && profile.friend_status) {
      // Eğer profil verisinde arkadaşlık durumu zaten varsa
      setFriendStatus(profile.friend_status as 'pending' | 'accepted' | 'none' | 'error');
      return;
    }
    
    // Eğer profile data içinde friend_status yoksa, bir hata var demektir
    if (profile && !profile.friend_status) {
      console.error("Profile data does not contain friend_status information");
      setFriendStatus('error');
    }
  }, [isOwnProfile, user, profileId, profile]);

  useEffect(() => {
    fetchProfileData();
    // We'll set isOwnProfile in fetchProfileData, don't check friendship status for own profile
    if (!isOwnProfile && (!profile || !('friend_status' in profile))) {
        checkFriendStatus();
    }
  }, [effectiveProfileId, user?.id]);

  useEffect(() => {
    if (activeTab === 'posts') fetchProfilePosts();
    else if (activeTab === 'groups') fetchGroups();
    else if (activeTab === 'events') fetchEvents();
    else if (activeTab === 'friends') fetchFriends();
    else if (activeTab === 'saved' && isOwnProfile) fetchSavedItems();
  }, [activeTab, fetchProfilePosts, fetchGroups, fetchEvents, fetchFriends, fetchSavedItems, isOwnProfile]);

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm(t('profile.confirmDeletePost') || 'Are you sure you want to delete this post?')) return;
    try {
      const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', postId)
          .eq('user_id', user?.id);

      if (error) throw error;
      
        setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
      toast.success(t('profile.postDeletedSuccess') || 'Post deleted successfully.');
    } catch (err) {
        console.error('Error deleting post:', err);
      toast.error(t('profile.postDeleteFailed') || 'Failed to delete post.');
    }
  };

  const handleConfirmDeletePost = async (postId: string) => {
    await handleDeletePost(postId);
  };
    
  const handleSendFriendRequest = async () => {
    if (!profileId || !user) return;
    setIsSendingFriendRequest(true);
    try {
      const { error } = await supabase
        .from('user_connections')
        .insert({ user_id: user.id, friend_id: profileId, status: 'pending' });
      if (error) throw error;
      
      // Bildirim gönderimi ekleyelim
      console.log("Creating friend request notification for user:", profileId);
      await createNotification(
        profileId, // Alıcı kullanıcı ID'si
        'friend_request', // Bildirim tipi
        user.id, // İsteği gönderen kullanıcı ID'si
      );
      
      setFriendStatus('pending');
      toast.success(t('profile.friendRequestSent') || 'Friend request sent!');
    } catch (err) {
      console.error('Error sending friend request:', err);
      toast.error(t('profile.friendRequestFailed') || 'Failed to send friend request.');
    } finally {
      setIsSendingFriendRequest(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!window.confirm(t('profile.confirmRemoveFriend') || 'Are you sure you want to remove this friend?')) return;
    if (!profileId || !user) return;
    try {
      await supabase.from('user_connections').delete().match({ user_id: user.id, friend_id: profileId });
      await supabase.from('user_connections').delete().match({ user_id: profileId, friend_id: user.id });
      setFriendStatus('none');
      fetchFriends();
      toast.success(t('profile.friendRemovedSuccess') || 'Friend removed.');
    } catch (err) {
      console.error('Error removing friend:', err);
      toast.error(t('profile.friendRemoveFailed') || 'Failed to remove friend.');
    }
  };

  const handleAcceptFriendRequest = async () => {
      if (!profileId || !user || friendStatus !== 'pending') return;
      try {
          const { error } = await supabase
              .from('user_connections')
              .update({ status: 'accepted' })
              .match({ user_id: profileId, friend_id: user.id, status: 'pending' });

          if (error) throw error;
          setFriendStatus('accepted');
          fetchFriends();
      toast.success(t('profile.friendRequestAccepted') || 'Friend request accepted!');
        } catch (err) {
          console.error('Error accepting friend request:', err);
      toast.error(t('profile.friendRequestAcceptFailed') || 'Failed to accept friend request.');
      }
  };

  const handleOpenEditModal = () => {
    setShowEditModal(true);
  };

  const handleProfileUpdated = () => {
    setShowEditModal(false);
    fetchProfileData();
    checkProfileCompletion();
  };

  const renderFriendActionButton = () => {
    if (isOwnProfile || !user || friendStatus === 'error') return null;

    switch (friendStatus) {
      case 'none':
        return (
          <Button onClick={handleSendFriendRequest} disabled={isSendingFriendRequest} className={primaryButtonStyle}>
            {isSendingFriendRequest ? <LoadingSpinner size="sm" /> : <FiUserPlus className="mr-2" />} 
            {t('profile.buttons.addFriend')}
          </Button>
        );
      case 'pending':
          if (!isOwnProfile) {
          return (
              <div className="flex space-x-2">
                  <Button onClick={handleAcceptFriendRequest} className={primaryButtonStyle}>
                          <FiCheck className="mr-2" /> {t('profile.buttons.accept')}
                  </Button>
                  <Button variant="outline" onClick={handleRemoveFriend} className={outlineButtonStyle}>
                          <FiX className="mr-2" /> {t('profile.buttons.decline')}
                  </Button>
              </div>
          );
          } else {
              return <span className="text-sm text-gray-500 dark:text-gray-400 italic">{t('profile.status.requestSent')}</span>; 
          }
      case 'accepted':
        return (
          <Button onClick={handleRemoveFriend} variant="outline" className={outlineButtonStyle}>
            <FiUserX className="mr-2" /> {t('profile.buttons.removeFriend')}
          </Button>
        );
      default:
        return null;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        return (
          <div className="space-y-6">
          {isOwnProfile && (
              <PostCreate onPostCreated={fetchProfilePosts} />
            )}
            {isLoadingPosts ? (
              <div className="flex justify-center py-10"><LoadingSpinner /></div>
            ) : posts.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                {isOwnProfile ? t('profile.noPostsYet') : `${profile?.full_name || 'User'} ${t('profile.userHasNoPostsSuffix') || 'has no posts.'}`}
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onDelete={() => handleConfirmDeletePost(post.id)}
                    isOwner={post.user_id === user?.id}
                  />
                ))}
              </div>
            )}
      </div>
    );
      case 'groups':
    return (
          <div>
                  {isLoadingGroups ? (
                      <div className="flex justify-center py-10"><LoadingSpinner /></div>
                  ) : groupsData.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                {isOwnProfile ? t('profile.noGroupsJoined') : `${profile?.full_name || 'User'} ${t('profile.userNotInGroupsSuffix') || "isn't part of any groups."}`}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupsData.map((group) => (
                  <div key={group.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="h-32 bg-gradient-to-r from-blue-400 to-indigo-500 relative">
                      {group.banner_url && (
                                          <img src={group.banner_url} alt={group.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                                          {group.name || 'Unnamed Group'}
                </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                                          {group.description || 'No description available.'}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {group.member_count || 0} {t('groups.members')}
                        </span>
                        <Link
                          to={`/groups/${group.id}`}
                                              className={actionButtonStyle}
                        >
                          {t('profile.buttons.viewGroup')}
                        </Link>
              </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
                {isOwnProfile && (
                      <div className="mt-6 text-center">
                          <Link to="/groups/create" className={primaryButtonStyle}>
                  <FiPlus className="mr-2 inline" /> {t('profile.buttons.createGroup')}
                </Link>
              </div>
            )}
          </div>
        );
      case 'events':
        return (
          <div>
                  {isLoadingEvents ? (
                      <div className="flex justify-center py-10"><LoadingSpinner /></div>
                  ) : eventsData.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                {isOwnProfile ? t('profile.noEventsJoined') : `${profile?.full_name || 'User'} ${t('profile.userNotInEventsSuffix') || "isn't associated with any events."}`}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {eventsData.map((event) => (
                              <div key={event.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col">
                                  <div className="h-32 bg-gradient-to-r from-purple-400 to-pink-500 relative flex-shrink-0">
                      {event.banner_url && (
                                          <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />
                                      )}
                                      <div className="absolute top-2 right-2 space-x-1">
                      {event.is_creator && (
                                              <span className="px-2 py-0.5 text-xs bg-yellow-500 text-white rounded-full font-medium shadow">Creator</span>
                      )}
                      {event.is_attending && !event.is_creator && (
                                              <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full font-medium shadow">Attending</span>
                )}
              </div>
                                  </div>
                                  <div className="p-4 flex flex-col flex-grow">
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                                          <FiCalendar className="mr-1.5 flex-shrink-0" size={12} />
                                          <span>{formatDate(event.start_date)}</span>
                        {event.end_date && (
                                              <span className="ml-1"> - {formatDate(event.end_date)}</span>
                        )}
            </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                        {event.title}
                      </h3>
                                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 flex-grow">
                                          {event.description || 'No description available.'}
                      </p>
                      {event.location && (
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-3">
                                              <FiMapPin className="mr-1.5 flex-shrink-0" size={12} />
                                              <span className="truncate">{event.location}</span>
                </div>
              )}
                                      <div className="flex justify-end mt-auto">
                        <Link
                          to={`/events/${event.id}`}
                                              className={`${actionButtonStyle} text-xs px-3 py-1`}
                        >
                          {t('profile.buttons.viewDetails')}
                        </Link>
            </div>
              </div>
              </div>
                ))}
            </div>
            )}
            {isOwnProfile && (
                      <div className="mt-6 text-center">
                          <Link to="/events/create" className={primaryButtonStyle}>
                  <FiPlus className="mr-2 inline" /> {t('profile.buttons.createEvent')}
                </Link>
          </div>
            )}
      </div>
    );
      case 'friends':
  return (
          <div>
            {isLoadingFriends ? (
              <div className="flex justify-center py-10"><LoadingSpinner /></div>
            ) : friendsData.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                {isOwnProfile ? t('profile.noFriendsYet') : `${profile?.full_name || 'User'} ${t('profile.userHasNoFriendsSuffix') || 'has no friends to display.'}`}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {friendsData.map((friend) => (
                  <Link to={`/profile/${friend.id}`} key={friend.id} className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow">
                    <Avatar src={friend.avatar_url ?? undefined} name={friend.full_name ?? ''} size="lg" />
                    <span className="mt-2 text-sm font-medium text-gray-900 dark:text-white truncate w-full text-center">
                      {friend.full_name}
                    </span>
                    {friend.headline && <span className="text-xs text-gray-500 dark:text-gray-400 truncate w-full text-center">{friend.headline}</span>}
                      </Link>
                ))}
              </div>
            )}
            {isOwnProfile && (
              <div className="mt-6 text-center">
                <Link to="/friends" className={primaryButtonStyle}>
                  <FiPlus className="mr-2 inline" /> {t('profile.buttons.findFriends')}
                </Link>
              </div>
            )}
          </div>
        );
      case 'saved':
         if (!isOwnProfile) return null;
        return (
              <div>
            {isLoadingSaved ? (
              <div className="flex justify-center py-10"><LoadingSpinner /></div>
            ) : savedItems.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                {t('profile.noSavedItems')}
              </div>
            ) : (
              <div className="space-y-4">
                {savedItems.map(item => (
                  <div key={item.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                     <div className="flex items-center space-x-2 mb-2">
                      <Avatar src={item.author?.avatar_url ?? undefined} name={item.author?.full_name ?? ''} size="sm" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.author?.full_name || 'Unknown Author'}</span>
              </div>
                    {item.type === 'post' && item.content && <p>{item.content}</p>}
                    {(item.type === 'event' || item.type === 'group') && item.title && <p className="font-semibold">{item.title}</p>}
                    {(item.type === 'event' || item.type === 'group') && item.description && <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>}
                  </div>
                ))}
                </div>
              )}
          </div>
        );
      case 'about':
         return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">About {profile?.full_name || 'User'}</h3>
            {isLoadingProfile ? (
              <LoadingSpinner />
            ) : profile ? (
              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                {profile.bio && <p className="text-lg italic">{profile.bio}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                    {profile.location && (
                        <div className="flex items-center space-x-2">
                            <FiMapPin className="text-gray-500" />
                            <span>{profile.location}</span>
              </div>
                    )}
                    {profile.website && 
                        <div className="flex items-center space-x-2">
                            <FiLink className="text-gray-500" />
                            <a href={profile.website.startsWith('http') ? profile.website : `//${profile.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate">
                          {profile.website}
                        </a>
              </div>
                    }
                    <div className="flex items-center space-x-2">
                       <FiCalendar className="text-gray-500" />
                       <span>Joined on {formatDate(profile?.created_at)}</span>
                    </div>
                </div>
                {/* Interests ilişkisi olmadığı için bu kısmı yorum satırına alıyoruz */}
                {/* selectedInterests.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                    <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Interests:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedInterests.map(interest => (
                        <span key={interest} className="px-3 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 rounded-full text-sm font-medium">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                ) */}
              </div>
            ) : (
              <p className="text-center py-10 text-gray-500 dark:text-gray-400">Could not load profile information.</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoadingProfile && !profile) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="lg" /></div>;
  }

  if (!profile) {
  return (
        <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">Profile not found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">The profile you are looking for does not exist or could not be loaded.</p>
            <Link to="/" className={primaryButtonStyle}>
                Go to Homepage
            </Link>
            </div>
    );
  }

  return (
    <div className="min-h-screen">
      {isLoadingProfile ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : !profile ? (
        <div className="max-w-4xl mx-auto mt-8 py-6 px-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="text-center py-10">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
              {t('profile.notFound') || 'Profile not found'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This profile doesn't exist or you don't have permission to view it.
            </p>
            <Link to="/" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 dark:bg-rose-500 dark:hover:bg-rose-600">
              <FiArrowLeft className="mr-2" />
              Return Home
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Profile header */}
          <div className="bg-white dark:bg-gray-800 shadow">
            <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <ProfileAvatar 
                    avatarUrl={profile.avatar_url}
                    fullName={profile.full_name || ''}
                    size="lg" 
                  />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.full_name}</h1>
                    {profile.headline && <p className="text-gray-500 dark:text-gray-400">{profile.headline}</p>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.location && (
                        <span className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <FiMapPin className="mr-1" /> {profile.location}
                        </span>
                      )}
                      {profile.website && (
                        <a 
                          href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <FiLink className="mr-1" /> {profile.website}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  {isOwnProfile ? (
                    <Button onClick={handleOpenEditModal} className="inline-flex items-center">
                      <FiEdit2 className="mr-2" /> {t('profile.buttons.editProfile')}
                    </Button>
                  ) : (
                    renderFriendActionButton()
                  )}
                </div>
              </div>

              {profile.bio && (
                <div className="mt-6">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{profile.bio}</p>
                </div>
              )}

              {/* Interests ilişkisi olmadığı için bu kısmı yorum satırına alıyoruz */}
              {/* selectedInterests.length > 0 && (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {selectedInterests.map((interest) => (
                      <span 
                        key={interest} 
                        className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full px-3 py-1 text-sm"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              ) */}

              {/* Tabs */}
              <div className="mt-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`${
                        activeTab === tab.id
                          ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      } whitespace-nowrap flex pb-4 pt-2 px-1 border-b-2 font-medium text-sm`}
                    >
                      <tab.icon className="mr-2 h-5 w-5" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Tab content */}
          <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {renderTabContent()}
          </div>
        </>
      )}

      {showEditModal && (
        <ProfileEditModal 
          profile={profile} 
          onProfileUpdated={handleProfileUpdated}
        />
      )}
    </div>
  );
};

export default ProfilePage;