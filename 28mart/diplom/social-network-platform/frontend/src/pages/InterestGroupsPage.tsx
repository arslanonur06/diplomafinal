import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaUsers, FaLock, FaPen, FaPlus, FaCheck, FaComments } from 'react-icons/fa';
import { useLanguage } from '../contexts/LanguageContext';
import { GROUP_IMAGES } from '../constants/images';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

interface Group {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  image?: string; // For sample data fallback
  memberCount: number;
  isPrivate: boolean;
  isAdmin: boolean;
  isMember: boolean;
  created_by?: string;
}

const SAMPLE_GROUPS: Group[] = [
  {
    id: "a1b2c3d4-e5f6-4a5b-a1b2-c3d4e5f6a7b8",
    name: 'Photography Enthusiasts',
    description: 'A community for sharing photography tips, techniques, and amazing shots!',
    image: GROUP_IMAGES.PHOTOGRAPHY,
    memberCount: 1234,
    isPrivate: false,
    isAdmin: false,
    isMember: false,
  },
  {
    id: "b2c3d4e5-f6a7-4b5c-b2c3-d4e5f6a7b8c9",
    name: 'Tech Innovators',
    description: 'Discussing the latest in technology and innovation.',
    image: GROUP_IMAGES.TECHNOLOGY,
    memberCount: 856,
    isPrivate: true,
    isAdmin: false,
    isMember: false,
  },
  {
    id: "c3d4e5f6-a7b8-4c5d-c3d4-e5f6a7b8c9d0",
    name: 'Travel Adventures',
    description: 'Share your travel experiences and get inspired for your next journey!',
    image: GROUP_IMAGES.TRAVEL,
    memberCount: 743,
    isPrivate: false,
    isAdmin: false,
    isMember: false,
  },
  {
    id: "d4e5f6a7-b8c9-4d5e-d4e5-f6a7b8c9d0e1",
    name: 'Music Lovers',
    description: 'For those who live and breathe music. Share your favorite tracks and discover new ones!',
    image: GROUP_IMAGES.MUSIC,
    memberCount: 621,
    isPrivate: false,
    isAdmin: false,
    isMember: false,
  },
  {
    id: "e5f6a7b8-c9d0-4e5f-e5f6-a7b8c9d0e1f2",
    name: 'Art & Design',
    description: 'A space for artists and designers to showcase their work and discuss techniques.',
    image: GROUP_IMAGES.ART,
    memberCount: 589,
    isPrivate: false,
    isAdmin: false,
    isMember: false,
  },
  {
    id: "f6a7b8c9-d0e1-4f5a-f6a7-b8c9d0e1f2a3",
    name: 'Foodies Unite',
    description: 'Share recipes, restaurant recommendations, and food photography!',
    image: GROUP_IMAGES.FOOD,
    memberCount: 432,
    isPrivate: false,
    isAdmin: false,
    isMember: false,
  },
];

const InterestGroupsPage: React.FC = () => {
  const { tWithTemplate: t } = useLanguage();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch all groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (groupsError) throw groupsError;
      
      // Fetch groups the user is a member of
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', user.id);
        
      if (memberError) throw memberError;
      
      // Get member counts for each group
      const memberCountsPromises = groupsData.map(async (group) => {
        const { count, error: countError } = await supabase
          .from('group_members')
          .select('*', { count: 'exact' })
          .eq('group_id', group.id);
          
        if (countError) throw countError;
        
        return { groupId: group.id, count: count || 0 };
      });
      
      const memberCounts = await Promise.all(memberCountsPromises);
      
      // Create a map of member counts for easy lookup
      const memberCountMap = memberCounts.reduce((acc, item) => {
        acc[item.groupId] = item.count;
        return acc;
      }, {} as Record<string, number>);
      
      // Create a map of user memberships for easy lookup
      const membershipMap = memberData.reduce((acc, item) => {
        acc[item.group_id] = item.role;
        return acc;
      }, {} as Record<string, string>);
      
      // Transform the data
      const transformedGroups = groupsData.map(group => {
        const isAdmin = membershipMap[group.id] === 'admin';
        const isMember = !!membershipMap[group.id];
        
        return {
          id: group.id,
          name: group.name,
          description: group.description || '',
          image_url: group.image_url,
          // Use a sample image if no image_url exists
          image: !group.image_url ? 
            GROUP_IMAGES.PHOTOGRAPHY || GROUP_IMAGES.TECHNOLOGY : 
            undefined,
          memberCount: memberCountMap[group.id] || 0,
          isPrivate: group.is_private || false,
          isAdmin,
          isMember,
          created_by: group.created_by
        };
      });
      
      setGroups(transformedGroups);
      
      // If no groups were found, use sample data
      if (transformedGroups.length === 0) {
        console.log("No groups found, using sample data");
        setGroups(SAMPLE_GROUPS);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError(t('Failed to load groups'));
      // Use sample data as fallback
      setGroups(SAMPLE_GROUPS);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLeave = async (groupId: string) => {
    if (!user) {
      toast.error(t('You must be logged in to join groups'));
      return;
    }
    
    // Find the group
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    
    try {
      if (group.isMember) {
        // Leave group
        const { error } = await supabase
          .from('group_members')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', user.id);
          
        if (error) throw error;
        
        toast.success(t('Left group successfully'));
      } else {
        // Join group
        const { error } = await supabase
          .from('group_members')
          .insert({
            group_id: groupId,
            user_id: user.id,
            role: 'member',
            joined_at: new Date().toISOString()
          });
          
        if (error) throw error;
        
        toast.success(t('Joined group successfully'));
      }
      
      // Update the UI
      setGroups(groups.map(group => {
        if (group.id === groupId) {
          const newState = {
            ...group,
            isMember: !group.isMember,
            memberCount: group.isMember ? group.memberCount - 1 : group.memberCount + 1,
          };
          return newState;
        }
        return group;
      }));
    } catch (err) {
      console.error('Error joining/leaving group:', err);
      toast.error(t('Error updating group membership'));
    }
  };

  const handleEdit = (groupId: string) => {
    // Navigate to edit page or open edit modal
    toast.success(t('Editing group...'));
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('Interest Groups')}
        </h1>
        <Link
          to="/groups/create"
          className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-rose-500 text-white px-4 py-2 rounded-lg transition duration-200 hover:opacity-90"
        >
          <FaPlus className="w-4 h-4" />
          <span>{t('Create Group')}</span>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map(group => (
          <div
            key={group.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
          >
            <Link to={`/groups/${group.id}`}>
              <div className="relative h-48">
                <img
                  src={group.image_url || group.image}
                  alt={group.name}
                  className="w-full h-full object-cover"
                />
                {group.isPrivate && (
                  <div className="absolute top-4 right-4 bg-gray-900/70 text-white px-2 py-1 rounded-full flex items-center space-x-1">
                    <FaLock className="w-3 h-3" />
                    <span className="text-sm">{t('Private')}</span>
                  </div>
                )}
              </div>
            </Link>

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <Link to={`/groups/${group.id}`} className="hover:text-indigo-600 transition-colors">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {group.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                    {group.description}
                  </p>
                </Link>
                {group.isAdmin && (
                  <button
                    onClick={() => handleEdit(group.id)}
                    className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    <FaPen className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <FaUsers className="w-4 h-4 mr-2" />
                  <span>{group.memberCount} {t('members')}</span>
                </div>
                
                <div className="flex space-x-2">
                  {group.isMember && (
                    <Link
                      to={`/groups/${group.id}/chat`}
                      className="flex items-center px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-rose-500 text-white hover:opacity-90 transition-opacity"
                    >
                      <FaComments className="w-4 h-4 mr-1" />
                      {t('Chat')}
                    </Link>
                  )}
                  
                  <button
                    onClick={() => handleJoinLeave(group.id)}
                    className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                      group.isMember
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white hover:opacity-90'
                    }`}
                  >
                    {group.isMember ? (
                      <>
                        <FaCheck className="w-4 h-4 mr-1" />
                        {t('Joined')}
                      </>
                    ) : (
                      <>
                        <FaPlus className="w-4 h-4 mr-1" />
                        {t('Join')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {groups.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('No groups found')}
          </p>
          <Link
            to="/groups/create"
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-300 to-rose-500 text-white rounded-lg hover:from-gray-400 hover:to-rose-600 transition-all"
          >
            <FaPlus className="w-4 h-4 mr-2" />
            {t('Create your first group')}
          </Link>
        </div>
      )}
    </div>
  );
};

export default InterestGroupsPage;
