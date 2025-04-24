import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { toast } from 'react-hot-toast';
import { FiUser, FiPlus, FiTrash2, FiRefreshCw, FiUserPlus, FiUsers, FiActivity, FiDatabase, FiShield } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/common/Avatar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

// Mock users with names and avatar URLs for testing
const mockUserData = [
  {
    name: 'Emma Johnson',
    avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    bio: 'Digital marketing specialist with 5+ years experience'
  },
  {
    name: 'Liam Wilson',
    avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    bio: 'Software engineer passionate about AI and machine learning'
  },
  {
    name: 'Olivia Martinez',
    avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
    bio: 'Travel blogger exploring hidden gems around the world'
  },
  {
    name: 'Noah Thompson',
    avatar: 'https://randomuser.me/api/portraits/men/4.jpg',
    bio: 'Fitness trainer specialized in nutrition and weight loss'
  },
  {
    name: 'Sophia Anderson',
    avatar: 'https://randomuser.me/api/portraits/women/5.jpg',
    bio: 'Graphic designer with an eye for minimalist aesthetics'
  },
  {
    name: 'Elijah Taylor',
    avatar: 'https://randomuser.me/api/portraits/men/6.jpg',
    bio: 'Photographer capturing beautiful landscapes and wildlife'
  },
  {
    name: 'Ava Thomas',
    avatar: 'https://randomuser.me/api/portraits/women/7.jpg',
    bio: 'UX researcher focused on creating intuitive interfaces'
  },
  {
    name: 'Lucas Walker',
    avatar: 'https://randomuser.me/api/portraits/men/8.jpg',
    bio: 'Chef specializing in fusion cuisine and baking'
  }
];

const MockUsersPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [createdGroups, setCreatedGroups] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    totalGroups: 0,
    totalPosts: 0,
    totalEvents: 0
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching mock users...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Fetched users:', data?.length || 0, 'users found');
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCreatedGroups(data || []);
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      // Get count of users
      const { count: userCount, error: userError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (userError) throw userError;
      
      // Get count of groups
      const { count: groupCount, error: groupError } = await supabase
        .from('chat_groups')
        .select('*', { count: 'exact', head: true });
      
      if (groupError) throw groupError;
      
      // Get count of posts
      const { count: postCount, error: postError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });
      
      let postsTotal = 0;
      if (!postError) {
        postsTotal = postCount || 0;
      }
      
      // Get count of events
      const { count: eventCount, error: eventError } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });
      
      let eventsTotal = 0;
      if (!eventError) {
        eventsTotal = eventCount || 0;
      }
      
      setStats({
        totalUsers: userCount || 0,
        totalGroups: groupCount || 0,
        totalPosts: postsTotal,
        totalEvents: eventsTotal
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchGroups();
      fetchStats();
    }
  }, [user]);

  const handleCreateMockUsers = async () => {
    try {
      setLoadingAction('creating');
      console.log('Creating mock users...');
      
      let successCount = 0;
      let errorCount = 0;
      
      // Get existing profiles first to avoid duplicates
      const { data: existingProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .order('created_at', { ascending: false });
      
      if (profilesError) {
        console.error('Error fetching existing profiles:', profilesError);
        toast.error(`Error checking existing profiles: ${profilesError.message}`);
        return;
      }
      
      console.log(`Found ${existingProfiles?.length || 0} existing profiles`);
      
      const existingNames = new Set(existingProfiles?.map(p => p.full_name.toLowerCase()) || []);
      const existingEmails = new Set(existingProfiles?.map(p => p.email?.toLowerCase()) || []);
      
      // Create mock users in batches
      for (const mockUser of mockUserData) {
        // Skip if user with same name already exists
        if (existingNames.has(mockUser.name.toLowerCase())) {
          console.log(`Skipping ${mockUser.name} - user with this name already exists`);
          continue;
        }
        
        // Create a user with a random email
        const randomEmail = `test_${Math.random().toString(36).substring(2, 10)}@example.com`;
        
        // Skip if email already exists (unlikely but possible)
        if (existingEmails.has(randomEmail.toLowerCase())) {
          console.log(`Skipping ${mockUser.name} - generated email ${randomEmail} already exists`);
          continue;
        }

        // Create auth user first
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: randomEmail,
          password: 'test123456', // Default password for test users
          options: {
            data: {
              full_name: mockUser.name
            }
          }
        });

        if (authError) {
          console.error(`Error creating auth user for ${mockUser.name}:`, authError);
          errorCount++;
          continue;
        }

        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user?.id,
              full_name: mockUser.name,
              avatar_url: mockUser.avatar,
              bio: mockUser.bio,
              email: randomEmail,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);

        if (profileError) {
          console.error(`Error creating profile for ${mockUser.name}:`, profileError);
          errorCount++;
          continue;
        }

        successCount++;
      }

      toast.success(`Created ${successCount} users successfully${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
      fetchUsers(); // Refresh the users list
    } catch (err) {
      console.error('Error creating mock users:', err);
      toast.error('Failed to create mock users');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCreateMockGroup = async () => {
    if (!user) return;
    
    try {
      setLoadingAction('group');
      
      // Get some random users for the group
      const groupMembers = users.slice(0, 4);
      if (groupMembers.length < 2) {
        toast.error('Need at least 2 other users to create a group');
        return;
      }
      
      // Create a new group
      const { data: groupData, error: groupError } = await supabase
        .from('chat_groups')
        .insert({
          name: `Group Chat ${Math.floor(Math.random() * 1000)}`,
          description: 'A mock group chat for testing',
          created_by: user.id,
          created_at: new Date().toISOString(),
          avatar_url: 'https://ui-avatars.com/api/?name=Group+Chat&background=random'
        })
        .select();
        
      if (groupError) throw groupError;
      
      if (groupData && groupData[0]) {
        const groupId = groupData[0].id;
        
        // Add current user to group
        await supabase
          .from('chat_group_members')
          .insert({
            group_id: groupId,
            user_id: user.id,
            joined_at: new Date().toISOString(),
            is_admin: true
          });
          
        // Add other members to group
        const memberPromises = groupMembers.map(member => 
          supabase
            .from('chat_group_members')
            .insert({
              group_id: groupId,
              user_id: member.id,
              joined_at: new Date().toISOString(),
              is_admin: false
            })
        );
        
        await Promise.all(memberPromises);
        
        // Add a welcome message
        await supabase
          .from('chat_messages')
          .insert({
            group_id: groupId,
            user_id: user.id,
            content: 'Welcome to the group chat!',
            created_at: new Date().toISOString()
          });
          
        toast.success('Group chat created successfully');
        fetchGroups();
      }
    } catch (err) {
      console.error('Error creating mock group:', err);
      toast.error('Failed to create mock group chat');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleViewGroup = (groupId: string) => {
    navigate(`/chat/groups/${groupId}`);
  };

  const handleSendMessage = (userId: string) => {
    navigate(`/messages/${userId}`);
  };

  const handleAddFriend = async (userId: string) => {
    if (!user) return;
    
    try {
      setLoadingAction(userId);
      
      const { error } = await supabase
        .from('user_connections')
        .insert({
          user_id: user.id,
          friend_id: userId,
          status: 'accepted'
        });
        
      if (error) throw error;
      
      toast.success('Friend added successfully');
      fetchUsers();
    } catch (err) {
      console.error('Error adding friend:', err);
      toast.error('Failed to add friend');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!user || !window.confirm('Are you sure? This will delete all mock users and chat groups.')) return;
    
    try {
      setLoadingAction('deleting');
      
      // Delete all mock users except the current user
      await supabase
        .from('profiles')
        .delete()
        .not('id', 'eq', user.id);
        
      // Delete all chat groups
      await supabase
        .from('chat_groups')
        .delete()
        .neq('id', 0); // Delete all groups
        
      toast.success('All mock data deleted successfully');
      
      // Refresh data
      fetchUsers();
      fetchGroups();
    } catch (err) {
      console.error('Error deleting mock data:', err);
      toast.error('Failed to delete mock data');
    } finally {
      setLoadingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage users, groups, and system settings
            </p>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
            <button
              onClick={handleCreateMockUsers}
              disabled={loadingAction === 'creating'}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-rose-500 hover:opacity-90 text-white rounded-lg transition-colors"
            >
              {loadingAction === 'creating' ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <FiUserPlus className="mr-2" />
                  Create Mock Users
                </>
              )}
            </button>
            <button
              onClick={handleCreateMockGroup}
              disabled={loadingAction === 'group' || users.length < 2}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {loadingAction === 'group' ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <FiPlus className="mr-2" />
                  Create Mock Group
                </>
              )}
            </button>
            <button
              onClick={handleDeleteAll}
              disabled={loadingAction === 'deleting'}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {loadingAction === 'deleting' ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <FiTrash2 className="mr-2" />
                  Delete All
                </>
              )}
            </button>
            <button
              onClick={() => {
                fetchUsers();
                fetchGroups();
                fetchStats();
              }}
              className="inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <FiRefreshCw className="mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-750 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                <FiUsers className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</p>
                <div className="text-2xl font-semibold text-gray-800 dark:text-white">
                  {statsLoading ? <LoadingSpinner size="sm" /> : stats.totalUsers}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-750 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
                <FiUsers className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Groups</p>
                <div className="text-2xl font-semibold text-gray-800 dark:text-white">
                  {statsLoading ? <LoadingSpinner size="sm" /> : stats.totalGroups}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-750 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300">
                <FiActivity className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Posts</p>
                <div className="text-2xl font-semibold text-gray-800 dark:text-white">
                  {statsLoading ? <LoadingSpinner size="sm" /> : stats.totalPosts}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-750 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300">
                <FiDatabase className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Events</p>
                <div className="text-2xl font-semibold text-gray-800 dark:text-white">
                  {statsLoading ? <LoadingSpinner size="sm" /> : stats.totalEvents}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mock Users */}
          <div className="border dark:border-gray-700 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FiUser className="mr-2" />
              Users ({users.length})
            </h2>
            
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {users.length === 0 ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No users found. Create some mock users to get started.
                </div>
              ) : (
                users.map(user => (
                  <div key={user.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-750 p-3 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar src={user.avatar_url} name={user.full_name} size="md" />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {user.full_name}
                        </h3>
                        {user.bio && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                            {user.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSendMessage(user.id)}
                        className="px-3 py-1 text-sm bg-gradient-to-r from-indigo-500/10 to-rose-500/10 text-indigo-700 dark:text-indigo-300 rounded-md hover:from-indigo-500/20 hover:to-rose-500/20 dark:hover:from-indigo-500/20 dark:hover:to-rose-500/20"
                      >
                        Message
                      </button>
                      <button
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => navigate(`/profile/${user.id}`)}
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Mock Groups */}
          <div className="border dark:border-gray-700 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FiUsers className="mr-2" />
              Groups ({createdGroups.length})
            </h2>
            
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {createdGroups.length === 0 ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No groups found. Create a mock group to get started.
                </div>
              ) : (
                createdGroups.map(group => (
                  <div key={group.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-750 p-3 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar src={group.avatar_url} name={group.name} size="md" />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {group.name}
                        </h3>
                        {group.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewGroup(group.id)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                      View Group
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Admin Tools Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <FiShield className="mr-2" />
            Admin Tools
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={() => navigate('/admin/chat-diagnostics')} 
              className="p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white">Chat Diagnostics</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Test and debug chat functionality
              </p>
            </button>
            
            <button onClick={() => navigate('/settings')} 
              className="p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white">System Settings</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Configure application settings
              </p>
            </button>
            
            <button onClick={() => window.open('/setup-database.js')} 
              className="p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white">Database Setup</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Initialize and configure database tables
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockUsersPage; 