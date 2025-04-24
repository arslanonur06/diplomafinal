import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FiMessageCircle, FiUsers, FiCalendar } from 'react-icons/fi';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useLanguage } from '../contexts/LanguageContext';

interface GroupChat {
  id: string;
  groupName: string;
  groupImage?: string;
  memberCount: number;
  lastMessage: {
    id: string;
    content: string;
    timestamp: string;
    user: {
      full_name: string;
      avatar_url?: string;
    } | null;
  } | null;
  unreadCount: number;
}

interface EventChat {
  id: string;
  eventName: string;
  eventImage?: string;
  eventStart: string;
  eventEnd?: string;
  attendeeCount: number;
  lastMessage: {
    id: string;
    content: string;
    timestamp: string;
    user: {
      full_name: string;
      avatar_url?: string;
    } | null;
  } | null;
  unreadCount: number;
}

type Chat = GroupChat | EventChat;

// Updated interface to match both the database response and usage
// This interface is used in the code for checking the data structure
interface LastMessageData {
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  } | null;
}

// Interface for the transformed message format
interface FormattedLastMessage {
  content: string;
  created_at: string;
  user_name: string;
}

const ChatGroupsPage: React.FC = () => {
  const { tWithTemplate: t } = useLanguage();
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchChats = async () => {
      try {
        setLoading(true);
        
        // Fetch groups the user is a member of
        const groupChats = await fetchGroupChats();
        
        // Fetch events the user is attending
        const eventChats = await fetchEventChats();
        
        // Combine and sort chats by last message time (most recent first)
        const allChats = [...groupChats, ...eventChats].sort((a, b) => {
          const aTime = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
          const bTime = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
          return bTime - aTime;
        });
        
        setChats(allChats);
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching chats');
        console.error('Error fetching chats:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChats();
  }, [user]);
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const fetchGroupChats = async (): Promise<GroupChat[]> => {
    try {
      // Get user's group memberships - UPDATED TABLE NAME
      const { data: groupMembers, error: memberError } = await supabase
        .from('chat_group_members')
        .select('group_id')
        .eq('user_id', user?.id || '');

      if (memberError) {
        console.error('Error fetching group memberships:', memberError);
        return [];
      }

      if (!groupMembers || groupMembers.length === 0) {
        return [];
      }

      // Get group information for all group memberships - UPDATED TABLE NAME
      const groupIds = groupMembers.map(member => member.group_id);
      const { data: groups, error: groupError } = await supabase
        .from('chat_groups')
        .select(`
          id,
          name,
          description,
          avatar_url,
          created_at,
          created_by,
          updated_at
        `)
        .in('id', groupIds);

      if (groupError) {
        console.error('Error fetching groups:', groupError);
        return [];
      }

      // Get last message for each group
      const groupChats: GroupChat[] = await Promise.all(
        (groups || []).map(async (group) => {
          try {
            // Count members in the group - UPDATED TABLE NAME
            const { count: membersCount, error: countError } = await supabase
              .from('chat_group_members')
              .select('id', { count: 'exact', head: true })
              .eq('group_id', group.id);

            if (countError) {
              console.error(`Error counting members for group ${group.id}:`, countError);
            }

            // Get last message for the group - UPDATED TABLE NAME and QUERY APPROACH
            // Using separate queries to avoid recursion issues
            const { data: messages, error: messageError } = await supabase
              .from('chat_messages')
              .select('id, content, created_at, user_id')
              .eq('group_id', group.id)
              .order('created_at', { ascending: false })
              .limit(1);

            if (messageError) {
              console.error(`Error fetching last message for group ${group.id}:`, messageError);
            }

            let lastMessage = null;
            if (messages && messages.length > 0) {
              const message = messages[0];
              // Get user profile for the message author
              if (message.user_id) {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('full_name, avatar_url')
                  .eq('id', message.user_id)
                  .single();

                lastMessage = {
                  id: message.id,
                  content: message.content,
                  timestamp: message.created_at,
                  user: profileData || null
                };
              }
            }

            // Get unread count
            const { count: unreadCount, error: unreadError } = await supabase
              .from('chat_messages')
              .select('id', { count: 'exact', head: true })
              .eq('group_id', group.id)
              .eq('is_read', false)
              .neq('user_id', user?.id || '');

            if (unreadError) {
              console.error(`Error counting unread messages for group ${group.id}:`, unreadError);
            }

            // Return group chat with last message
            return {
              id: group.id,
              groupName: group.name,
              groupImage: group.avatar_url,
              memberCount: membersCount || 0,
              lastMessage: lastMessage,
              unreadCount: unreadCount || 0
            };
          } catch (err) {
            console.error(`Error processing group ${group.id}:`, err);
            return {
              id: group.id,
              groupName: group.name,
              groupImage: group.avatar_url,
              memberCount: 0,
              lastMessage: null,
              unreadCount: 0
            };
          }
        })
      );

      return groupChats;
    } catch (error) {
      console.error('Error in fetchGroupChats:', error);
      return [];
    }
  };

  const fetchEventChats = async (): Promise<EventChat[]> => {
    try {
      // Get events the user is attending
      const { data: eventAttendees, error: attendeeError } = await supabase
        .from('event_attendees')
        .select('event_id')
        .eq('user_id', user?.id || '');

      if (attendeeError) {
        console.error('Error fetching event attendees:', attendeeError);
        return [];
      }

      if (!eventAttendees || eventAttendees.length === 0) {
        return [];
      }

      // Get event information for all attendances
      const eventIds = eventAttendees.map(attendee => attendee.event_id);
      const { data: events, error: eventError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          banner_url,
          start_date,
          end_date
        `)
        .in('id', eventIds);

      if (eventError) {
        console.error('Error fetching events:', eventError);
        return [];
      }

      // Get last message for each event
      const eventChats: EventChat[] = await Promise.all(
        (events || []).map(async (event) => {
          try {
            // Count attendees for the event
            const { count: attendeeCount, error: countError } = await supabase
              .from('event_attendees')
              .select('id', { count: 'exact', head: true })
              .eq('event_id', event.id);

            if (countError) {
              console.error(`Error counting attendees for event ${event.id}:`, countError);
            }

            // Get last message for the event using separate queries to avoid recursion
            const { data: messages, error: messageError } = await supabase
              .from('event_messages')
              .select('id, content, created_at, user_id')
              .eq('event_id', event.id)
              .order('created_at', { ascending: false })
              .limit(1);

            if (messageError) {
              console.error(`Error fetching last message for event ${event.id}:`, messageError);
            }

            let lastMessage = null;
            if (messages && messages.length > 0) {
              const message = messages[0];
              // Get user profile for the message author
              if (message.user_id) {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('full_name, avatar_url')
                  .eq('id', message.user_id)
                  .single();

                lastMessage = {
                  id: message.id,
                  content: message.content,
                  timestamp: message.created_at,
                  user: profileData || null
                };
              }
            }

            // Get unread count
            const { count: unreadCount, error: unreadError } = await supabase
              .from('event_messages')
              .select('id', { count: 'exact', head: true })
              .eq('event_id', event.id)
              .eq('is_read', false)
              .neq('user_id', user?.id || '');

            if (unreadError) {
              console.error(`Error counting unread messages for event ${event.id}:`, unreadError);
            }

            // Return event chat with last message
            return {
              id: event.id,
              eventName: event.title,
              eventImage: event.banner_url,
              eventStart: event.start_date,
              eventEnd: event.end_date,
              attendeeCount: attendeeCount || 0,
              lastMessage: lastMessage,
              unreadCount: unreadCount || 0
            };
          } catch (err) {
            console.error(`Error processing event ${event.id}:`, err);
            return {
              id: event.id,
              eventName: event.title,
              eventImage: event.banner_url,
              eventStart: event.start_date,
              eventEnd: event.end_date,
              attendeeCount: 0,
              lastMessage: null,
              unreadCount: 0
            };
          }
        })
      );

      return eventChats;
    } catch (error) {
      console.error('Error in fetchEventChats:', error);
      return [];
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 text-center sm:text-left">{t('chats.title')}</h1>
      
      {chats.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">{t('chats.no_chats')}</p>
          <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/groups" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <FiUsers className="inline mr-2" />
              {t('chats.find_groups')}
            </Link>
            <Link to="/events" className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700">
              <FiCalendar className="inline mr-2" />
              {t('chats.browse_events')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {chats.map((chat) => {
            const isGroupChat = 'groupName' in chat;
            const chatName = isGroupChat ? chat.groupName : chat.eventName;
            const chatImage = isGroupChat ? chat.groupImage : chat.eventImage;
            const memberCount = isGroupChat ? chat.memberCount : chat.attendeeCount;
            const chatLink = isGroupChat ? `/group-chat/${chat.id}` : `/event-chat/${chat.id}`;
            
            return (
              <Link 
                key={`${isGroupChat ? 'group' : 'event'}-${chat.id}`}
                to={chatLink}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    {chatImage ? (
                      <img 
                        src={chatImage} 
                        alt={chatName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                        <FiMessageCircle size={24} />
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {chatName}
                      </h3>
                      {chat.lastMessage && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                          {formatTime(chat.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-xs">
                        {chat.lastMessage ? (
                          <>
                            {chat.lastMessage.user ? (
                              <span className="font-medium">{chat.lastMessage.user.full_name}: </span>
                            ) : (
                              <span className="font-medium">Unknown: </span>
                            )}
                            {chat.lastMessage.content}
                          </>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400 italic">
                            {isGroupChat ? t('chats.no_group_messages') : t('chats.no_event_messages')}
                          </span>
                        )}
                      </p>
                      
                      <div className="flex items-center space-x-3">
                        {chat.unreadCount > 0 && (
                          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-rose-500 text-white text-xs font-medium">
                            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                          </span>
                        )}
                        
                        <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <FiUsers className="mr-1" size={14} />
                          {memberCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChatGroupsPage;
