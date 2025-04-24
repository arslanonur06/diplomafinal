import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { FiCalendar, FiMapPin, FiUsers, FiMessageCircle, FiClock, FiPlus, FiX } from 'react-icons/fi';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Button } from '../components/ui/Button';

interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date?: string;
  location: string;
  group_id?: string;
  banner_url?: string;
  created_at: string;
  group?: {
    id: string;
    name: string;
  };
  creator_id: string;
  attendee_count: number;
}

const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAttending, setIsAttending] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);

  useEffect(() => {
    if (id && user) {
      fetchEventDetails();
      checkAttendanceStatus();
      fetchEventAttendees();
    }
  }, [id, user]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          group:groups(id, name)
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      // Get attendee count
      const { count: attendeeCount } = await supabase
        .from('event_attendees')
        .select('id', { count: 'exact' })
        .eq('event_id', id);
      
      setEvent({
        ...data,
        attendee_count: attendeeCount || 0
      });
      
      setIsCreator(data.creator_id === user?.id);
    } catch (err) {
      console.error('Error fetching event details:', err);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const checkAttendanceStatus = async () => {
    if (!user || !id) return;
    
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('id')
        .eq('event_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (error) throw error;
      
      setIsAttending(!!data);
    } catch (err) {
      console.error('Error checking attendance:', err);
    }
  };

  const fetchEventAttendees = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          id, 
          profiles(id, full_name, avatar_url)
        `)
        .eq('event_id', id)
        .limit(5);
        
      if (error) throw error;
      
      setAttendees(data || []);
    } catch (err) {
      console.error('Error fetching attendees:', err);
    }
  };

  const handleAttendEvent = async () => {
    if (!user || !id) return;
    
    try {
      const { error } = await supabase
        .from('event_attendees')
        .insert([{ event_id: id, user_id: user.id }]);
        
      if (error) throw error;
      
      setIsAttending(true);
      setEvent(prev => prev ? { ...prev, attendee_count: prev.attendee_count + 1 } : null);
      fetchEventAttendees();
    } catch (err) {
      console.error('Error attending event:', err);
      alert('Failed to RSVP to event');
    }
  };

  const handleCancelAttendance = async () => {
    if (!user || !id) return;
    
    try {
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      setIsAttending(false);
      setEvent(prev => prev ? { ...prev, attendee_count: prev.attendee_count - 1 } : null);
      fetchEventAttendees();
    } catch (err) {
      console.error('Error canceling attendance:', err);
      alert('Failed to cancel attendance');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!event) {
    return <ErrorMessage message="Event not found" />;
  }

  const eventDate = new Date(event.start_date);
  const eventTime = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const eventEndDate = event.end_date ? new Date(event.end_date) : null;
  const isUpcoming = eventDate > new Date();

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Event Banner */}
      <div 
        className="h-48 w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg bg-cover bg-center"
        style={{ 
          backgroundImage: event.banner_url ? `url(${event.banner_url})` : 'none' 
        }}
      >
        {!event.banner_url && (
          <div className="h-full flex items-center justify-center">
            <FiCalendar className="text-gray-400 h-20 w-20" />
          </div>
        )}
      </div>

      {/* Event Header */}
      <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <div className="mt-2 flex items-center text-gray-500 dark:text-gray-400">
              <FiCalendar className="mr-1" />
              <span>
                {eventDate.toLocaleDateString()} 
                {eventEndDate && ` - ${eventEndDate.toLocaleDateString()}`}
              </span>
              <FiClock className="ml-4 mr-1" />
              <span>{eventTime}</span>
            </div>
            <div className="mt-1 flex items-center text-gray-500 dark:text-gray-400">
              <FiMapPin className="mr-1" />
              <span>{event.location}</span>
            </div>
            {event.group && (
              <div className="mt-2">
                <Link 
                  to={`/groups/${event.group.id}`}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  {event.group.name}
                </Link>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            {isUpcoming && (
              isAttending ? (
                <div className="flex space-x-2">
                  <Link 
                    to={`/events/${id}/chat`}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-rose-500 text-white rounded-lg hover:opacity-90 transition-opacity duration-200"
                  >
                    <FiMessageCircle className="mr-2" />
                    Chat
                  </Link>
                  <Button 
                    onClick={handleCancelAttendance}
                    variant="secondary"
                  >
                    <FiX className="mr-1" />
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleAttendEvent}
                  variant="primary"
                >
                  <FiPlus className="mr-1" />
                  Attend
                </Button>
              )
            )}
            {!isUpcoming && isAttending && (
              <Link 
                to={`/events/${id}/chat`}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-rose-500 text-white rounded-lg hover:opacity-90 transition-opacity duration-200"
              >
                <FiMessageCircle className="mr-2" />
                Chat
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Event Content */}
      <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow">
        {/* About */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold mb-2">About</h2>
          <p className="text-gray-700 dark:text-gray-300">{event.description}</p>
        </div>

        {/* Attendees */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Attendees ({event.attendee_count})
            </h2>
          </div>
          {attendees.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No attendees yet</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {attendees.map(attendee => (
                <Link
                  key={attendee.id}
                  to={`/profile/${attendee.profiles.id}`}
                  className="flex flex-col items-center"
                >
                  <div className="h-16 w-16 mb-2">
                    {attendee.profiles.avatar_url ? (
                      <img
                        src={attendee.profiles.avatar_url}
                        alt={attendee.profiles.full_name}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-xl font-medium text-gray-600 dark:text-gray-300">
                          {attendee.profiles.full_name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm truncate max-w-[80px] text-center">
                    {attendee.profiles.full_name}
                  </span>
                </Link>
              ))}
              {event.attendee_count > attendees.length && (
                <div className="flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      +{event.attendee_count - attendees.length}
                    </span>
                  </div>
                  <span className="text-sm">more</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;