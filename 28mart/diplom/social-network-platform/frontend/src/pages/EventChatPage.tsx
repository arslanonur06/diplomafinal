import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { format } from 'date-fns';
import { FiArrowLeft, FiSend, FiUsers, FiEdit, FiTrash, FiCalendar, FiMoreVertical, FiX } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface EventInfo {
  id: string;
  title: string;
  start_date: string;
  description?: string;
  location?: string;
  attendee_count?: number;
}

// Define the structure for event attendees (similar to GroupMember)
interface EventAttendee {
    user_id: string;
    profiles: {
        full_name: string;
        avatar_url: string | null;
    } | null;
}

// MODIFIED: MessageItem Component with Telegram-like styling
const MessageItem: React.FC<{ message: Message; currentUserId: string | undefined }> = React.memo(({ message, currentUserId }) => {
  const isCurrentUser = message.user_id === currentUserId;
  const profile = message.profiles;
  const avatar = profile?.avatar_url || '/default-avatar.png';
  const name = profile?.full_name || 'Unknown User';

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'p'); // Format as 'h:mm a'
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Invalid Date";
    }
  };

  return (
    // Align message group left or right
    <div className={`flex items-end ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-2`}>
      {/* Avatar for received messages */}
      {!isCurrentUser && (
        <img src={avatar} alt={name} className="h-6 w-6 rounded-full flex-shrink-0 mr-2 mb-1 self-start border border-gray-200 dark:border-gray-600" />
      )}
      
      {/* Message Bubble Container */}  
      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-xs sm:max-w-md lg:max-w-lg`}>
        {/* Sender Name for received messages */}  
        {!isCurrentUser && profile && (
          <span className="text-xs font-medium mb-0.5 text-rose-600 dark:text-rose-400 ml-1">
            {name}
          </span>
        )}
        
        {/* Message Bubble */}  
        <div 
          className={`px-3 py-2 shadow-sm break-words ${ 
            isCurrentUser 
            ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-t-lg rounded-bl-lg' // Sent style (using event theme colors)
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-t-lg rounded-br-lg' // Received style
          }`}
        >
          {/* Message Content */}  
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          {/* Timestamp */}  
          <span 
            className={`text-[10px] mt-1 ${isCurrentUser ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'} ${isCurrentUser ? 'text-right' : 'text-left'} block`}
          >
            {formatTimestamp(message.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
});
MessageItem.displayName = 'MessageItem';


const EventChatPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState<number>(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch event details (keep description/location for modal)
  const fetchEvent = async (id: string) => {
    try {
      // Validate sample events (handle them specially)
      if (id.startsWith('sample-')) {
        console.log(`Loading sample event with ID: ${id}`);
        const sampleEvent = {
          id: id,
          title: `Sample Event ${id.split('-')[1] || 'Unknown'}`,
          start_date: new Date().toISOString(),
          description: 'This is a sample event for demonstration purposes.',
          location: 'Online'
        };
        
        setEventInfo(sampleEvent as EventInfo);
        return sampleEvent;
      }
      
      // Validate if eventId is a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUuid = uuidRegex.test(id);
      
      if (!isValidUuid) {
        console.error(`EventId is not a valid UUID: ${id}`);
        // Create a fallback event instead of throwing an error
        const shortId = id.substring(0, 8);
        const fallbackEvent = {
          id: id,
          title: `${t('events.title')} ${shortId}`,
          start_date: new Date().toISOString(),
          description: t('event_chat.error_event_not_found'),
          location: t('event_chat.unknown_location') || 'Unknown'
        };
        setEventInfo(fallbackEvent as EventInfo);
        return fallbackEvent;
      }

      // Try direct fetch first with more debugging
      console.log(`Fetching event with ID: ${id}`);
      
      // First attempt: direct fetch using * to get all fields
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // Use maybeSingle to get either an object or null
      
      if (error) {
        console.error(`Database error in direct fetch: ${error.message}`);
        // Don't throw, try other methods
      }
      
      // Check if we got a result
      if (data) {
        console.log('Successfully fetched event:', data);
        const eventInfo: EventInfo = {
          id: data.id,
          title: data.title,
          start_date: data.start_date || data.start_time || new Date().toISOString(), // Handle different date formats
          description: data.description,
          location: data.location
        };
        setEventInfo(eventInfo);
        return eventInfo;
      }
      
      console.log(`No event found with direct ID match: ${id}, trying other queries`);
      
      // Second attempt: Try with a different column name (some tables use event_id)
      const { data: eventByOtherId, error: otherIdError } = await supabase
        .from('events')
        .select('*')
        .or(`event_id.eq.${id},uuid.eq.${id}`) // Try alternative column names
        .maybeSingle();
        
      if (!otherIdError && eventByOtherId) {
        console.log('Found event using alternative ID column:', eventByOtherId);
        const eventInfo: EventInfo = {
          id: eventByOtherId.id || id,
          title: eventByOtherId.title,
          start_date: eventByOtherId.start_date || eventByOtherId.start_time || new Date().toISOString(),
          description: eventByOtherId.description,
          location: eventByOtherId.location
        };
        setEventInfo(eventInfo);
        return eventInfo;
      }
      
      // Third attempt: try searching through event_attendees
      const { data: eventAttendees, error: attendeesError } = await supabase
        .from('event_attendees')
        .select(`
          event_id,
          events:events (
            id, title, start_date, description, location
          )
        `)
        .eq('event_id', id)
        .limit(1); 
        
      if (!attendeesError && eventAttendees && eventAttendees.length > 0) {
        console.log('Found event through attendance:', eventAttendees[0]);
        // Check if we have event data and that it's properly structured
        if (eventAttendees[0].events && typeof eventAttendees[0].events === 'object') {
          // Extract event data correctly - it can be either an object or an array depending on the query
          const eventData = Array.isArray(eventAttendees[0].events) 
            ? eventAttendees[0].events[0] 
            : eventAttendees[0].events;
            
          if (eventData && eventData.id) {
            const eventInfo: EventInfo = {
              id: eventData.id,
              title: eventData.title || `Event ${id.substring(0, 8)}`,
              start_date: eventData.start_date || new Date().toISOString(),
              description: eventData.description || 'No description available',
              location: eventData.location || 'No location specified'
            };
            setEventInfo(eventInfo);
            return eventInfo;
          }
        }
      }
      
      // If we get here, we really couldn't find the event - create a fallback
      console.log(`Creating fallback event for ID: ${id}`);
      const shortId = id.substring(0, 8);
      const fallbackEvent = {
        id: id,
        title: `${t('events.title')} ${shortId}`,
        start_date: new Date().toISOString(),
        description: t('event_chat.error_event_not_found'),
        location: t('event_chat.unknown_location') || 'Unknown'
      };
      setEventInfo(fallbackEvent as EventInfo);
      setError('Error loading event details. Using fallback information.');
      return fallbackEvent;
      
    } catch (err: any) {
      console.error("Error in fetchEvent:", err);
      // Create a fallback event instead of breaking the UI
      const shortId = id.substring(0, 8);
      const fallbackEvent = {
        id: id,
        title: `${t('events.title')} ${shortId}`,
        start_date: new Date().toISOString(),
        description: t('event_chat.error_event_not_found'),
        location: t('event_chat.unknown_location') || 'Unknown'
      };
      setEventInfo(fallbackEvent as EventInfo);
      setError('Error loading event details. Using fallback information.');
      return fallbackEvent;
    }
  };

  // Fetch initial event info, messages, AND attendee count
  const fetchEventData = useCallback(async () => {
    if (!eventId || !user) return;
    setLoading(true);
    setError(null);

    try {
        // Fetch event details first (handles both sample and real events)
        await fetchEvent(eventId);
        
        // Skip other DB queries for sample events, just use sample data
        if (eventId.startsWith('sample-')) {
            setMessages([]);
            setAttendeeCount(Math.floor(Math.random() * 20) + 5); // Random number for demo
            setLoading(false);
            return;
        }

        // For real events - fetch messages and attendee count
        console.log(`Fetching messages for event: ${eventId}`);
        try {
            const { data: messagesData, error: messagesError } = await supabase
                .from('event_messages')
                .select(`*, profiles:user_id (full_name, avatar_url)`)
                .eq('event_id', eventId)
                .order('created_at', { ascending: true })
                .limit(50);
    
            if (messagesError) {
                console.error(`Error fetching messages: ${messagesError.message}`);
                // Don't throw, just log the error and continue
            } else {
                setMessages((messagesData as Message[]) || []);
                console.log(`Fetched ${messagesData?.length || 0} messages for event ${eventId}`);
            }
        } catch (msgErr) {
            console.error("Error fetching messages:", msgErr);
            // Set empty messages but don't break the whole component
            setMessages([]);
        }
        
        // Fetch attendee count separately for the header
        try {
            console.log(`Fetching attendee count for event: ${eventId}`);
            const { count, error: countError } = await supabase
                .from('event_attendees')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', eventId)
                .in('status', ['going', 'interested', null]); // Include null status to count all attendees
    
            if (countError) {
                console.error(`Error fetching attendee count: ${countError.message}`);
                // Don't throw, set a default count
                setAttendeeCount(0);
            } else {
                console.log(`Found ${count || 0} attendees for event ${eventId}`);
                // Statik bir sayı ata, sürekli güncelleme yapmadan
                const finalCount = count ?? 0;
                if (attendeeCount !== finalCount) {
                    setAttendeeCount(finalCount);
                }
            }
        } catch (countErr) {
            console.error("Error fetching attendee count:", countErr);
            // Set default attendee count
            setAttendeeCount(0);
        }
    } catch (err: any) {
        console.error("Error fetching event data:", err);
        setError(err.message || 'Failed to load event chat.');
        // Ensure we have at least basic event info
        if (!eventInfo) {
            setEventInfo({
                id: eventId,
                title: `Event ${eventId.substring(0, 8)}...`,
                start_date: new Date().toISOString(),
                description: 'Event information unavailable.',
                location: 'Unknown'
            });
        }
    } finally {
        setLoading(false);
    }
}, [eventId, user]); // Bağımlılıklardan eventInfo'yu çıkarıyoruz

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time message subscription
  useEffect(() => {
    if (!eventId) return;
    
    // Skip real-time subscription for sample events
    if (eventId.startsWith('sample-')) {
      return;
    }

    const channel = supabase
      .channel(`event_chat:${eventId}`)
      .on<Message>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_messages',
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          console.log('New message received:', payload);
          
          // Kendi gönderdiğimiz mesajları zaten eklemiş olduğumuz için,
          // sadece başkalarından gelen mesajları ekle
          if (payload.new && payload.new.user_id !== user?.id) {
            // Profil bilgisi al
            const { data: messageWithProfile, error: profileError } = await supabase
              .from('event_messages')
              .select(`
                *,
                profiles:user_id (
                  full_name,
                  avatar_url
                )
              `)
              .eq('id', payload.new.id)
              .single();
            
            if (profileError) {
              console.error("Error fetching profile for new message:", profileError);
              // Profil bilgisi olmadan da ekle, ama doğru formatta
              const basicMessage: Message = {
                ...payload.new as any,
                profiles: null
              };
              setMessages(prev => [...prev, basicMessage]); 
            } else if (messageWithProfile) {
              // Önce biçimlendir, sonra Message olarak ekle
              const formattedMessage: Message = {
                id: messageWithProfile.id,
                content: messageWithProfile.content,
                created_at: messageWithProfile.created_at,
                user_id: messageWithProfile.user_id,
                profiles: Array.isArray(messageWithProfile.profiles) && messageWithProfile.profiles.length > 0 
                  ? {
                      full_name: messageWithProfile.profiles[0].full_name || '',
                      avatar_url: messageWithProfile.profiles[0].avatar_url || null
                    }
                  : null
              };
              setMessages(prev => [...prev, formattedMessage]);
              scrollToBottom();
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to event chat ${eventId}`);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`Subscription error: ${status}`, err);
            setError('Connection error. Real-time updates may be unavailable.');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
      console.log(`Unsubscribed from event chat ${eventId}`);
    };
  }, [eventId, user]);


  // Handle sending new messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || sending) return;
    
    try {
      setSending(true);
      
      // Prepare message data
      const messageData = {
        id: `temp-${Date.now()}`, // Temporary ID until we get the real one from the server
        event_id: eventId,
        user_id: user.id,
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        profiles: user.user_metadata ? {
          full_name: user.user_metadata.full_name || user.email?.split('@')[0] || 'User',
          avatar_url: user.user_metadata.avatar_url || null
        } : null
      };
      
      // Add message to UI immediately for instant feedback
      setMessages(prev => [...prev, messageData as Message]);
      
      // Clear the message input right away
      setNewMessage('');
      
      // Scroll to bottom after sending
      scrollToBottom();
      
      // For sample events, keep it in local state only
      if (eventId && eventId.startsWith('sample-')) {
        // No database operation needed for sample events
        setSending(false);
        return;
      }
      
      // Create a new event message in the database for real events
      const { data: insertedData, error } = await supabase
        .from('event_messages')
        .insert({
          event_id: eventId,
          user_id: user.id,
          content: messageData.content,
          created_at: messageData.created_at,
        })
        .select();
      
      if (error) throw error;
      
      // Update the temporary message with the real one from the database if needed
      if (insertedData && insertedData.length > 0) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageData.id
              ? { ...msg, id: insertedData[0].id }
              : msg
          )
        );
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(t('event_chat.error_sending_message'));
      // Remove the temporary message if sending failed
      setMessages(prev => prev.filter(msg => msg.id !== `temp-${Date.now()}`));
    } finally {
      setSending(false);
    }
  };

  // Fetch Event Attendees (Members)
  const fetchEventAttendees = useCallback(async () => {
    if (!eventId || !showAttendeesModal) return; // Sadece modal açıkken çağrılsın
    
    try {
        // For sample events, generate fake attendees
        if (eventId.startsWith('sample-')) {
            const fakeAttendees: EventAttendee[] = [
                {
                    user_id: 'sample-user-1',
                    profiles: {
                        full_name: 'Sample User 1',
                        avatar_url: null
                    }
                },
                {
                    user_id: 'sample-user-2',
                    profiles: {
                        full_name: 'Sample User 2',
                        avatar_url: null
                    }
                },
                {
                    user_id: 'sample-user-3',
                    profiles: {
                        full_name: 'Sample User 3',
                        avatar_url: null
                    }
                }
            ];
            
            setAttendees(fakeAttendees);
            return;
        }
        
        // Type for the profile object expected within the array
        type ProfileObject = { full_name: string | null; avatar_url: string | null };
        // Type for the raw item structure fetched from event_attendees (profiles is now an array)
        type RawAttendeeItem = { user_id: string; profiles: ProfileObject[] | null }; // Profiles is an array or null

        const { data, error } = await supabase
        .from('event_attendees')
            .select(`
                user_id,
                profiles:user_id (
                    full_name,
                    avatar_url
                )
            `)
            .eq('event_id', eventId)
            .in('status', ['going', 'interested', null]);

        if (error) throw error;

        // Map the raw data, asserting the type of each item via unknown
        const attendeesData: EventAttendee[] = (data || []).map((rawItem: unknown) => {
            const item = rawItem as RawAttendeeItem;
            // Get the first profile from the array, or null if the array is empty/null
            const profile = item.profiles && Array.isArray(item.profiles) && item.profiles.length > 0
                ? {
                    full_name: item.profiles[0].full_name || 'Unknown User',
                    avatar_url: item.profiles[0].avatar_url
                }
                : null;
                
            return {
                user_id: item.user_id,
                profiles: profile
            };
        });

        setAttendees(attendeesData);
        
    } catch (error) {
        console.error('Error fetching event attendees:', error);
        // Sadece hata durumunda boş bir dizi ata
        setAttendees([]);
    }
}, [eventId, showAttendeesModal]); // eventInfo'yu bağımlılıklardan çıkar, showAttendeesModal ekle

// Modal açıldığında katılımcıları getir
useEffect(() => {
    if (showAttendeesModal) {
        fetchEventAttendees();
    }
}, [showAttendeesModal, fetchEventAttendees]);
  
  const toggleFullScreen = () => {
    setIsFullScreen(prevState => !prevState);
  };

  if (loading && !eventInfo) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (error && !eventInfo) { // Show full page error if event info failed to load
    return (
      <div className="p-4">
          <Link to="/events" className="text-rose-600 hover:underline mb-4 inline-block">
              <FiArrowLeft className="inline mr-1" /> Back to Events
          </Link>
          <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        <div className={`flex flex-col rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 h-[calc(100vh-12rem)] ${isFullScreen ? 'fixed inset-0 z-50 h-screen w-screen max-w-none p-0 rounded-none' : ''}`}>
          {/* Header - MODIFIED Structure and Styling for better mobile experience */}
          <header className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            {/* Adjusted padding and spacing for mobile */}
            <div className="w-full mx-auto px-3 py-2 flex items-center justify-between space-x-3"> 
              {/* Back Button - Made more mobile friendly */}
              <Link 
                to="/messages" 
                className="flex-shrink-0 text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-500 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label={t('event_chat.back_to_messages')}
              >
                <FiArrowLeft size={20} />
              </Link>
              
              {/* Event Info - Simplified for mobile*/}
              <div className="flex flex-col min-w-0">
                <h1 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white truncate">
                  {eventInfo?.title || t('event_chat.loading')}
                </h1>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <span>
                    {attendeeCount} {t('event_chat.attendees')}
                  </span>
                  {eventInfo?.start_date && (
                    <span className="ml-2">• {format(new Date(eventInfo.start_date), 'dd.MM.yyyy')}</span>
                  )}
                </div>
              </div>
              
              {/* Header Actions */}
              <div className="flex items-center space-x-1">
                {/* Fullscreen toggle button */}
                <button
                  onClick={toggleFullScreen}
                  className="flex-shrink-0 text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-500 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label={isFullScreen ? t('event_chat.exit_fullscreen') : t('event_chat.enter_fullscreen')}
                >
                  {isFullScreen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
                    </svg>
                  )}
                </button>
                
                {/* Attendees list button */}
                <button 
                  onClick={() => setShowAttendeesModal(true)}
                  className="flex-shrink-0 text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-500 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label={t('event_chat.view_attendees')}
                >
                  <FiUsers size={20} />
                </button>
                
                {/* Settings dropdown */}
                <ContextMenu>
                  <ContextMenuTrigger>
                    <button
                      className="flex-shrink-0 text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-500 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      aria-label={t('event_chat.settings')}
                    >
                      <FiMoreVertical size={20} />
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem>
                      <FiEdit className="mr-2 h-4 w-4" />
                      {t('event_chat.edit_event')}
                    </ContextMenuItem>
                    <ContextMenuItem>
                      <FiTrash className="mr-2 h-4 w-4" />
                      {t('event_chat.delete_event')}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </div>
            </div>
          </header>

          {/* Chat Content */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
            {/* Chat Area - Better padding for mobile */}
            <main className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 pb-16"> 
              {loading && messages.length === 0 && (
                <div className="flex justify-center items-center h-full pt-10">
                  <LoadingSpinner />
                </div>
              )}
              {error && eventInfo && (
                <div className="my-4 px-2">
                  <ErrorMessage message={`${t('event_chat.error_loading_messages')}: ${error}`} />
                </div>
              )}
              {messages.map((msg) => (
                <MessageItem key={msg.id} message={msg} currentUserId={user?.id} />
              ))}
              <div ref={messagesEndRef} className="h-1" /> {/* Scroll target */}
            </main>

            {/* Message Input Area - Improved mobile spacing */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <textarea
                  value={newMessage}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewMessage(e.target.value)}
                  placeholder={t('event_chat.type_your_message')}
                  className="flex-grow resize-none border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  rows={1}
                  onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e as unknown as React.FormEvent);
                    }
                  }}
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim() || sending}
                  className="p-2 flex-shrink-0"
                >
                  <FiSend className="h-5 w-5" />
                </Button>
              </form>
              {error && !loading && <p className="text-xs text-red-500 mt-1 px-2">{error}</p>} 
            </div>
          </div>
          
          {/* Attendees Modal */}
          {showAttendeesModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold">
                    {t('event_chat.event_attendees')} ({attendeeCount})
                  </h3>
                  <button 
                    onClick={() => setShowAttendeesModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <FiX size={20} />
                  </button>
                </div>
                
                <div className="overflow-y-auto p-4 flex-1">
                  {attendees.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400">
                      {t('event_chat.no_attendees_found')}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {attendees.map(attendee => (
                        <div key={attendee.user_id} className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            {attendee.profiles?.avatar_url ? (
                              <img 
                                src={attendee.profiles.avatar_url} 
                                alt={attendee.profiles.full_name || t('event_chat.unknown_attendee')}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gray-300 dark:bg-gray-600">
                                <span className="text-gray-600 dark:text-gray-200 font-medium">
                                  {attendee.profiles?.full_name ? attendee.profiles.full_name.charAt(0).toUpperCase() : '?'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {attendee.profiles?.full_name || t('event_chat.unknown_attendee')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventChatPage;