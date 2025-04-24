import React, { useState, useEffect } from 'react';
import { FaSearch, FaUsers, FaCalendarAlt, FaHashtag } from 'react-icons/fa';
import { FiUser, FiMapPin, FiPlus, FiHash } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { translateBatch } from '../services/googleTranslateService';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import Avatar from '../components/common/Avatar';
import { toast } from 'react-hot-toast';
import { createNotification } from '../utils/userUtils';

// Standard button style for consistency
const primaryButtonStyle = "w-full py-2 bg-gradient-to-r from-gray-300 to-rose-500 text-white rounded-full hover:from-gray-400 hover:to-rose-600 transition-colors font-medium flex items-center justify-center";
const outlineButtonStyle = "w-full py-2 border border-gray-400 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium flex items-center justify-center";

// Update the textsToTranslate object to ensure all keys are correct and translated
const textsToTranslate = {
  discover: 'Discover',
  searchPlaceholder: 'Search people, groups, or events...',
  trending: 'Trending',
  groups: 'Groups',
  events: 'Events',
  people: 'People',
  posts: 'posts',
  members: 'members',
  joinGroup: 'Join Group',
  joinEvent: 'Join Event',
  attendees: 'attendees',
  mutualFriends: 'mutual friends',
  addFriend: 'Add Friend',
  requestPending: 'Request Pending',
  alreadyFriend: 'Already Friends',
  exploreMore: 'Explore More',
  seeAll: 'See All',
  about: 'About',
  location: 'Location',
  description: 'Description',
  eventDate: 'Event Date',
  loading: 'Loading...',
  noResults: 'No results found',
  viewProfile: 'View Profile',
  joinedGroups: 'Joined Groups',
  joinedEvents: 'Joined Events',
  noDescription: 'No description available'
};

// Define types for joined groups and events
interface JoinedGroup {
  group_id: string;
  groups: {
    id: string;
    name: string;
    member_count: number;
    banner_url?: string;
    description?: string;
  };
}

interface JoinedEvent {
  event_id: string;
  events: {
    id: string;
    title: string;
    start_date: string;
    banner_url?: string;
    location?: string;
    description?: string;
  };
}

// Add emoji mappings for categories to use instead of images
const categoryEmojis: {[key: string]: string} = {
  technology: '💻',
  photography: '📷',
  travel: '✈️',
  music: '🎵',
  art: '🎨',
  food: '🍕',
  fashion: '👗',
  sports: '⚽',
  education: '📚',
  business: '💼',
  health: '🏋️‍♀️',
  gaming: '🎮',
  movies: '🎬',
  books: '📚',
  science: '🔬',
  nature: '🌿',
};

// Move the trendingTopics declaration outside the component
const trendingTopics = [
  { id: 1, name: 'Technology', posts: 1234, emoji: '💻' },
  { id: 2, name: 'Photography', posts: 856, emoji: '📷' },
  { id: 3, name: 'Travel', posts: 743, emoji: '✈️' },
  { id: 4, name: 'Music', posts: 621, emoji: '🎵' },
  { id: 5, name: 'Art', posts: 589, emoji: '🎨' },
  { id: 6, name: 'Food', posts: 432, emoji: '🍕' },
];

// Export at the module level
export { trendingTopics };

