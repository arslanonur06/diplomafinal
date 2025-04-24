import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { FiUsers, FiCalendar, FiMessageCircle, FiPlus, FiCheck, FiX } from 'react-icons/fi';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Button } from '../components/ui/Button';

interface Group {
  id: string;
  name: string;
  description: string;
  created_at: string;
  banner_url?: string;
  admin_id: string;
  member_count: number;
}

const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    if (id && user) {
      fetchGroupDetails();
      checkMembershipStatus();
      fetchGroupEvents();
      fetchGroupPosts();
    }
  }, [id, user]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          profiles(id, full_name, avatar_url)
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      // Get member count
      const { count: memberCount } = await supabase
        .from('group_members')
        .select('id', { count: 'exact' })
        .eq('group_id', id);
      
      setGroup({
        ...data,
        member_count: memberCount || 0
      });
      
      setIsAdmin(data.admin_id === user?.id);
    } catch (err) {
      console.error('Error fetching group details:', err);
      setError('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const checkMembershipStatus = async () => {
    if (!user || !id) return;
    
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (error) throw error;
      
      setIsMember(!!data);
    } catch (err) {
      console.error('Error checking membership:', err);
    }
  };

  const fetchGroupEvents = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, description, start_date, location')
        .eq('group_id', id)
        .order('start_date', { ascending: true })
        .limit(3);
        
      if (error) throw error;
      
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching group events:', err);
    }
  };

  const fetchGroupPosts = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id, content, created_at,
          profiles(id, full_name, avatar_url)
        `)
        .eq('group_id', id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (error) throw error;
      
      setPosts(data || []);
    } catch (err) {
      console.error('Error fetching group posts:', err);
    }
  };

  const handleJoinGroup = async () => {
    if (!user || !id) return;
    
    try {
      const { error } = await supabase
        .from('group_members')
        .insert([{ group_id: id, user_id: user.id }]);
        
      if (error) throw error;
      
      setIsMember(true);
      setGroup(prev => prev ? { ...prev, member_count: prev.member_count + 1 } : null);
    } catch (err) {
      console.error('Error joining group:', err);
      alert('Failed to join group');
    }
  };

  const handleLeaveGroup = async () => {
    if (!user || !id) return;
    
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      setIsMember(false);
      setGroup(prev => prev ? { ...prev, member_count: prev.member_count - 1 } : null);
    } catch (err) {
      console.error('Error leaving group:', err);
      alert('Failed to leave group');
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

  if (!group) {
    return <ErrorMessage message="Group not found" />;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Group Banner */}
      <div 
        className="h-48 w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg bg-cover bg-center"
        style={{ 
          backgroundImage: group.banner_url ? `url(${group.banner_url})` : 'none' 
        }}
      >
        {!group.banner_url && (
          <div className="h-full flex items-center justify-center">
            <FiUsers className="text-gray-400 h-20 w-20" />
          </div>
        )}
      </div>

      {/* Group Header */}
      <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
            </p>
          </div>
          <div className="flex space-x-2">
            {isMember ? (
              <div className="flex space-x-2">
                <Link 
                  to={`/groups/${id}/chat`}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-rose-500 text-white rounded-lg hover:opacity-90 transition-opacity duration-200"
                >
                  <FiMessageCircle className="mr-2" />
                  Chat
                </Link>
                <Button 
                  onClick={handleLeaveGroup}
                  variant="secondary"
                >
                  <FiX className="mr-1" />
                  Leave
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleJoinGroup}
                variant="primary"
              >
                <FiPlus className="mr-1" />
                Join
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Group Content */}
      <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow">
        {/* About */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold mb-2">About</h2>
          <p className="text-gray-700 dark:text-gray-300">{group.description}</p>
        </div>

        {/* Upcoming Events */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Upcoming Events</h2>
            {isMember && (
              <Link 
                to={`/groups/${id}/create-event`}
                className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
              >
                <FiPlus className="mr-1" /> Create Event
              </Link>
            )}
          </div>
          {events.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No upcoming events</p>
          ) : (
            <div className="space-y-4">
              {events.map(event => (
                <Link 
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="block bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <div className="flex items-start">
                    <div className="bg-indigo-100 dark:bg-indigo-900 rounded-lg p-3 mr-4">
                      <FiCalendar className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{event.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(event.start_date).toLocaleDateString()} • {event.location}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Posts */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Posts</h2>
            {isMember && (
              <Link
                to={`/groups/${id}/create-post`}
                className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
              >
                <FiPlus className="mr-1" /> Create Post
              </Link>
            )}
          </div>
          {posts.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No posts yet</p>
          ) : (
            <div className="space-y-6">
              {posts.map(post => (
                <div key={post.id} className="border-b pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-center mb-3">
                    <div className="h-10 w-10 mr-3">
                      {post.profiles.avatar_url ? (
                        <img
                          src={post.profiles.avatar_url}
                          alt={post.profiles.full_name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-xl font-medium text-gray-600 dark:text-gray-300">
                            {post.profiles.full_name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{post.profiles.full_name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200">{post.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupDetailPage;