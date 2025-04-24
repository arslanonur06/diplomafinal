import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FiUser, FiMoreVertical, FiChevronLeft, FiCalendar, FiMessageCircle, FiTrash2, FiVolumeX, FiBell, FiUsers, FiTrash } from 'react-icons/fi';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import DirectMessageChat from '../components/chat/DirectMessageChat';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../components/ui/context-menu";
import { useTranslation } from 'react-i18next';

// Tabs bileşenlerini kendi oluşturalım - ui/tabs modülü olmadığı için
const TabsList: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={`flex border-b border-gray-200 dark:border-gray-700 ${className || ''}`} {...props}>
    {children}
  </div>
);

const TabsTrigger: React.FC<{
  value: string;
  active: string;
  onSelect: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}> = ({ value, active, onSelect, children, className }) => (
  <button
    type="button"
    role="tab"
    aria-selected={active === value}
    onClick={() => onSelect(value)}
    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex-1 ${
      active === value
        ? 'border-rose-500 text-rose-600 dark:text-rose-400'
        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
    } ${className || ''}`}
  >
    {children}
  </button>
);

const TabsContent: React.FC<{
  value: string;
  active: string;
  children: React.ReactNode;
  className?: string;
}> = ({ value, active, children, className }) => (
  <div
    role="tabpanel"
    hidden={active !== value}
    className={`${className || ''} ${active === value ? 'block' : 'hidden'}`}
  >
    {children}
  </div>
);

const Tabs: React.FC<{
  defaultValue: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={className}>
    {children}
  </div>
);

// CSS için stil tanımları
const HIGHLIGHT_STYLES = `
  .highlight-conversation {
    animation: highlight 2s ease-in-out;
  }
  
  @keyframes highlight {
    0%, 100% { background-color: transparent; }
    50% { background-color: rgba(59, 130, 246, 0.2); }
  }
  
  .highlight-conversation-target:focus-visible {
    outline: 2px solid #3b82f6;
    background-color: rgba(59, 130, 246, 0.1);
  }
`;

interface DirectMessage {
  id: string;
  user_id: string;
  other_user_id: string;
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  other_user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  unread?: number;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

// MessageData arayüzü kullanılacaksa - şimdilik çıkarma
// interface MessageData {...}

interface EventChat {
  id: string;
  title: string;
  start_date: string;
  description?: string;
  category?: string;
  location?: string;
  is_public?: boolean;
  created_by?: string;
  image_url?: string;
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
    sender_name?: string;
  };
}

// Unused interface - kept for reference
// interface RelationshipWithProfile {
//   id: string;
//   requester_id: string;
//   addressee_id: string;
//   status: string;
//   created_at: string;
//   profiles: Profile;
//   addressee: Profile;
// }

// Unused interface - kept for reference
// interface EventAttendee {
//   event: {
//     id: string;
//     title: string;
//     start_date: string;
//   }
// }

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { conversationId } = useParams<{ conversationId: string }>();
  const [conversations, setConversations] = useState<Record<string, DirectMessage>>({});
  const [eventChats, setEventChats] = useState<EventChat[]>([]);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("direct"); // "direct", "events", "groups"
  const [selectedConversation, setSelectedConversation] = useState<DirectMessage | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<DirectMessage | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventChat | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Comment out or remove unused state
  // const [eventLoading, setEventLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Stil ekleme - dinamik highlight için
    const style = document.createElement('style');
    style.textContent = HIGHLIGHT_STYLES;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    
    if (activeTab === "direct") {
      fetchFriendConversations();
    } else if (activeTab === "events") {
      fetchEventChats();
    } else if (activeTab === "groups") {
      fetchUserGroups();
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (conversationId && activeTab === "direct" && conversations[conversationId]) {
      setSelectedConversation(conversations[conversationId]);
    }
  }, [conversationId, conversations, activeTab]);

  useEffect(() => {
    console.log('DEBUG: Component did mount - Force events tab to be active');
    // Kullanici login oldugunda event tabi aktif olsun
    setActiveTab("events");
    
    // Ornek etkinlikleri direkt yükle
    const sampleEvents = createSampleEvents();
    console.log('Setting default sample events:', sampleEvents.length);
    setEventChats(sampleEvents);
    saveEventAttendancesToLocalStorage(sampleEvents);
  }, []); // Empty dependency array means it only runs once

  // Helper function to create and save sample friends for demonstration
  const createSampleFriends = (): DirectMessage[] => {
    const sampleFriends = [
      {
        id: 'sample-friend-1',
        user_id: user?.id || '',
        other_user_id: 'sample-friend-1',
        other_user: {
          id: 'sample-friend-1',
          full_name: 'Alex Johnson',
          avatar_url: 'https://randomuser.me/api/portraits/men/32.jpg'
        },
        last_message: {
          content: 'Hey there! How are you doing?',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          sender_id: 'sample-friend-1'
        },
        unread: 1
      },
      {
        id: 'sample-friend-2',
        user_id: user?.id || '',
        other_user_id: 'sample-friend-2',
        other_user: {
          id: 'sample-friend-2',
          full_name: 'Sarah Miller',
          avatar_url: 'https://randomuser.me/api/portraits/women/44.jpg'
        },
        last_message: {
          content: 'Are we still meeting tomorrow?',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          sender_id: user?.id || ''
        },
        unread: 0
      },
      {
        id: 'sample-friend-3',
        user_id: user?.id || '',
        other_user_id: 'sample-friend-3',
        other_user: {
          id: 'sample-friend-3',
          full_name: 'Mike Robinson',
          avatar_url: 'https://randomuser.me/api/portraits/men/67.jpg'
        },
        last_message: {
          content: 'Did you see that cool new tech announcement?',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          sender_id: 'sample-friend-3'
        },
        unread: 0
      },
      {
        id: 'sample-friend-4',
        user_id: user?.id || '',
        other_user_id: 'sample-friend-4',
        other_user: {
          id: 'sample-friend-4',
          full_name: 'Emma Wilson',
          avatar_url: 'https://randomuser.me/api/portraits/women/22.jpg'
        },
        last_message: {
          content: 'Thanks for your help yesterday!',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          sender_id: 'sample-friend-4'
        },
        unread: 0
      }
    ];
    
    try {
      localStorage.setItem('sampleFriends', JSON.stringify(sampleFriends));
    } catch (error) {
      console.error('Failed to save sample friends to localStorage:', error);
    }
    
    return sampleFriends;
  };

  // Function to initialize default friends when needed
  const initializeDefaultFriends = () => {
    // Check if friends already exist in localStorage
    const storedFriends = localStorage.getItem('sampleFriends');
    if (storedFriends) {
      try {
        const parsedFriends = JSON.parse(storedFriends);
        if (Array.isArray(parsedFriends) && parsedFriends.length > 0) {
          console.log('Friends already exist in localStorage:', parsedFriends.length);
          return; // Friends already exist, no need to create defaults
        }
      } catch (error) {
        console.error('Error parsing localStorage friends:', error);
      }
    }
    
    // If no friends found, create and save default friends
    console.log('Creating default friends as none were found');
    createSampleFriends();
  };

  // Add a useEffect to initialize friends when component mounts
  useEffect(() => {
    if (user) {
      initializeDefaultFriends();
    }
  }, [user]);

  const fetchFriendConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // First try using the RPC method if available
      try {
        const { data: relationshipsData, error: relationshipsError } = await supabase.rpc('get_user_relationships', {
          p_user_id: user.id
        });
        
        if (!relationshipsError && relationshipsData && relationshipsData.length > 0) {
          console.log('Successfully fetched relationships via RPC:', relationshipsData);
          
          // Transform data into DirectMessage format
          const conversations: Record<string, DirectMessage> = {};
          
          for (const relationship of relationshipsData) {
            conversations[relationship.other_user_id] = {
              id: relationship.other_user_id,
              user_id: user.id,
              other_user_id: relationship.other_user_id,
              other_user: {
                id: relationship.other_user_id,
                full_name: relationship.other_user_full_name || 'User',
                avatar_url: relationship.other_user_avatar_url
              },
              unread: 0
            };
          }
          
          // Try to fetch last messages for each conversation
          await fetchLastMessagesForConversations(conversations);
        return;
      }

        console.log('RPC method for relationships not available, trying fallback method');
      } catch (rpcError) {
        console.log('RPC method for relationships failed, trying fallback method', rpcError);
      }
      
      // Try using the friendships RPC method
      try {
        const { data: friendshipsData, error: friendshipsError } = await supabase.rpc('get_user_friendships', {
          p_user_id: user.id
        });
        
        if (!friendshipsError && friendshipsData && friendshipsData.length > 0) {
          console.log('Successfully fetched friendships via RPC:', friendshipsData);
          
          // Transform data into DirectMessage format
          const conversations: Record<string, DirectMessage> = {};
          
          for (const friendship of friendshipsData) {
            conversations[friendship.other_user_id] = {
              id: friendship.other_user_id,
              user_id: user.id,
              other_user_id: friendship.other_user_id,
              other_user: {
                id: friendship.other_user_id,
                full_name: friendship.other_user_full_name || 'User',
                avatar_url: friendship.other_user_avatar_url
              },
              unread: 0
            };
          }
          
          // Try to fetch last messages for each conversation
          await fetchLastMessagesForConversations(conversations);
        return;
      }

        console.log('Friendships RPC method failed, trying direct queries');
      } catch (friendshipsRpcError) {
        console.log('Friendships RPC method failed:', friendshipsRpcError);
      }
      
      // Fallback: Try direct query with relationships
      try {
        const { data: relationshipsData, error: relationshipsError } = await supabase
          .from('relationships')
          .select('id, requester_id, addressee_id, status, created_at')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq('status', 'accepted');

        if (!relationshipsError && relationshipsData && relationshipsData.length > 0) {
          // Process the relationships data manually
      const friendConversations: Record<string, DirectMessage> = {};

          // Process relationships one by one
      for (const relationship of relationshipsData) {
            try {
        // Determine the ID of the other user in the relationship
              const otherUserId = relationship.requester_id === user?.id 
                ? relationship.addressee_id 
                : relationship.requester_id;
        
        // Fetch profile information for this user
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', otherUserId)
          .single();
          
        if (profileError) {
          console.error(`Error fetching profile for user ${otherUserId}:`, profileError);
          continue; // Skip this relationship and continue with the next one
        }
        
        if (!profileData) {
          console.log(`No profile found for user ${otherUserId}`);
          continue;
        }

              // Create conversation without last message initially
              friendConversations[otherUserId] = {
                id: otherUserId,
                user_id: user?.id || '',
                other_user_id: otherUserId,
                other_user: {
                  id: profileData.id,
                  full_name: profileData.full_name,
                  avatar_url: profileData.avatar_url
                },
                unread: 0
              };
              
              // Try to fetch last message
              try {
        const { data: messages } = await supabase
          .from('direct_messages')
          .select('content, created_at, sender_id')
                  .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user?.id})`)
          .order('created_at', { ascending: false })
          .limit(1);

                if (messages && messages.length > 0) {
                  friendConversations[otherUserId].last_message = {
          content: messages[0].content,
          created_at: messages[0].created_at,
          sender_id: messages[0].sender_id
                  };
                }
              } catch (messageError) {
                console.log(`Error fetching messages for conversation with ${otherUserId}:`, messageError);
              }
            } catch (error) {
              console.error(`Error processing relationship:`, error);
              // Continue to the next relationship
            }
          }
          
          if (Object.keys(friendConversations).length > 0) {
            setConversations(friendConversations);
            
            // Select conversation from URL if present
            if (conversationId && friendConversations[conversationId]) {
              setSelectedConversation(friendConversations[conversationId]);
            }
            
            setLoading(false);
            return;
          }
        }
      } catch (directQueryError) {
        console.log('Direct query for relationships failed, trying friendships table', directQueryError);
      }
      
      // Try friendships table as alternative
      try {
        const { data: friendshipsData, error: friendshipsError } = await supabase
          .from('friendships')
          .select('id, user_id, friend_id, status, created_at')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq('status', 'accepted');

        if (!friendshipsError && friendshipsData && friendshipsData.length > 0) {
          // Map friendships data to relationships format and process
          const friendConversations: Record<string, DirectMessage> = {};

          // Process friendships one by one
          for (const friendship of friendshipsData) {
            try {
              // Determine the ID of the other user
              const otherUserId = friendship.user_id === user?.id 
                ? friendship.friend_id 
                : friendship.user_id;
              
              // Fetch profile information for this user
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', otherUserId)
                .single();
                
              if (profileError) {
                console.error(`Error fetching profile for user ${otherUserId}:`, profileError);
                continue; // Skip this friendship and continue with the next one
              }
              
              if (!profileData) {
                console.log(`No profile found for user ${otherUserId}`);
                continue;
              }

              // Create conversation without last message initially
        friendConversations[otherUserId] = {
          id: otherUserId,
                user_id: user?.id || '',
          other_user_id: otherUserId,
          other_user: {
            id: profileData.id,
            full_name: profileData.full_name,
            avatar_url: profileData.avatar_url
          },
                unread: 0
              };
              
              // Try to fetch last message
              try {
                const { data: messages } = await supabase
                  .from('direct_messages')
                  .select('content, created_at, sender_id')
                  .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user?.id})`)
                  .order('created_at', { ascending: false })
                  .limit(1);

                if (messages && messages.length > 0) {
                  friendConversations[otherUserId].last_message = {
                    content: messages[0].content,
                    created_at: messages[0].created_at,
                    sender_id: messages[0].sender_id
                  };
                }
              } catch (messageError) {
                console.log(`Error fetching messages for conversation with ${otherUserId}:`, messageError);
              }
            } catch (error) {
              console.error(`Error processing friendship:`, error);
              // Continue to the next friendship
            }
          }
          
          if (Object.keys(friendConversations).length > 0) {
      setConversations(friendConversations);
      
      // Select conversation from URL if present
      if (conversationId && friendConversations[conversationId]) {
        setSelectedConversation(friendConversations[conversationId]);
      }
            
            setLoading(false);
            return;
          }
        }
      } catch (friendshipsError) {
        console.log('Friendships table query failed', friendshipsError);
      }
      
      // Fallback to localStorage sample friends if available
      const storedFriends = localStorage.getItem('sampleFriends');
      if (storedFriends) {
        try {
          const parsedFriends = JSON.parse(storedFriends);
          if (Array.isArray(parsedFriends) && parsedFriends.length > 0) {
            console.log('Using sample friends from localStorage:', parsedFriends);
            
            // Convert array to record object
            const conversationsRecord: Record<string, DirectMessage> = {};
            parsedFriends.forEach(friend => {
              conversationsRecord[friend.other_user_id] = friend;
            });
            
            setConversations(conversationsRecord);
            
            // Select conversation from URL if present
            if (conversationId && conversationsRecord[conversationId]) {
              setSelectedConversation(conversationsRecord[conversationId]);
            }
            
            setLoading(false);
            return;
          }
        } catch (parseError) {
          console.error('Error parsing localStorage friends:', parseError);
        }
      }
      
      // If all else fails, create sample friends
      console.log('No friends found, creating sample friends');
      const sampleFriends = createSampleFriends();
      
      // Convert array to record object
      const conversationsRecord: Record<string, DirectMessage> = {};
      sampleFriends.forEach(friend => {
        conversationsRecord[friend.other_user_id] = friend;
      });
      
      setConversations(conversationsRecord);
      setLoading(false);
      
    } catch (error) {
      console.error('Error in fetchFriendConversations:', error);
      toast.error('Failed to load conversations');
      
      // Last resort fallback
      const sampleFriends = createSampleFriends();
      const conversationsRecord: Record<string, DirectMessage> = {};
      sampleFriends.forEach(friend => {
        conversationsRecord[friend.other_user_id] = friend;
      });
      setConversations(conversationsRecord);
    } finally {
      setLoading(false);
    }
  };

  // New helper function to fetch last messages for conversations
  const fetchLastMessagesForConversations = async (conversations: Record<string, DirectMessage>) => {
    try {
      const conversationIds = Object.keys(conversations);
      
      // Fetch last messages for each conversation in parallel
      await Promise.all(conversationIds.map(async (otherUserId) => {
        try {
          // Fetch last message
          const { data: messages } = await supabase
            .from('direct_messages')
            .select('content, created_at, sender_id')
            .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user?.id})`)
            .order('created_at', { ascending: false })
            .limit(1);

          if (messages && messages.length > 0) {
            conversations[otherUserId].last_message = {
              content: messages[0].content,
              created_at: messages[0].created_at,
              sender_id: messages[0].sender_id
            };
          }
          
          // Fetch unread count
          const { count: unreadCount } = await supabase
            .from('direct_messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', user?.id)
            .eq('sender_id', otherUserId)
            .eq('is_read', false);
            
          conversations[otherUserId].unread = unreadCount || 0;
        } catch (error) {
          console.log(`Error fetching messages for conversation ${otherUserId}:`, error);
        }
      }));
      
      setConversations(conversations);
      
      // Select conversation from URL if present
      if (conversationId && conversations[conversationId]) {
        setSelectedConversation(conversations[conversationId]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching last messages for conversations:', error);
      setConversations(conversations);
      setLoading(false);
    }
  };

  // Helper function to create sample event entries for demonstration
  const createSampleEvents = (): EventChat[] => {
    const now = new Date();
    return [
      {
        id: 'sample-event-1',
        title: 'Community Meetup',
        start_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        image_url: 'https://images.unsplash.com/photo-1511795409834-432f7b1d6574'
      },
      {
        id: 'sample-event-2',
        title: 'Tech Conference',
        start_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        image_url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94'
      },
      {
        id: 'sample-event-3',
        title: 'Networking Party',
        start_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        image_url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678'
      },
      {
        id: 'sample-event-4',
        title: 'Product Launch',
        start_date: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        image_url: 'https://images.unsplash.com/photo-1540317580384-e5d43867caa6'
      },
      {
        id: 'sample-event-5',
        title: 'Workshop: Advanced Skills',
        start_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978'
      }
    ];
  };

  // Save event attendances to localStorage for persistence
  const saveEventAttendancesToLocalStorage = (events: EventChat[]) => {
    try {
      localStorage.setItem('eventAttendances', JSON.stringify(events));
      console.log('Saved events to localStorage:', events);
    } catch (error) {
      console.error('Error saving events to localStorage:', error);
    }
  };

  // Helper function to fetch real user events from database
  const fetchEventChats = async () => {
    if (!user) return;

    try {
      // setEventLoading(true);
      
      // Try first to query directly
      try {
        console.log('DEBUG: Trying direct query approach for events');
        const { data: attendedEvents, error } = await supabase
        .from('event_attendees')
        .select(`
            *,
            events (
              id, title, description, start_date, category, location, is_public, created_by
            )
          `)
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Error fetching attended events:', error);
          throw error;
        }
        
        if (attendedEvents && attendedEvents.length > 0) {
          console.log('DEBUG: Found', attendedEvents.length, 'events user is attending');
          
          // Transform the nested data structure into EventChat format
          const formattedEvents: EventChat[] = attendedEvents.map(item => {
            const event = item.events;
            if (!event) return null;
            
            return {
              id: event.id,
              title: event.title,
              description: event.description,
              start_date: event.start_date,
              category: event.category,
              location: event.location,
              is_public: event.is_public
            };
          }).filter(Boolean) as EventChat[];
          
          if (formattedEvents.length > 0) {
            console.log('DEBUG: Processed', formattedEvents.length, 'valid events');
            
            // Fetch last message for each event
            const eventsWithMessages = await fetchEventMessages(formattedEvents);
            
            setEventChats(eventsWithMessages);
            saveEventAttendancesToLocalStorage(eventsWithMessages);
            // setEventLoading(false);
        return;
          }
        }
      } catch (directQueryError) {
        console.error('Error with direct query approach:', directQueryError);
      }
      
      // Fallback to try RPC function if direct query failed
      try {
        console.log('DEBUG: Trying RPC function for events');
        const { data: rpcEvents, error: rpcError } = await supabase
          .rpc('get_user_event_attendances', { p_user_id: user.id });
          
        if (rpcError) {
          console.error('RPC function error:', rpcError);
          throw rpcError;
        }
        
        if (rpcEvents && rpcEvents.length > 0) {
          console.log('DEBUG: RPC returned', rpcEvents.length, 'events');
          
          // Convert the RPC events to our EventChat format
          const formattedRpcEvents: EventChat[] = rpcEvents.map((event: any) => ({
            id: event.id,
            title: event.title,
            description: event.description,
            start_date: event.start_date,
            category: event.category,
            location: event.location,
            is_public: event.is_public,
            created_by: event.created_by
          }));
          
          // Fetch last message for each event
          const eventsWithMessages = await fetchEventMessages(formattedRpcEvents);
          
          setEventChats(eventsWithMessages);
          saveEventAttendancesToLocalStorage(eventsWithMessages);
          // setEventLoading(false);
          return;
        }
      } catch (rpcError) {
        console.error('Error with RPC function approach:', rpcError);
      }
      
      // If we're here, try to query the events table directly for events created by the user
      try {
        console.log('DEBUG: Trying to find events created by user');
        const { data: createdEvents, error: createdError } = await supabase
          .from('events')
          .select('*')
          .eq('created_by', user.id);
          
        if (createdError) {
          console.error('Error fetching created events:', createdError);
          throw createdError;
        }
        
        if (createdEvents && createdEvents.length > 0) {
          console.log('DEBUG: Found', createdEvents.length, 'events created by user');
          
          // Convert the events to our EventChat format
          const formattedCreatedEvents: EventChat[] = createdEvents.map((event: any) => ({
            id: event.id,
            title: event.title,
            description: event.description,
            start_date: event.start_date,
            category: event.category,
            location: event.location,
            is_public: event.is_public,
            created_by: event.created_by
          }));
          
          // Fetch last message for each event
          const eventsWithMessages = await fetchEventMessages(formattedCreatedEvents);
          
          setEventChats(eventsWithMessages);
          saveEventAttendancesToLocalStorage(eventsWithMessages);
          // setEventLoading(false);
          return;
        }
      } catch (createdEventsError) {
        console.error('Error with created events approach:', createdEventsError);
      }
      
      // If we get here, we couldn't find any real events - keep using sample events
      console.log('DEBUG: No real events found. Keeping sample events.');
      const sampleEvents = createSampleEvents();
      setEventChats(sampleEvents);
      saveEventAttendancesToLocalStorage(sampleEvents);
    } catch (error) {
      console.error('Error in fetchEventChats:', error);
      // Ensure we have sample events as fallback
      const sampleEvents = createSampleEvents();
      setEventChats(sampleEvents);
      saveEventAttendancesToLocalStorage(sampleEvents);
    } finally {
      // setEventLoading(false);
    }
  };
  
  // Helper function to fetch event messages
  const fetchEventMessages = async (events: EventChat[]): Promise<EventChat[]> => {
    try {
      const updatedEvents = [...events];
      
      // Fetch the last message for each event
      for (let i = 0; i < updatedEvents.length; i++) {
        try {
          // Skip sample events - they won't have real messages
          if (updatedEvents[i].id.startsWith('sample-')) continue;
          
          const { data: lastMessages, error } = await supabase
          .from('event_messages')
            .select('content, created_at, user_id, profiles:user_id (full_name, avatar_url)')
            .eq('event_id', updatedEvents[i].id)
          .order('created_at', { ascending: false })
          .limit(1);

          if (error) {
            console.error(`Error fetching messages for event ${updatedEvents[i].id}:`, error);
            continue;
          }

        if (lastMessages && lastMessages.length > 0) {
            const senderProfile = lastMessages[0].profiles as { full_name?: string, avatar_url?: string } | null;
            updatedEvents[i].last_message = {
            content: lastMessages[0].content,
            created_at: lastMessages[0].created_at,
              sender_id: lastMessages[0].user_id,
              sender_name: senderProfile?.full_name || 'Unknown User'
          };
          }
        } catch (messageError) {
          console.log(`Error processing messages for event ${updatedEvents[i].id}:`, messageError);
        }
      }

      console.log('DEBUG: Events with messages:', updatedEvents.length);
      return updatedEvents;
    } catch (error) {
      console.error('Error fetching event messages:', error);
      return events;
    }
  };

  const fetchUserGroups = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // First try to use RPC function if it exists
      try {
        const { data: membershipData, error: membershipError } = await supabase.rpc('get_user_group_memberships', {
          p_user_id: user.id
        });
        
        if (!membershipError && membershipData && membershipData.length > 0) {
          await processGroupMemberships(membershipData);
          return;
        }
        
        console.log('RPC method not available or returned no results, trying fallback method');
      } catch (rpcError) {
        console.log('RPC method failed, trying fallback method', rpcError);
      }
      
      // Fallback: Try direct query with safeguards against recursion
      const { data: localStorageGroups } = await getGroupsFromLocalStorage();
      
      if (localStorageGroups && localStorageGroups.length > 0) {
        console.log('Using groups from localStorage:', localStorageGroups);
        
        // Fetch group details for all localStorage groups
        const groupIds = localStorageGroups.map(g => g.group_id);
        
        const { data: groupDetails, error: groupsError } = await supabase
          .from('groups')
          .select('id, name, description, image_url, category, created_at, created_by')
          .in('id', groupIds);
        
        if (!groupsError && groupDetails && groupDetails.length > 0) {
          const processedGroups = groupDetails.map(group => {
            const membership = localStorageGroups.find(m => m.group_id === group.id);
            return {
              ...group,
              role: membership?.role || 'member'
            };
          });
          
          console.log('Fetched user groups from localStorage fallback:', processedGroups);
          setUserGroups(processedGroups);
          setLoading(false);
          return;
        }
      }
      
      // If we get here, no groups were found
      console.log('No group memberships found via any method');
      setUserGroups([]);
    } catch (error) {
      console.error('Error in fetchUserGroups:', error);
      toast.error('Failed to load your groups');
      setUserGroups([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to process group memberships
  const processGroupMemberships = async (membershipData: any[]) => {
    // Extract group IDs
    const groupIds = membershipData.map(membership => membership.group_id);
    
    // Now fetch the group details
    const { data: groupsData, error: groupsError } = await supabase
      .from('groups')
      .select('id, name, description, image_url, category, created_at, created_by')
      .in('id', groupIds);
    
    if (groupsError) {
      console.error('Error fetching group details:', groupsError);
      setUserGroups([]);
      return;
    }
    
    // Transform the data to include role information
    const processedGroups = (groupsData || []).map(group => {
      const membership = membershipData.find(m => m.group_id === group.id);
      return {
        ...group,
        role: membership?.role || 'member'
      };
    });
    
    console.log('Fetched user groups via processGroupMemberships:', processedGroups);
    setUserGroups(processedGroups);
  };
  
  // Helper function to get groups from localStorage
  const getGroupsFromLocalStorage = async () => {
    try {
      const groupMemberships = localStorage.getItem('groupMemberships');
      if (!groupMemberships) {
        return { data: [] };
      }
      
      const parsedMemberships = JSON.parse(groupMemberships);
      
      // Convert the object to an array of memberships
      const memberships = Object.entries(parsedMemberships).map(([group_id, details]: [string, any]) => ({
        group_id,
        role: details.role || 'member'
      }));
      
      return { data: memberships };
    } catch (error) {
      console.error('Error parsing localStorage group memberships:', error);
      return { data: [] };
    }
  };

  // Bu handleSendMessage fonksiyonu kullanılmıyor, DirectMessageChat'e mesaj gönderme işi devredildi
  // Ama gelecekte burada merkezi bir yönlendirme/işleme için tutulabilir
  /* 
  const handleSendMessage = async (content: string) => {
    // Mesaj gönderme işlemi...
  };
  */

  const handleDeleteConversation = async (conversationId: string) => {
    if (!user) return;

    try {
      // Mesajları sil
      const { error } = await supabase
        .from('direct_messages')
        .delete()
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${conversationId}),and(sender_id.eq.${conversationId},receiver_id.eq.${user.id})`);

      if (error) throw error;

      // UI'dan konuşmayı kaldır
      setConversations(prev => {
        const newConversations = { ...prev };
        delete newConversations[conversationId];
        return newConversations;
      });

      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }

      toast(t('messages.conversation_deleted') || 'Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast(t('messages.conversation_delete_error') || 'Could not delete conversation');
    }
  };

  const navigateToEventChat = (eventId: string) => {
    // Validate if eventId is a UUID unless it's a sample event (for fallback logic)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUuid = uuidRegex.test(eventId);
    const isSampleEvent = eventId.startsWith('sample-');
    
    if (!isValidUuid && !isSampleEvent) {
      console.error(`Invalid event ID format: ${eventId}`);
      toast.error(t('messages.invalid_event_id') || 'Invalid event ID format');
      return;
    }
    
    // Find the event in eventChats to make sure it exists and we have the correct data
    const eventExists = eventChats.find(event => event.id === eventId);
    
    if (!eventExists) {
      console.error(`Event not found: ${eventId}`);
      toast.error(t('messages.event_not_found') || 'Event not found');
      
      // Create a sample event for this ID if we must proceed
      if (isSampleEvent) {
        const sampleEvent = createSampleEvent(eventId);
        setEventChats(prev => [...prev, sampleEvent]);
        saveEventAttendancesToLocalStorage([...eventChats, sampleEvent]);
        navigate(`/events/${eventId}/chat`);
        return;
      }
      
        return;
      }
      
    // Debug log ID before navigation
    console.log(`Navigating to event chat, ID: ${eventId}, Title: ${eventExists.title}`);
    navigate(`/events/${eventId}/chat`);
  };

  // Helper to create a single event with a specific ID
  const createSampleEvent = (id: string): EventChat => {
    const now = new Date();
    return {
      id: id,
      title: `Event ${id.substring(0, 8)}`, // Create a shorter title from ID
      start_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      image_url: 'https://images.unsplash.com/photo-1511795409834-432f7b1d6574'
    };
  };

  const toggleFullScreen = () => {
    setIsFullScreen(prevState => !prevState);
  };

  /**
   * @unused Kept for future implementation
   */
  // const navigateToDirectChat = (userId: string) => {
  //   // Navigation logic
  // };

  // Add a function to fetch user profile when starting a new conversation
  const handleViewProfile = (userId: string) => {
    if (!userId) return;
    console.log("Navigating to profile:", userId);
    
    // Navigate to the user's profile
    navigate(`/profile/${userId}`);
  };
  
  // Function to mark messages as read
  const markMessagesAsRead = async (conversationId: string) => {
    if (!user || !conversationId) return;
    
    try {
      const { error } = await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', conversationId);
      
      if (error) {
        console.error("Error marking messages as read:", error);
        return;
      }
      
      // Update the unread count in the UI
      setConversations(prev => {
        const updated = { ...prev };
        if (updated[conversationId]) {
          updated[conversationId] = {
            ...updated[conversationId],
            unread: 0
          };
        }
        return updated;
      });
    } catch (err) {
      console.error("Error in markMessagesAsRead:", err);
    }
  };
  
  // Update useEffect to mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversation?.id) {
      markMessagesAsRead(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

  const navigateToGroupChat = (groupId: string) => {
    navigate(`/groups/${groupId}/chat`);
  };

  // Function to initialize default events when needed
  const initializeDefaultEvents = () => {
    // Check if events already exist in localStorage
    const storedEvents = localStorage.getItem('eventAttendances');
    if (storedEvents) {
      try {
        const parsedEvents = JSON.parse(storedEvents);
        if (Array.isArray(parsedEvents) && parsedEvents.length > 0) {
          console.log('Events already exist in localStorage:', parsedEvents.length);
          return; // Events already exist, no need to create defaults
        }
      } catch (error) {
        console.error('Error parsing localStorage events:', error);
      }
    }
    
    // If no events found, create and save default events
    console.log('Creating default events as none were found');
    const sampleEvents = createSampleEvents();
    saveEventAttendancesToLocalStorage(sampleEvents);
    setEventChats(sampleEvents);
  };

  // Add a useEffect to initialize events when component mounts
  useEffect(() => {
    if (user) {
      initializeDefaultEvents();
    }
  }, [user]);

  // Force load events directly without async processing
  // const forceLoadEvents = () => {
  //   fetchEventChats();
  // };

  if (loading && Object.keys(conversations).length === 0 && eventChats.length === 0 && userGroups.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        {/* Header section similar to other pages */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <FiMessageCircle className="mr-3 h-6 w-6" /> {t('messages.title') || 'Messages'}
          </h1>
        </div>
        
        <div className={`flex flex-col md:flex-row rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 h-[calc(100vh-12rem)] ${isFullScreen ? 'fixed inset-0 z-50 h-screen w-screen max-w-none rounded-none' : ''}`}>
          {/* Conversations List */}
          <div className={`w-full md:w-1/3 lg:w-1/4 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${isFullScreen || (isMobileView && (selectedConversation || selectedGroup || selectedEvent)) ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
            {/* Tabs for conversations types */}
            <Tabs
              defaultValue={activeTab}
              onValueChange={setActiveTab}
              className="flex-shrink-0"
            >
              <TabsList className="flex border-b border-gray-200 dark:border-gray-700">
                <TabsTrigger 
                  value="direct" 
                  active={activeTab} 
                  onSelect={(value) => {
                    console.log('DEBUG: Tab changed to DIRECT', value);
                    setActiveTab(value);
                  }} 
                  className="py-4 px-6 font-medium text-base focus:outline-none"
                >
                  {t('messages.tabs.direct') || 'Direct'}
                </TabsTrigger>
                <TabsTrigger 
                  value="groups" 
                  active={activeTab} 
                  onSelect={(value) => {
                    console.log('DEBUG: Tab changed to GROUPS', value);
                    setActiveTab(value);
                  }} 
                  className="py-4 px-6 font-medium text-base focus:outline-none"
                >
                  {t('messages.tabs.groups') || 'Groups'}
                </TabsTrigger>
                <TabsTrigger 
                  value="events" 
                  active={activeTab} 
                  onSelect={(value) => {
                    console.log('DEBUG: Tab changed to EVENTS', value);
                    setActiveTab(value);
                    // Force event fetch when tab is selected
                    if (value === "events") {
                      console.log('DEBUG: Forcing event fetch because tab was selected');
                      fetchEventChats(); 
                    }
                  }}
                  className="py-4 px-6 font-medium text-base focus:outline-none"
                >
                  {t('messages.tabs.events') || 'Events'}
                </TabsTrigger>
              </TabsList>

              {/* Direct Messages List */}
              <TabsContent value="direct" active={activeTab} className="flex-1 overflow-y-auto">
                {Object.keys(conversations).length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">{t('messages.no_direct_messages') || 'No direct messages yet'}</p>
                    <Link
                      to="/friends"
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-full text-sm font-medium text-white shadow-sm hover:shadow transition-all"
                    >
                      {t('messages.find_friends') || 'Find Friends'}
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {Object.values(conversations)
                      .sort((a, b) => {
                        if (!a.last_message && !b.last_message) return 0;
                        if (!a.last_message) return 1;
                        if (!b.last_message) return -1;
                        return new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime();
                      })
                      .map((conversation) => (
                        <ContextMenu key={conversation.id}>
                          <ContextMenuTrigger>
                            <div
                              className={`flex items-center p-4 cursor-pointer ${
                                selectedConversation?.id === conversation.id
                                  ? 'bg-indigo-50 dark:bg-indigo-900/30'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                              }`}
                              onClick={() => setSelectedConversation(conversation)}
                            >
                              <div className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 relative">
                                {conversation.other_user.avatar_url ? (
                                  <img
                                    src={conversation.other_user.avatar_url}
                                    alt={conversation.other_user.full_name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                                    <FiUser size={22} />
                                  </div>
                                )}
                              </div>
                              <div className="ml-3 flex-1 overflow-hidden">
                                <div className="flex justify-between items-baseline">
                                  <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                                    {conversation.other_user.full_name}
                                  </h3>
                                  {conversation.last_message && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(conversation.last_message.created_at).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                  {conversation.last_message
                                    ? conversation.last_message.sender_id === user?.id
                                      ? `${t('messages.you')}: ${conversation.last_message.content}`
                                      : conversation.last_message.content
                                    : t('messages.no_messages_yet')}
                                </p>
                              </div>
                              {conversation.unread && conversation.unread > 0 && (
                                <div className="ml-2 bg-indigo-600 text-white text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center">
                                  {conversation.unread}
                                </div>
                              )}
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem 
                              onClick={() => handleViewProfile(conversation.other_user.id)}
                            >
                              <FiUser className="mr-2 h-4 w-4" />
                              {t('messages.view_profile') || 'View Profile'}
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <FiBell className="mr-2 h-4 w-4" />
                              {t('messages.mute_notifications') || 'Mute Notifications'}
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <FiVolumeX className="mr-2 h-4 w-4" />
                              {t('messages.block_user') || 'Block User'}
                            </ContextMenuItem>
                            <ContextMenuItem 
                              onClick={() => handleDeleteConversation(conversation.id)}
                            >
                              <FiTrash2 className="mr-2 h-4 w-4" />
                              {t('messages.delete_conversation') || 'Delete Conversation'}
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      ))}
                  </div>
                )}
              </TabsContent>

              {/* Groups and Events Tabs (Keep the same content) */}
              <TabsContent value="groups" active={activeTab} className="flex-1 overflow-y-auto">
                {userGroups.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">{t('messages.no_group_chats') || 'You are not a member of any groups yet'}</p>
                    <Link
                      to="/groups"
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 rounded-full text-sm font-medium text-white shadow-sm hover:shadow transition-all"
                    >
                    {t('messages.browse_groups') || 'Browse Groups'}
                  </Link>
                </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {userGroups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        onClick={() => navigateToGroupChat(group.id)}
                      >
                        <div className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                          {group.image_url ? (
                            <img
                              src={group.image_url}
                              alt={group.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                              <FiUsers size={22} />
                            </div>
                          )}
                        </div>
                        <div className="ml-3 flex-1 overflow-hidden">
                          <div className="flex justify-between items-baseline">
                            <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                              {group.name}
                            </h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {group.role === 'admin' ? t('messages.admin') || 'Admin' : t('messages.member') || 'Member'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {group.description || t('messages.no_description') || 'No description'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="events" active={activeTab} className="flex-1 overflow-y-auto">
                {/* Debug bilgileri */}
                {(() => { console.log('DEBUG: Inside Events TabsContent render, activeTab:', activeTab, 'eventChats:', eventChats); return null; })()}
                {eventChats.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      {t('messages.no_event_chats') || 'No event chats yet'} 
                      (Debug info: activeTab={activeTab}, eventChats.length={eventChats.length})
                    </p>
                    <button 
                      onClick={() => {
                        console.log('DEBUG: Force fetch clicked');
                        fetchEventChats();
                      }}
                      className="inline-flex items-center mb-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-full text-sm font-medium text-white shadow-sm hover:shadow transition-all"
                    >
                      Olayları Yenile
                    </button>
                    <Link
                      to="/events"
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 rounded-full text-sm font-medium text-white shadow-sm hover:shadow transition-all"
                    >
                      {t('messages.browse_events') || 'Browse Events'}
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 flex justify-between items-center">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {t('messages.your_events') || 'Your Events'} ({eventChats.length})
                      </h3>
                      <button 
                        onClick={() => {
                          console.log('DEBUG: Refresh events button clicked');
                          fetchEventChats();
                        }}
                        className="p-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {t('messages.refresh') || 'Refresh'}
                      </button>
                    </div>

                    {eventChats.map((event) => (
                      <div
                        key={event.id}
                        className={`flex items-center p-4 cursor-pointer ${
                          selectedEvent?.id === event.id
                            ? 'bg-indigo-50 dark:bg-indigo-900/30'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                        onClick={() => navigateToEventChat(event.id)}
                      >
                        <div className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                          {event.image_url ? (
                            <img
                              src={event.image_url}
                              alt={event.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-rose-500 to-red-600 text-white">
                              <FiCalendar size={22} />
                            </div>
                          )}
                        </div>
                        <div className="ml-3 flex-1 overflow-hidden">
                          <div className="flex justify-between items-baseline">
                            <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                              {event.title}
                            </h3>
                            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                              {new Date(event.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center">
                            <FiCalendar className="mr-1 h-3 w-3" />
                            {new Date(event.start_date).toLocaleDateString(undefined, { 
                              weekday: 'long',
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {event.last_message && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic truncate">
                              {event.last_message.content}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Chat Area or Empty State - Adjust flex and visibility */}
          <div className={`flex flex-col flex-1 bg-white dark:bg-gray-800 ${isMobileView && !selectedConversation && !selectedGroup && !selectedEvent ? 'hidden md:flex' : 'flex'}`}>
            {/* Back button for mobile view */}
            {isMobileView && (selectedConversation || selectedGroup || selectedEvent) && (
              <div className="flex items-center p-3 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setSelectedConversation(null);
                    setSelectedGroup(null);
                    setSelectedEvent(null);
                    navigate('/messages');
                  }}
                  className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FiChevronLeft size={20} />
                </button>
              </div>
            )}

            {/* Message Area */}
            {selectedConversation ? (
              <div className="flex flex-col h-full">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mr-3">
                      {selectedConversation.other_user.avatar_url ? (
                        <img
                          src={selectedConversation.other_user.avatar_url}
                          alt={selectedConversation.other_user.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                          <FiUser size={18} />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedConversation.other_user.full_name}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Full-screen toggle button */}
                    <button
                      onClick={toggleFullScreen}
                      className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      aria-label={isFullScreen ? (t('messages.exit_fullscreen') || "Exit full screen") : (t('messages.enter_fullscreen') || "Full screen")}
                    >
                      {isFullScreen ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
                      )}
                    </button>
                    
                    {/* Settings button with context menu */}
                    <ContextMenu>
                      <ContextMenuTrigger>
                        <button
                          className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          aria-label={t('messages.settings') || 'Message Settings'}
                        >
                          <FiMoreVertical size={20} />
                        </button>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem 
                          onClick={() => handleViewProfile(selectedConversation.other_user.id)}
                        >
                          <FiUser className="mr-2 h-4 w-4" />
                          {t('messages.view_profile') || 'View Profile'}
                        </ContextMenuItem>
                        <ContextMenuItem>
                          <FiBell className="mr-2 h-4 w-4" />
                          {t('messages.mute_notifications') || 'Mute Notifications'}
                        </ContextMenuItem>
                        <ContextMenuItem>
                          <FiVolumeX className="mr-2 h-4 w-4" />
                          {t('messages.block_user') || 'Block User'}
                        </ContextMenuItem>
                        <ContextMenuItem 
                          onClick={() => handleDeleteConversation(selectedConversation.id)}
                        >
                          <FiTrash2 className="mr-2 h-4 w-4" />
                          {t('messages.delete_conversation') || 'Delete Conversation'}
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  </div>
                </div>
                
                {/* Direct Messages */}
                <DirectMessageChat 
                  conversationId={selectedConversation.id} 
                  otherUserId={selectedConversation.other_user.id}
                  otherUserName={selectedConversation.other_user.full_name}
                  otherUserAvatar={selectedConversation.other_user.avatar_url || undefined}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <div className="w-24 h-24 mb-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <FiMessageCircle size={40} className="text-gray-400 dark:text-gray-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {t('messages.select_conversation') || 'Select a conversation'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                  {t('messages.select_conversation_description') || 'Choose a conversation from the list or start a new one from the Friends page'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;