const DiscoverPage = () => {
  const { currentLanguage } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'trending' | 'groups' | 'event' | 'people'>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [translations, setTranslations] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<{[key: string]: string}>({});
  const [joinedGroups, setJoinedGroups] = useState<JoinedGroup[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<JoinedEvent[]>([]);

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const textsArray = Object.values(textsToTranslate);
        const translatedTexts = await translateBatch(
          textsArray,
          currentLanguage.toUpperCase() as 'KK' | 'TR' | 'EN'
        );
        
        const newTranslations: { [key: string]: string } = {};
        Object.keys(textsToTranslate).forEach((key, index) => {
          newTranslations[key] = translatedTexts[index];
        });
        
        setTranslations(newTranslations);
      } catch (error) {
        console.error('Translation error:', error);
        // Fallback to original texts
        setTranslations(textsToTranslate);
      }
    };

    if (currentLanguage !== 'en') {
      loadTranslations();
    } else {
      setTranslations(textsToTranslate);
    }
  }, [currentLanguage]); // Remove textsToTranslate from dependency array

  // Fetch recommended groups, events, and people from Supabase
  useEffect(() => {
    if (user) {
      fetchSuggestedData();
      fetchJoinedData();
    }
  }, [user, activeTab]);

  const fetchSuggestedData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Fetch trending topics (tags with most posts)
      if (activeTab === 'trending') {
        // In a real app, fetch trending tags/topics from the database
        setIsLoading(false);
      }
      
      // Fetch suggested groups the user is not in yet
      else if (activeTab === 'groups') {
        const { data: userGroups } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);
        
        const userGroupIds = userGroups?.map(g => g.group_id) || [];
        
        const { data: groups } = await supabase
          .from('groups')
          .select('*')
          .not('id', 'in', `(${userGroupIds.length > 0 ? userGroupIds.join(',') : '0'})`)
          .order('member_count', { ascending: false })
          .limit(6);
        
        if (groups && groups.length > 0) {
          setSuggestedGroups(groups);
        }
        
        setIsLoading(false);
      }
      
      // Fetch upcoming events the user is not attending yet
      else if (activeTab === 'event') {
        const { data: userEvents } = await supabase
          .from('event_attendees')
          .select('event_id')
          .eq('user_id', user.id);
        
        const userEventIds = userEvents?.map(e => e.event_id) || [];
        
        const { data: events } = await supabase
          .from('events')
          .select('*')
          .not('id', 'in', `(${userEventIds.length > 0 ? userEventIds.join(',') : '0'})`)
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(6);
        
        if (events && events.length > 0) {
          setUpcomingEvents(events);
        }
        
        setIsLoading(false);
      }
      
      // Fetch people suggestions (show friends of friends, not direct friends)
      else if (activeTab === 'people') {
        // Get user's friends
        const { data: userFriends } = await supabase
          .from('user_connections')
          .select('friend_id')
          .eq('user_id', user.id)
          .eq('status', 'accepted');
        
        // Get friend-of-friends that user is not connected to yet
        const friendIds = userFriends?.map(f => f.friend_id) || [];
        if (friendIds.length > 0) {
          const { data: suggestedUsers } = await supabase
            .from('profiles')
            .select('*')
            .not('id', 'in', `(${friendIds.join(',')},${user.id})`)
            .limit(6);
          
          if (suggestedUsers && suggestedUsers.length > 0) {
            setSuggestedPeople(suggestedUsers);
            
            // Check friendship status for each suggested person
            const statusChecks = suggestedUsers.map(async (person) => {
              const status = await checkFriendshipStatus(person.id);
              return { id: person.id, status };
            });
            
            const statuses = await Promise.all(statusChecks);
            const statusMap = statuses.reduce((map, item) => {
              map[item.id] = item.status;
              return map;
            }, {} as {[key: string]: string});
            
            setFriendshipStatus(statusMap);
          }
        }
        
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setIsLoading(false);
    }
  };

  const checkFriendshipStatus = async (profileId: string): Promise<string> => {
    if (!user) return 'none';
    
    try {
      const { data, error } = await supabase
        .from('user_connections')
        .select('status')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${profileId}),and(user_id.eq.${profileId},friend_id.eq.${user.id})`)
        .maybeSingle();
      
      if (error) throw error;
      
      return data ? data.status : 'none';
    } catch (error) {
      console.error('Error checking friendship status:', error);
      return 'none';
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    if (!user) return;
    
    try {
      // First check if a request already exists
      const { data: existingRequest } = await supabase
        .from('user_connections')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`)
        .maybeSingle();
      
      if (existingRequest) {
        toast.error('A connection already exists with this user');
        return;
      }
      
      // Insert new friend request
      const { error } = await supabase
        .from('user_connections')
        .insert({
          user_id: user.id,
          friend_id: userId,
          status: 'pending'
        });
      
      if (error) throw error;
      
      // Bildirim oluştur
      console.log("Creating friend request notification for user:", userId);
      await createNotification(
        userId, // Alıcı kullanıcı ID'si
        'friend_request', // Bildirim tipi
        user.id, // İsteği gönderen kullanıcı ID'si
      );
      
      // Update local state
      setFriendshipStatus(prev => ({
        ...prev,
        [userId]: 'pending'
      }));
      
      toast.success('Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send friend request');
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;
    
    try {
      // Check if user is already a member
      const { data: existingMembership } = await supabase
        .from('group_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('group_id', groupId)
        .maybeSingle();
      
      if (existingMembership) {
        toast.error('You are already a member of this group');
        return;
      }
      
      // Add user to group
      const { error } = await supabase
        .from('group_members')
        .insert({
          user_id: user.id,
          group_id: groupId
        });
      
      if (error) throw error;
      
      toast.success('Successfully joined the group!');
      
      // Refresh group suggestions
      fetchSuggestedData();
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Failed to join group');
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    if (!user) return;
    
    try {
      // Check if user is already attending
      const { data: existingAttendee } = await supabase
        .from('event_attendees')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', eventId)
        .maybeSingle();
      
      if (existingAttendee) {
        toast.error('You are already attending this event');
        return;
      }
      
      // Add user to event
      const { error } = await supabase
        .from('event_attendees')
        .insert({
          user_id: user.id,
          event_id: eventId
        });
      
      if (error) throw error;
      
      toast.success('Successfully RSVP\'d to the event!');
      
      // Refresh event suggestions
      fetchSuggestedData();
    } catch (error) {
      console.error('Error joining event:', error);
      toast.error('Failed to join event');
    }
  };

  const [suggestedGroups, setSuggestedGroups] = useState([
    {
      id: '1',
      name: 'Tech Enthusiasts',
      member_count: 1200,
      banner_url: 'https://source.unsplash.com/800x600/?technology',
      description: 'A community for tech lovers and innovators',
    },
    {
      id: '2',
      name: 'Photography Club',
      member_count: 850,
      banner_url: 'https://source.unsplash.com/800x600/?photography',
      description: 'Share your best shots and photography tips',
    },
    {
      id: '3',
      name: 'World Travelers',
      member_count: 3200,
      banner_url: 'https://source.unsplash.com/800x600/?travel',
      description: 'Explore the world together',
    },
  ]);

  const [upcomingEvents, setUpcomingEvents] = useState([
    {
      id: '1',
      title: 'Tech Conference 2025',
      start_date: '2025-03-15',
      banner_url: 'https://source.unsplash.com/800x600/?conference',
      attendee_count: 450,
      location: 'San Francisco, CA',
      description: 'The biggest tech conference of the year',
    },
    {
      id: '2',
      name: 'Photography Workshop',
      start_date: '2025-03-20',
      banner_url: 'https://source.unsplash.com/800x600/?workshop',
      attendee_count: 120,
      location: 'New York, NY',
      description: 'Learn portrait photography from experts',
    },
    {
      id: '3',
      title: 'Music Festival',
      start_date: '2025-04-01',
      banner_url: 'https://source.unsplash.com/800x600/?festival',
      attendee_count: 2000,
      location: 'Austin, TX',
      description: 'Three days of amazing live music',
    },
  ]);

  const [suggestedPeople, setSuggestedPeople] = useState([
    {
      id: '1',
      full_name: 'John Smith',
      headline: 'Software Engineer',
      avatar_url: 'https://i.pravatar.cc/150?img=1',
      location: 'San Francisco, CA',
    },
    {
      id: '2',
      full_name: 'Emma Wilson',
      headline: 'Photographer',
      avatar_url: 'https://i.pravatar.cc/150?img=5',
      location: 'New York, NY',
    },
    {
      id: '3',
      full_name: 'Michael Chen',
      headline: 'UX Designer',
      avatar_url: 'https://i.pravatar.cc/150?img=3',
      location: 'Seattle, WA',
    },
  ]);

  // Add logic to fetch and display joined groups and events
  const fetchJoinedData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch joined groups
      const { data: joinedGroups } = await supabase
        .from('group_members')
        .select('group_id, groups(*)')
        .eq('user_id', user.id);
      setJoinedGroups(joinedGroups?.map((item: any) => ({
        group_id: item.group_id,
        groups: item.groups
      })) || []);

      // Fetch joined events
      const { data: joinedEvents } = await supabase
        .from('event_attendees')
        .select('event_id, events(*)')
        .eq('user_id', user.id);
      setJoinedEvents(joinedEvents?.map((item: any) => ({
        event_id: item.event_id,
        events: item.events
      })) || []);
    } catch (error) {
      console.error('Error fetching joined data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update renderContent to include joined content
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      );
    }
    
    switch (activeTab) {
      case 'trending':
        return renderTrendingContent();
      case 'groups':
        return renderGroupsContent();
      case 'event':
        return renderEventsContent();
      case 'people':
        return renderPeopleContent();
      default:
        return renderJoinedContent();
    }
  };

  const renderTrendingContent = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trendingTopics.map((topic) => (
          <div key={topic.id} className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-600">
            <div className="relative h-48 bg-gradient-to-br from-rose-400 to-red-500 flex justify-center items-center">
              <span className="text-8xl" role="img" aria-label={topic.name}>
                {topic.emoji}
              </span>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                <div className="p-4 text-white">
                  <h3 className="text-lg font-semibold">#{topic.name}</h3>
                  <p className="text-sm text-white/80">
                    {topic.posts} {translations.posts || textsToTranslate.posts}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <Link 
                to={`/search?tag=${encodeURIComponent(topic.name)}`}
                className={outlineButtonStyle}
              >
                <FaHashtag className="mr-2" />
                {translations.exploreMore || textsToTranslate.exploreMore}
              </Link>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderGroupsContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {suggestedGroups.map((group) => (
        <div key={group.id} className="bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-600 flex flex-col">
          <div className="h-32 bg-gradient-to-br from-rose-400 to-red-500 flex justify-center items-center">
            <span className="text-6xl" role="img" aria-label={group.name}>
              {categoryEmojis[group.name.toLowerCase()] || '👥'}
            </span>
          </div>
          <div className="p-4 flex flex-col flex-grow">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
              {group.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-300 mb-3 line-clamp-2 flex-grow">
              {group.description || translations.noDescription}
            </p>
            <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-100 dark:border-gray-600">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {group.member_count || 0} {translations.members}
              </span>
              <button
                onClick={() => handleJoinGroup(group.id)}
                className="px-4 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-rose-500 to-red-500 rounded-full hover:from-rose-600 hover:to-red-600 transition-colors"
              >
                {translations.joinGroup}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEventsContent = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {upcomingEvents.map((event) => {
          // Get emoji based on title or fallback to a default
          const getEventEmoji = () => {
            if (!event.title) return '🎉';
            const title = event.title.toLowerCase();
            if (title.includes('music')) return '🎵';
            if (title.includes('tech')) return '💻';
            if (title.includes('photo')) return '📷';
            return '🎉';
          };
          
          return (
            <div key={event.id} className="bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-600 flex flex-col">
              <div className="h-32 bg-gradient-to-br from-rose-400 to-red-500 flex justify-center items-center">
                <span className="text-6xl" role="img" aria-label={event.title || 'Event'}>
                  {getEventEmoji()}
                </span>
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                  {event.title || 'Event'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-300 mb-3 line-clamp-2 flex-grow">
                  {event.description || translations.noDescription}
                </p>
                <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-100 dark:border-gray-600">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(event.start_date).toLocaleDateString()} {translations.eventDate}
                  </span>
                  <button
                    onClick={() => handleJoinEvent(event.id)}
                    className="px-4 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-rose-500 to-red-500 rounded-full hover:from-rose-600 hover:to-red-600 transition-colors"
                  >
                    {translations.joinEvent}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPeopleContent = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suggestedPeople.map((person) => (
          <div key={person.id} className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow p-4 border border-gray-200 dark:border-gray-600 flex flex-col">
            <div className="flex flex-col items-center text-center mb-4 flex-grow">
              <div className="mb-3">
                <Avatar 
                  src={person.avatar_url}
                  name={person.full_name}
                  size="lg"
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{person.full_name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-300">{person.headline}</p>
              {person.location && (
                <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 flex items-center">
                  <FiMapPin className="mr-1" size={12} />
                  {person.location}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-gray-600">
              {(!friendshipStatus[person.id] || friendshipStatus[person.id] === 'none') && (
                <button 
                  onClick={() => handleSendFriendRequest(person.id)}
                  className="w-full py-1.5 text-sm font-medium text-white bg-gradient-to-r from-rose-500 to-red-500 rounded-full hover:from-rose-600 hover:to-red-600 transition-colors flex items-center justify-center"
                >
                  <FiPlus className="mr-1" />
                  {translations.addFriend || textsToTranslate.addFriend}
                </button>
              )}
              
              {friendshipStatus[person.id] === 'pending' && (
                <button 
                  disabled
                  className="w-full py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 rounded-full font-medium flex items-center justify-center"
                >
                  {translations.requestPending || textsToTranslate.requestPending}
                </button>
              )}
              
              {friendshipStatus[person.id] === 'accepted' && (
                <button 
                  disabled
                  className="w-full py-1.5 text-sm font-medium text-green-700 dark:text-green-400 rounded-full font-medium flex items-center justify-center"
                >
                  {translations.alreadyFriend || textsToTranslate.alreadyFriend}
                </button>
              )}
              
              <Link
                to={`/profile/${person.id}`}
                className="w-full py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-500 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
              >
                <FiUser className="mr-1" />
                {translations.viewProfile || textsToTranslate.viewProfile}
              </Link>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Add rendering logic for joined content
  const renderJoinedContent = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {joinedGroups.map((group) => (
          <div key={group.group_id} className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-600">
            <div className="relative h-48 bg-gradient-to-br from-rose-400 to-red-500">
              <img 
                src={group.groups.banner_url || `https://source.unsplash.com/800x600/?${encodeURIComponent(group.groups.name)}`} 
                alt={group.groups.name} 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
                <div className="absolute top-3 right-3 bg-blue-600/90 text-white text-xs px-2 py-1 rounded-full">
                  <FaUsers className="inline mr-1" />
                  {group.groups.member_count}
                </div>
              </div>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{group.groups.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-300 mb-4 line-clamp-2">{group.groups.description}</p>
              <Link 
                to={`/groups/${group.group_id}`}
                className="text-rose-600 dark:text-rose-400 text-sm font-medium hover:underline"
              >
                {translations.about || textsToTranslate.about}
              </Link>
            </div>
          </div>
        ))}
        {joinedEvents.map((event) => (
          <div key={event.event_id} className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-600">
            <div className="relative h-48 bg-gradient-to-br from-rose-400 to-red-500">
              <img 
                src={event.events.banner_url || `https://source.unsplash.com/800x600/?${encodeURIComponent(event.events.title || 'event')}`} 
                alt={event.events.title} 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent">
                <div className="absolute bottom-3 left-3 text-white">
                  <div className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full mb-1">
                    <FaCalendarAlt className="inline mr-1" />
                    {new Date(event.events.start_date).toLocaleDateString()}
                  </div>
                  {event.events.location && (
                    <div className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                      <FiMapPin className="inline mr-1" />
                      {event.events.location}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{event.events.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-300 mb-4 line-clamp-2">{event.events.description}</p>
              <Link 
                to={`/events/${event.event_id}`}
                className="text-rose-600 dark:text-rose-400 text-sm font-medium hover:underline"
              >
                {translations.about || textsToTranslate.about}
              </Link>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 dark:bg-neutral-800 min-h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {translations.discover || textsToTranslate.discover}
        </h1>
        
        {/* Search Bar */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder={translations.searchPlaceholder || textsToTranslate.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent dark:text-white"
          />
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 overflow-x-auto pb-4">
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex items-center px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'trending'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-sm'
            }`}
          >
            <FaHashtag className="w-4 h-4 mr-2" />
            {translations.trending || textsToTranslate.trending}
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'groups'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-sm'
            }`}
          >
            <FaUsers className="w-4 h-4 mr-2" />
            {translations.groups || textsToTranslate.groups}
          </button>
          <button
            onClick={() => setActiveTab('event')}
            className={`flex items-center px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'event'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-sm'
            }`}
          >
            <FaCalendarAlt className="w-4 h-4 mr-2" />
            {translations.events || textsToTranslate.events}
          </button>
          <button
            onClick={() => setActiveTab('people')}
            className={`flex items-center px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'people'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-sm'
            }`}
          >
            <FiUser className="w-4 h-4 mr-2" />
            {translations.people || textsToTranslate.people}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="pb-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default DiscoverPage;
