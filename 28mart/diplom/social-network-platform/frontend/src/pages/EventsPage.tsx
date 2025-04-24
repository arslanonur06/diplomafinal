import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiSearch, FiPlus, FiMapPin, FiUsers, FiClock, FiMessageCircle } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// Sample image URLs for events
const sampleImages = [
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2370&q=80',
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2369&q=80',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2370&q=80',
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2370&q=80',
];

// Event categories
const categories = [
  'technology', 'business', 'education', 'entertainment', 
  'health', 'sports', 'travel', 'art', 'food', 'music'
];

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date?: string;
  category: string;
  created_by: string;
  created_at: string;
  is_public: boolean;
  max_attendees: number;
  status: string;
  attendee_count: number;
  is_attending: boolean;
}

const EventsPage: React.FC = () => {
  const { tWithTemplate: t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [joiningEventId, setJoiningEventId] = useState<string | null>(null);
  const [leavingEventId, setLeavingEventId] = useState<string | null>(null);

  // Fetch events when component mounts
  useEffect(() => {
    if (activeTab === 'all') {
      fetchAllEvents();
    } else {
      fetchMyEvents();
    }
  }, [user, activeTab, selectedCategory]);

  const fetchAllEvents = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        console.log('User not authenticated, using sample data');
        setEvents(getSampleEvents());
        setLoading(false);
        return;
      }
      
      console.log('Fetching all events from Supabase...');
      let query = supabase.from('events').select(`
        id, 
        title, 
        description, 
        location,
        start_date,
        end_date,
        category,
        created_by,
        created_at,
        is_public,
        max_attendees,
        status
      `);
      
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }
      
      const { data: eventsData, error } = await query;
      
      if (error) {
        console.error('Error fetching events:', error);
        throw error;
      }
      
      console.log(`Found ${eventsData?.length || 0} events`);
      
      // If no events found and user is authenticated, create sample events
      if (!eventsData || eventsData.length === 0) {
        await createSampleEvents();
        return;
      }
      
      // Get attendance status for each event
      const enhancedEvents = await Promise.all(
        eventsData.map(async (event) => {
          // Get attendee count
          const { count } = await supabase
            .from('event_attendees')
            .select('*', { count: 'exact' })
            .eq('event_id', event.id);
            
          // Check if user is attending
          const { data: attendeeData } = await supabase
            .from('event_attendees')
            .select('id')
            .eq('event_id', event.id)
            .eq('user_id', user.id)
            .maybeSingle();
            
          return {
            ...event,
            attendee_count: count || 0,
            is_attending: !!attendeeData
          };
        })
      );
      
      setEvents(enhancedEvents);
    } catch (error) {
      console.error('Error in fetchAllEvents:', error);
      toast.error('Failed to load events');
      // Fallback to sample events
      setEvents(getSampleEvents());
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMyEvents = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        console.log('User not authenticated, skipping my events fetch');
        setEvents([]);
        setLoading(false);
        return;
      }
      
      console.log('Fetching my events from Supabase...');
      
      // Get events the user is attending
      const { data: myEventsData, error } = await supabase
        .from('event_attendees')
        .select(`
          event:events (
            id, 
            title, 
            description, 
            location,
            start_date,
            end_date,
            category,
            created_by,
            created_at,
            is_public,
            max_attendees,
            status
          )
        `)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching my events:', error);
        throw error;
      }
      
      if (!myEventsData || myEventsData.length === 0) {
        console.log('No events found that the user is attending');
        setEvents([]);
        setLoading(false);
        return;
      }
      
      // Transform and enhance the data
      const enhancedEvents = await Promise.all(
        myEventsData.map(async (item: any) => {
          const event = item.event;
          
          if (!event) {
            console.warn('Event data is missing for an attendee record');
            return null;
          }
          
          // Get attendee count
          const { count } = await supabase
            .from('event_attendees')
            .select('*', { count: 'exact' })
            .eq('event_id', event.id);
            
          return {
            ...event,
            attendee_count: count || 0,
            is_attending: true
          } as Event;
        })
      );
      
      // Filter out any null events
      const validEvents = enhancedEvents.filter(event => event !== null) as Event[];
      
      setEvents(validEvents);
    } catch (error) {
      console.error('Error in fetchMyEvents:', error);
      toast.error('Failed to load your events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };
  
  const getSampleEvents = (): Event[] => {
    // Generate dates for sample events
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    return [
      {
        id: 'sample-1',
        title: 'Tech Conference 2023',
        description: 'Join us for the biggest tech conference of the year with renowned speakers, workshops, and networking opportunities.',
        location: 'Convention Center, New York',
        start_date: tomorrow.toISOString(),
        end_date: nextWeek.toISOString(),
        category: 'technology',
        created_by: 'sample',
        created_at: today.toISOString(),
        is_public: true,
        max_attendees: 126,
        status: 'going',
        attendee_count: 126,
        is_attending: false
      },
      {
        id: 'sample-2',
        title: 'Startup Pitch Night',
        description: 'An exciting evening where innovative startups pitch their ideas to investors and industry experts.',
        location: 'Innovation Hub, San Francisco',
        start_date: nextWeek.toISOString(),
        category: 'business',
        created_by: 'sample',
        created_at: today.toISOString(),
        is_public: true,
        max_attendees: 58,
        status: 'going',
        attendee_count: 58,
        is_attending: false
      },
      {
        id: 'sample-3',
        title: 'Wellness Retreat Weekend',
        description: 'A rejuvenating weekend of yoga, meditation, healthy food, and wellness workshops.',
        location: 'Mountain View Resort, Colorado',
        start_date: nextMonth.toISOString(),
        category: 'health',
        created_by: 'sample',
        created_at: today.toISOString(),
        is_public: true,
        max_attendees: 45,
        status: 'going',
        attendee_count: 45,
        is_attending: false
      },
      {
        id: 'sample-4',
        title: 'Photography Workshop',
        description: 'Learn advanced photography techniques from professional photographers in this hands-on workshop.',
        location: 'Art Gallery, Chicago',
        start_date: nextWeek.toISOString(),
        category: 'art',
        created_by: 'sample',
        created_at: today.toISOString(),
        is_public: true,
        max_attendees: 32,
        status: 'going',
        attendee_count: 32,
        is_attending: false
      }
    ];
  };
  
  const createSampleEvents = async () => {
    try {
      if (!user?.id) {
        console.error('Cannot create sample events: user not authenticated');
        setLoading(false);
        return;
      }
      
      console.log('Creating sample events...');
      const createdEvents: Event[] = [];
      
      // Generate dates for sample events
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const sampleEventsData = [
        {
          title: 'Tech Conference 2023',
          description: 'Join us for the biggest tech conference of the year with renowned speakers, workshops, and networking opportunities.',
          location: 'Convention Center, New York',
          start_date: tomorrow.toISOString(),
          end_date: nextWeek.toISOString(),
          category: 'technology',
          created_by: 'sample',
          created_at: today.toISOString(),
          is_public: true,
          max_attendees: 126,
          status: 'going'
        },
        {
          title: 'Startup Pitch Night',
          description: 'An exciting evening where innovative startups pitch their ideas to investors and industry experts.',
          location: 'Innovation Hub, San Francisco',
          start_date: nextWeek.toISOString(),
          category: 'business',
          created_by: 'sample',
          created_at: today.toISOString(),
          is_public: true,
          max_attendees: 58,
          status: 'going'
        },
        {
          title: 'Wellness Retreat Weekend',
          description: 'A rejuvenating weekend of yoga, meditation, healthy food, and wellness workshops.',
          location: 'Mountain View Resort, Colorado',
          start_date: nextMonth.toISOString(),
          category: 'health',
          created_by: 'sample',
          created_at: today.toISOString(),
          is_public: true,
          max_attendees: 45,
          status: 'going'
        },
        {
          title: 'Photography Workshop',
          description: 'Learn advanced photography techniques from professional photographers in this hands-on workshop.',
          location: 'Art Gallery, Chicago',
          start_date: nextWeek.toISOString(),
          category: 'art',
          created_by: 'sample',
          created_at: today.toISOString(),
          is_public: true,
          max_attendees: 32,
          status: 'going'
        }
      ];
      
      // Insert sample events
      for (const eventData of sampleEventsData) {
        const { data: newEvent, error } = await supabase
          .from('events')
          .insert({
            title: eventData.title,
            description: eventData.description,
            location: eventData.location,
            start_date: eventData.start_date,
            end_date: eventData.end_date,
            category: eventData.category,
            created_by: eventData.created_by,
            created_at: eventData.created_at,
            is_public: eventData.is_public,
            max_attendees: eventData.max_attendees,
            status: eventData.status
          })
          .select()
          .single();
          
        if (error) {
          console.error('Error creating sample event:', error);
          continue;
        }
        
        // Make user an attendee of the new event
        await supabase
          .from('event_attendees')
          .insert({
            event_id: newEvent.id,
            user_id: user.id,
            status: 'going',
            joined_at: new Date().toISOString()
          });
          
        console.log(`Created sample event: ${eventData.title}`);
        
        createdEvents.push({
          ...newEvent,
          attendee_count: 1,
          is_attending: true
        });
      }
      
      if (createdEvents.length > 0) {
        setEvents(createdEvents);
      } else {
        // If creation failed, use static sample data
        setEvents(getSampleEvents());
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error in createSampleEvents:', error);
      setEvents(getSampleEvents());
      setLoading(false);
    }
  };
  
  const handleJoinEvent = async (eventId: string) => {
    try {
      if (!user?.id) {
        toast.error('You must be logged in to join an event');
        return;
      }
      
      // For sample events, just simulate join
      if (eventId.startsWith('sample-')) {
        toast.success('RSVP successful! In a real app, this would add you to the event.');
        setEvents(events.map(event => 
          event.id === eventId 
            ? { ...event, is_attending: true, attendee_count: event.attendee_count + 1 } 
            : event
        ));
        return;
      }
      
      setJoiningEventId(eventId);
      
      // Check if already attending
      const { data: existingAttendee } = await supabase
        .from('event_attendees')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (existingAttendee) {
        toast.error('You are already attending this event');
        setJoiningEventId(null);
        return;
      }
      
      // Join the event
      const { error } = await supabase
        .from('event_attendees')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: 'going',
          joined_at: new Date().toISOString()
        });
        
      if (error) {
        console.error('Error joining event:', error);
        toast.error('Failed to RSVP for the event');
        return;
      }
      
      toast.success('Successfully RSVP\'d for the event!');
      
      // Update the local state
      setEvents(events.map(event => 
        event.id === eventId 
          ? { ...event, is_attending: true, attendee_count: event.attendee_count + 1 } 
          : event
      ));
    } catch (error) {
      console.error('Error in handleJoinEvent:', error);
      toast.error('Failed to RSVP for the event');
    } finally {
      setJoiningEventId(null);
    }
  };
  
  const handleLeaveEvent = async (eventId: string) => {
    try {
      if (!user?.id) {
        toast.error('You must be logged in to leave an event');
        return;
      }

      // Handle sample events (optional, but good for consistency)
      if (eventId.startsWith('sample-')) {
        toast.success('Successfully left the event (simulated).');
        setEvents(events.map(event => 
          event.id === eventId 
            ? { ...event, is_attending: false, attendee_count: Math.max(0, event.attendee_count - 1) } 
            : event
        ));
        return;
      }

      setLeavingEventId(eventId);

      // Remove attendee record
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error leaving event:', error);
        toast.error('Failed to leave the event');
        return;
      }

      toast.success('Successfully left the event');

      // Update the local state
      setEvents(events.map(event => 
        event.id === eventId 
          ? { ...event, is_attending: false, attendee_count: Math.max(0, event.attendee_count - 1) } 
          : event
      ));

    } catch (error) {
      console.error('Error in handleLeaveEvent:', error);
      toast.error('Failed to leave the event');
    } finally {
      setLeavingEventId(null);
    }
  };
  
  const handleCreateEvent = () => {
    navigate('/events/create');
  };
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };
  
  const filteredEvents = events.filter(event => 
    (selectedCategory === 'all' || event.category === selectedCategory) &&
    (searchTerm === '' || 
     event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
     event.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <FiCalendar className="mr-3 h-6 w-6" /> {t('events.title') || 'Events'}
          </h1>
        </div>

        {/* Tabs with Create button */} 
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex">
            <button
              className={`py-4 px-6 font-medium text-base focus:outline-none flex-1 max-w-[160px] text-center ${ activeTab === 'all' ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300' }`}
              onClick={() => setActiveTab('all')}
            >
              {t('events.tabs.all') || 'All Events'}
            </button>
            <button
              className={`py-4 px-6 font-medium text-base focus:outline-none flex-1 max-w-[160px] text-center ${ activeTab === 'my' ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300' }`}
              onClick={() => setActiveTab('my')}
            >
              {t('events.tabs.my') || 'My Events'}
            </button>
          </div>
          
          {/* Create button */} 
          <button 
            onClick={handleCreateEvent}
            className="flex items-center px-6 py-2.5 bg-gradient-to-r from-slate-400 to-rose-300 text-white rounded-full hover:from-slate-500 hover:to-rose-400 transition-all text-base font-medium shadow-lg"
          >
            <FiPlus className="mr-2" /> {t('events.buttons.create') || 'Create Event'}
          </button>
        </div>

        {/* Search and filters */} 
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={t('events.search_placeholder') || 'Search events...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base"
            />
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
          </div>
          
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white min-w-[200px] text-base"
            aria-label={t('events.category_label') || 'Select Category'}
          >
            <option value="all">{t('events.categories.all') || 'All Categories'}</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {t(`events.categories.${category}`) || category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
        
        {loading ? (
          <div className="flex justify-center my-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEvents.map((event, index) => (
              <div
                key={event.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col"
                style={{ maxHeight: '380px' }}
              >
                <div 
                  className="h-32 bg-gray-200 dark:bg-gray-700 relative overflow-hidden"
                  style={{
                    backgroundImage: `url(${sampleImages[index % sampleImages.length]})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      event.is_public ? 'bg-green-500' : 'bg-yellow-500'
                    } text-white`}>
                      {event.is_public ? (t('events.public') || 'Public') : (t('events.private') || 'Private')}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                    {event.title}
                  </h3>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                    {event.description}
                  </p>

                  <div className="mt-auto space-y-2">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <FiMapPin className="w-4 h-4 mr-1" />
                      <span className="truncate">{event.location}</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <FiCalendar className="w-4 h-4 mr-1" />
                      <span>{formatDate(event.start_date)}</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <FiUsers className="w-4 h-4 mr-1" />
                      <span>{event.attendee_count} / {event.max_attendees || '∞'}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    {event.is_attending ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleLeaveEvent(event.id)}
                          disabled={leavingEventId === event.id}
                          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                        >
                          {leavingEventId === event.id ? (t('events.buttons.leaving') || 'Leaving...') : (t('events.buttons.leave') || 'Leave')}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/events/${event.id}/chat`);
                          }}
                          className="px-3 py-1 text-sm bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors duration-200 flex items-center"
                        >
                          <FiMessageCircle className="mr-1" /> {t('events.buttons.chat') || 'Chat'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleJoinEvent(event.id)}
                        disabled={joiningEventId === event.id}
                        className="px-3 py-1 text-sm bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors duration-200"
                      >
                        {joiningEventId === event.id ? (t('events.buttons.joining') || 'Joining...') : (t('events.buttons.join') || 'Join')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center my-16 py-16 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <FiCalendar className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('events.no_events_found_title') || 'No events found'}</h3>
            <p className="mt-3 text-gray-500 dark:text-gray-400 text-lg">
              {activeTab === 'my' 
                ? (t('events.no_my_events_message') || "You haven't RSVP'd to any events yet.") 
                : (t('events.no_all_events_message') || "Try adjusting your search or create a new event.")}
            </p>
            <button 
              onClick={handleCreateEvent}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-slate-400 to-rose-300 text-white rounded-full hover:from-slate-500 hover:to-rose-400 transition-all text-base font-medium shadow-sm"
            >
              {t('events.buttons.create') || 'Create Event'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
