import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiSearch, FiPlus, FiChevronLeft, FiChevronRight, FiMessageSquare, FiFilter, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Sample image URLs for groups
const sampleImages = [
  'https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80',
  'https://images.unsplash.com/photo-1517048676732-d65bc937f952?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80',
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80',
];

// Group categories
const categories = [
  'technology', 'business', 'education', 'entertainment', 
  'health', 'sports', 'travel', 'art', 'food', 'music'
];

// Replace with enhanced categories with emojis
const enhancedCategories = [
  'technology', 'business', 'education', 'entertainment', 
  'health', 'sports', 'travel', 'art', 'food', 'music'
];

// Emoji mapping for categories
const categoryEmojis: Record<string, string> = {
  'technology': '💻',
  'business': '💼',
  'education': '📚',
  'entertainment': '🎬',
  'health': '🏥',
  'sports': '⚽',
  'travel': '✈️',
  'art': '🎨',
  'food': '🍕',
  'music': '🎵',
  'all': '🌐',
};

// Type definition for raw group data from database
interface GroupData {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  category: string;
  created_at: string;
  created_by: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  category: string;
  created_at: string;
  member_count: number;
  is_member: boolean;
  created_by: string;
  is_admin?: boolean;
}

const GroupsPage: React.FC = () => {
  const { tWithTemplate: t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [showCategories, setShowCategories] = useState(false);

  // Add this effect to load group memberships from localStorage on page load
  // Moving it above the fetchGroups/fetchMyGroups effect to ensure it runs first
  useEffect(() => {
    if (!user?.id) return; // Skip if user not logged in
    
    try {
      console.log('Loading memberships from localStorage...');
      const storedMemberships = localStorage.getItem('groupMemberships');
      if (storedMemberships) {
        const memberships = JSON.parse(storedMemberships);
        console.log('Loaded memberships:', memberships);
        
        // We'll set this flag to use later when fetching groups
        localStorage.setItem('membershipDataLoaded', 'true');
      }
    } catch (error) {
      console.warn('Error loading group memberships from localStorage:', error);
    }
  }, [user?.id]); // Only run when user changes

  // Fetch groups when component mounts or when dependencies change
  useEffect(() => {
    if (activeTab === 'all') {
      fetchGroups();
    } else {
      fetchMyGroups();
    }
    
    // Cleanup function to ensure we don't have stale data
    return () => {
      localStorage.removeItem('membershipDataLoaded');
    };
  }, [user, activeTab]); // Remove selectedCategory from dependencies to prevent re-fetching on category change

  const fetchGroups = async () => {
    if (!user) {
      console.log('No user, skipping fetchGroups');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching groups...');
      
      // Use RPC call to fetch groups
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_groups', {
        p_user_id: user.id
      });
      
      if (rpcError) {
        console.error('Error fetching groups via RPC:', rpcError);
        console.log('Falling back to direct table queries...');
        
        // If the RPC fails, we'll do it manually by combining data from multiple sources
        // Fetch all available groups
        const { data: allGroups, error: groupsError } = await supabase
          .from('groups')
          .select('*');
        
        if (groupsError) {
          console.error('Error fetching all groups:', groupsError);
          throw groupsError;
        }
        
        console.log('Fetched all groups:', allGroups);
        
        // Get memberships from group_members table
        const { data: groupMemberships, error: membershipsError } = await supabase
          .from('group_members')
          .select('group_id, role')
          .eq('user_id', user.id);
        
        if (membershipsError) {
          console.error('Error fetching group memberships:', membershipsError);
          // Continue anyway to try the other table
        }
        
        console.log('Fetched group memberships from group_members:', groupMemberships);
        
        // Get memberships from chat_group_members table
        const { data: chatGroupMemberships, error: chatMembershipsError } = await supabase
          .from('chat_group_members')
          .select('group_id, is_admin')
          .eq('user_id', user.id);
        
        if (chatMembershipsError) {
          console.error('Error fetching chat group memberships:', chatMembershipsError);
          // Continue anyway with what we have
        }
        
        console.log('Fetched group memberships from chat_group_members:', chatGroupMemberships);
        
        // Combine the two sets of memberships
        const membershipMap = new Map();
        
        // Add memberships from group_members
        if (groupMemberships) {
          groupMemberships.forEach(membership => {
            membershipMap.set(membership.group_id, {
              is_member: true,
              role: membership.role
            });
          });
        }
        
        // Add memberships from chat_group_members (will overwrite if already exists)
        if (chatGroupMemberships) {
          chatGroupMemberships.forEach(membership => {
            membershipMap.set(membership.group_id, {
              is_member: true,
              role: membership.is_admin ? 'admin' : 'member'
            });
          });
        }
        
        console.log('Combined membership map:', Object.fromEntries(membershipMap));
        
        // Match groups with memberships
        const processedGroups = (allGroups as GroupData[] || []).map((group: GroupData) => {
          const membership = membershipMap.get(group.id);
          return {
            ...group,
            is_member: !!membership,
            is_admin: membership?.role === 'admin',
            member_count: 0 // Will be updated in fetchMemberCounts
          } as Group;
        });
        
        console.log('Processed groups with membership info:', processedGroups);
        
        setGroups(processedGroups);
        
        // Fetch member counts for these groups
        if (processedGroups.length > 0) {
          fetchMemberCounts(processedGroups);
        }
        
        // If no groups found, create sample ones
        if (!processedGroups.length) {
          createSampleGroups();
        }
        
        return;
      }
      
      // If RPC call succeeded, use that data
      console.log('Fetched groups via RPC:', rpcData);
      
      if (rpcData && rpcData.length > 0) {
        // Transform the data to ensure it has the required fields
        const processedGroups = rpcData.map((group: any) => ({
          ...group,
          is_member: true, // All groups from get_user_groups are the user's groups
          member_count: group.member_count || 0
        }));
        
        setGroups(processedGroups);
      } else {
        setGroups([]);
        // Add sample groups when no real groups exist
        createSampleGroups();
      }
    } catch (error: any) {
      console.error('Error in fetchGroups:', error);
      setError(error.message);
      
      // Fall back to sample groups
      createSampleGroups();
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMyGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.id) {
        console.log('User not authenticated, skipping my groups fetch');
        setGroups([]);
        setLoading(false);
        return;
      }
      
      console.log('Fetching my groups from Supabase...');
      
      // Modified query to avoid recursion in RLS policy
      // First, get the group_ids the user is a member of
      const { data: membershipData, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', user.id);
      
      if (membershipError) {
        console.error('Error fetching group memberships:', membershipError);
        setError('Failed to load your groups');
        setGroups([]);
        setLoading(false);
        return;
      }
      
      if (!membershipData || membershipData.length === 0) {
        console.log('No group memberships found for the user');
        setGroups([]);
        setLoading(false);
        return;
      }
      
      // Extract group IDs and create a role map
      const groupIds = membershipData.map(membership => membership.group_id);
      const membershipMap = new Map();
      membershipData.forEach(membership => {
        membershipMap.set(membership.group_id, {
          role: membership.role
        });
      });
      
      // Now fetch the group details in a separate query
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('id, name, description, image_url, category, created_at, created_by')
        .in('id', groupIds);
      
      if (groupsError) {
        console.error('Error fetching group details:', groupsError);
        setError('Failed to load your groups');
        setGroups([]);
        setLoading(false);
        return;
      }
      
      // Transform the data to include membership information
      const processedGroups: Group[] = (groupsData || []).map(group => {
        const memberInfo = membershipMap.get(group.id);
        
        return {
          ...group,
          member_count: 0, // Default to 0, we'll update these asynchronously
          is_member: true, // All groups here are ones the user is a member of
          is_admin: memberInfo?.role === 'admin' || false
        };
      });
      
      console.log('Processed my groups:', processedGroups);
      
      // Set the groups first for a faster UI response
      setGroups(processedGroups);
      
      // Optionally, fetch member counts in the background
      if (processedGroups.length > 0) {
        fetchMemberCounts(processedGroups);
      }
    } catch (error) {
      console.error('Error in fetchMyGroups:', error);
      toast.error('Failed to load your groups');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to fetch member counts asynchronously
  const fetchMemberCounts = async (groups: Group[]) => {
    try {
      const updatedGroups = [...groups];
      
      // Prepare a batch request for all groups to minimize API calls
      const promises = updatedGroups.map(group => 
        supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id)
      );
      
      // Execute all requests in parallel
      const results = await Promise.all(promises);
      
      // Update each group with its member count
      results.forEach((result, index) => {
        const { count, error } = result;
        if (!error && count !== null) {
          updatedGroups[index].member_count = count;
        }
      });
      
      // Update the state with the member counts
      setGroups(updatedGroups);
    } catch (error) {
      console.error('Error fetching member counts:', error);
      // Don't show an error toast here since this is a background update
    }
  };
  
  const getSampleGroups = (): Group[] => {
    return [
      {
        id: 'sample-1',
        name: 'Tech Enthusiasts',
        description: 'A group for discussing the latest in technology, gadgets, and software development. Join us for weekly virtual meetups!',
        category: 'technology',
        image_url: sampleImages[0],
        created_at: new Date().toISOString(),
        member_count: 24,
        is_member: false,
        created_by: 'sample'
      },
      {
        id: 'sample-2',
        name: 'Startup Founders',
        description: 'Connect with other entrepreneurs and discuss business strategies, funding opportunities, and growth hacking techniques.',
        category: 'business',
        image_url: sampleImages[1],
        created_at: new Date().toISOString(),
        member_count: 15,
        is_member: true,
        created_by: 'sample'
      },
      {
        id: 'sample-3',
        name: 'Fitness Community',
        description: 'Share workout tips, nutrition advice, and stay motivated together. We organize monthly fitness challenges with prizes!',
        category: 'health',
        image_url: sampleImages[2],
        created_at: new Date().toISOString(),
        member_count: 32,
        is_member: false,
        created_by: 'sample'
      },
      {
        id: 'sample-4',
        name: 'Travel Adventurers',
        description: 'Exchange travel stories, tips, and plan group adventures around the world. From backpacking to luxury experiences!',
        category: 'travel',
        image_url: sampleImages[3],
        created_at: new Date().toISOString(),
        member_count: 18,
        is_member: false,
        created_by: 'sample'
      },
      {
        id: 'sample-5',
        name: 'Professional Network',
        description: 'A space for professionals to connect, share job opportunities, and discuss career development strategies.',
        category: 'business',
        image_url: sampleImages[4],
        created_at: new Date().toISOString(),
        member_count: 27,
        is_member: false,
        created_by: 'sample'
      },
      {
        id: 'sample-6',
        name: 'Creative Arts Collective',
        description: 'For artists, designers, and creatives to share their work, collaborate on projects, and get inspired together.',
        category: 'art',
        image_url: sampleImages[5],
        created_at: new Date().toISOString(),
        member_count: 21,
        is_member: false,
        created_by: 'sample'
      }
    ];
  };
  
  const createSampleGroups = async () => {
    try {
      if (!user?.id) {
        console.error('Cannot create sample groups: user not authenticated');
        setLoading(false);
        return;
      }
      
      console.log('Creating sample groups...');
      const createdGroups: Group[] = [];
      
      const sampleGroupsData = [
        {
          name: 'Tech Enthusiasts',
          description: 'A group for discussing the latest in technology, gadgets, and software development.',
          category: 'technology',
          image_url: sampleImages[0]
        },
        {
          name: 'Startup Founders',
          description: 'Connect with other entrepreneurs and discuss business strategies, funding, and growth.',
          category: 'business',
          image_url: sampleImages[1]
        },
        {
          name: 'Fitness Community',
          description: 'Share workout tips, nutrition advice, and stay motivated together.',
          category: 'health',
          image_url: sampleImages[2]
        },
        {
          name: 'Travel Adventurers',
          description: 'Exchange travel stories, tips, and plan group adventures around the world.',
          category: 'travel',
          image_url: sampleImages[3]
        }
      ];
      
      // Insert sample groups
      for (const groupData of sampleGroupsData) {
        const { data: newGroup, error } = await supabase
          .from('groups')
          .insert({
            name: groupData.name,
            description: groupData.description,
            category: groupData.category,
            image_url: groupData.image_url,
            created_by: 'sample',
            created_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (error) {
          console.error('Error creating sample group:', error);
          continue;
        }
        
        // Make user a member of the new group
        await supabase
          .from('group_members')
          .insert({
            group_id: newGroup.id,
            user_id: user.id,
            role: 'admin',
            joined_at: new Date().toISOString()
          });
          
        console.log(`Created sample group: ${groupData.name}`);
        
        createdGroups.push({
          ...newGroup,
          member_count: 1,
          is_member: true
        });
      }
      
      if (createdGroups.length > 0) {
        setGroups(createdGroups);
      } else {
        // If creation failed, use static sample data
        setGroups(getSampleGroups());
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error in createSampleGroups:', error);
      setGroups(getSampleGroups());
      setLoading(false);
    }
  };
  
  const handleJoinGroup = async (groupId: string) => {
    try {
      // First, ensure the user is logged in
      if (!user?.id) {
        toast.error('You must be logged in to join a group');
        return;
      }
      
      console.log(`Attempting to join group ${groupId} for user ${user.id}`);
      
      // For sample groups, just simulate join
      if (groupId.startsWith('sample-')) {
        toast.success('Joined sample group! In a real app, this would connect you to the group.');
        setGroups(groups.map(group => 
          group.id === groupId 
            ? { ...group, is_member: true, member_count: group.member_count + 1 } 
            : group
        ));
        return;
      }
      
      setJoiningGroupId(groupId);
      
      // First check if user is already a member in group_members table
      console.log('Checking existing membership in group_members table...');
      const { data: existingMembership, error: membershipCheckError } = await supabase
        .from('group_members')
        .select('id, role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();
      
      if (membershipCheckError && membershipCheckError.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking membership:', membershipCheckError);
        throw new Error(`Failed to check membership status: ${membershipCheckError.message}`);
      }
      
      // If already a member in group_members table, just navigate to the group chat
      if (existingMembership) {
        console.log('User is already a member of this group in group_members table:', existingMembership);
        toast.success('You are already a member of this group');
        
        // Store in localStorage for redundancy
        try {
          const groupMemberships = JSON.parse(localStorage.getItem('groupMemberships') || '{}');
          groupMemberships[groupId] = {
            is_member: true,
            role: existingMembership.role
          };
          localStorage.setItem('groupMemberships', JSON.stringify(groupMemberships));
        } catch (storageError) {
          console.warn('Failed to update localStorage:', storageError);
        }
        
        navigate(`/groups/${groupId}/chat`);
        return;
      }
      
      // Also check the chat_group_members table (since we saw both tables in the codebase)
      console.log('Checking existing membership in chat_group_members table...');
      const { data: existingChatMembership, error: chatMembershipCheckError } = await supabase
        .from('chat_group_members')
        .select('id, is_admin')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();
      
      if (chatMembershipCheckError && chatMembershipCheckError.code !== 'PGRST116') {
        console.error('Error checking chat membership:', chatMembershipCheckError);
        // Continue anyway, as this might be a different table structure
      }
      
      // If already a member in chat_group_members table, just navigate to the group chat
      if (existingChatMembership) {
        console.log('User is already a member of this group in chat_group_members table:', existingChatMembership);
        toast.success('You are already a member of this group');
        
        // Store in localStorage for redundancy
        try {
          const groupMemberships = JSON.parse(localStorage.getItem('groupMemberships') || '{}');
          groupMemberships[groupId] = {
            is_member: true,
            role: existingChatMembership.is_admin ? 'admin' : 'member'
          };
          localStorage.setItem('groupMemberships', JSON.stringify(groupMemberships));
        } catch (storageError) {
          console.warn('Failed to update localStorage:', storageError);
        }
        
        navigate(`/groups/${groupId}/chat`);
        return;
      }
      
      // User is not a member of this group in either table, so insert a new membership
      console.log('User is not a member of this group, creating new membership...');
      
      // Insert new membership into group_members table
      const { error: insertError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member'
        });
      
      if (insertError) {
        console.error('Error joining group (group_members):', insertError);
        // Don't throw error yet, try the other table
      } else {
        console.log('Successfully joined group in group_members table');
      }
      
      // Also try inserting into chat_group_members if the previous table failed or to ensure consistency
      const { error: insertChatError } = await supabase
        .from('chat_group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          is_admin: false // equivalent to role: 'member'
        });
      
      if (insertChatError) {
        console.error('Error joining group (chat_group_members):', insertChatError);
        // If both inserts failed, then throw an error
        if (insertError) {
          throw new Error(`Failed to join group: ${insertError.message}`);
        }
      } else {
        console.log('Successfully joined group in chat_group_members table');
      }
      
      // If we got here, at least one insert was successful
      toast.success('Successfully joined the group!');
      
      // Update the local state
      setGroups(prev => prev.map(group => 
        group.id === groupId 
          ? { 
              ...group, 
              is_member: true, 
              member_count: (group.member_count || 0) + 1
            } 
          : group
      ));
      
      // Store the membership data in localStorage
      try {
        const groupMemberships = JSON.parse(localStorage.getItem('groupMemberships') || '{}');
        groupMemberships[groupId] = {
          is_member: true,
          role: 'member'
        };
        localStorage.setItem('groupMemberships', JSON.stringify(groupMemberships));
        console.log('Saved membership to localStorage:', groupMemberships);
      } catch (storageError) {
        console.warn('Failed to store membership in localStorage:', storageError);
      }

      // Navigate to group chat after successful join
      navigate(`/groups/${groupId}/chat`);
    } catch (error: any) {
      console.error('Error in handleJoinGroup:', error);
      toast.error(error.message || 'Failed to join group. Please try again later.');
    } finally {
      setJoiningGroupId(null);
    }
  };
  
  const handleUnjoinGroup = async (groupId: string) => {
    try {
      if (!user?.id) {
        toast.error('You must be logged in to leave a group');
        return;
      }
      
      console.log(`Attempting to leave group ${groupId} for user ${user.id}`);
      
      // For sample groups, just simulate unjoin
      if (groupId.startsWith('sample-')) {
        toast.success('Left sample group!');
        setGroups(groups.map(group => 
          group.id === groupId 
            ? { ...group, is_member: false, member_count: group.member_count - 1 } 
            : group
        ));
        return;
      }

      // First check if user is the creator/admin in either table
      const { data: memberData, error: memberCheckError } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();
      
      // Also check in chat_group_members
      const { data: chatMemberData, error: chatMemberCheckError } = await supabase
        .from('chat_group_members')
        .select('is_admin')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();
      
      const isAdmin = memberData?.role === 'admin' || chatMemberData?.is_admin === true;
      
      console.log('User role check results:', { 
        memberData, 
        chatMemberData, 
        isAdmin
      });

      if (isAdmin) {
        // If user is admin, show confirmation dialog
        const confirmed = window.confirm('Are you sure you want to delete this group? This action cannot be undone.');
        if (!confirmed) {
          return;
        }

        // Delete the entire group
        console.log('Deleting group as admin...');
        const { error: deleteGroupError } = await supabase
          .from('groups')
          .delete()
          .eq('id', groupId);

        if (deleteGroupError) {
          console.error('Error deleting group:', deleteGroupError);
          toast.error('Failed to delete group');
          return;
        }

        toast.success('Group deleted successfully');
        // Remove the group from the local state
        setGroups(groups.filter(group => group.id !== groupId));
        return;
      }

      // If not admin, show confirmation for leaving
      const confirmed = window.confirm('Are you sure you want to leave this group?');
      if (!confirmed) {
        return;
      }

      console.log('User confirmed leaving the group');
      
      // Try to delete from both tables
      let leaveSuccess = false;
      
      // Try group_members table
      const { error: groupMembersDeleteError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);
        
      if (groupMembersDeleteError) {
        console.error('Error leaving group (group_members):', groupMembersDeleteError);
      } else {
        console.log('Successfully left group in group_members table');
        leaveSuccess = true;
      }
      
      // Try chat_group_members table
      const { error: chatGroupMembersDeleteError } = await supabase
        .from('chat_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);
        
      if (chatGroupMembersDeleteError) {
        console.error('Error leaving group (chat_group_members):', chatGroupMembersDeleteError);
      } else {
        console.log('Successfully left group in chat_group_members table');
        leaveSuccess = true;
      }
      
      // If neither delete succeeded, show error
      if (!leaveSuccess) {
        console.error('Failed to leave group in both tables');
        toast.error('Failed to leave group');
        return;
      }

      toast.success('Successfully left the group');
      
      // Update the local state
      setGroups(groups.map(group => 
        group.id === groupId 
          ? { ...group, is_member: false, member_count: group.member_count - 1 } 
          : group
      ));

      // Update localStorage
      try {
        const groupMemberships = JSON.parse(localStorage.getItem('groupMemberships') || '{}');
        delete groupMemberships[groupId];
        localStorage.setItem('groupMemberships', JSON.stringify(groupMemberships));
        console.log('Updated localStorage after leaving group');
      } catch (storageError) {
        console.warn('Failed to update membership in localStorage:', storageError);
      }
    } catch (error) {
      console.error('Error in handleUnjoinGroup:', error);
      toast.error('Failed to leave group');
    }
  };
  
  const handleApproveMember = async (groupId: string, userId: string) => {
    try {
      if (!user?.id) {
        toast.error('You must be logged in to approve members');
        return;
      }
      
      // In this version, automatic approval is implemented
      // No status column exists in the group_members table
      toast.success('All members are automatically approved in this version');
      
      // Refresh the groups to show the latest member status
      if (activeTab === 'all') {
        fetchGroups();
      } else {
        fetchMyGroups();
      }
    } catch (error) {
      console.error('Error in handleApproveMember:', error);
      toast.error('Failed to approve member');
    }
  };
  
  const handleCreateGroup = () => {
    navigate('/groups/create');
  };
  
  const filteredGroups = groups.filter(group => 
    (selectedCategory === 'all' || group.category === selectedCategory) &&
    (searchTerm === '' || 
     group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        {/* Fixed header section with more spacing from navbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <FiUsers className="mr-3 h-6 w-6" /> {t('groups.title') || 'Groups'}
          </h1>
        </div>
        
        {/* Fixed width tabs to prevent layout shifts with Create Group button */}
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex">
            <button
              className={`py-4 px-6 font-medium text-base focus:outline-none flex-1 max-w-[160px] text-center ${
                activeTab === 'all'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('all')}
            >
              {t('groups.tabs.all') || 'All Groups'}
            </button>
            <button 
              className={`py-4 px-6 font-medium text-base focus:outline-none flex-1 max-w-[160px] text-center ${
                activeTab === 'my'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('my')}
            >
              {t('groups.tabs.my') || 'My Groups'}
            </button>
          </div>
          
          {/* Create Group button moved to be in line with tabs */}
          <Button 
            onClick={handleCreateGroup}
            className="flex items-center px-6 py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white shadow-lg"
          >
            <FiPlus className="mr-2" /> {t('groups.buttons.create') || 'Create Group'}
          </Button>
        </div>
        
        {/* Improved search and filter section with vertical category dropdown */}
        <div className="mb-8 flex flex-col gap-4">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder={t('groups.search_placeholder') || 'Find your community...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 pl-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent shadow-sm"
            />
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          
          {/* Category dropdown */}
          <div className="w-full">
            <button 
              onClick={() => setShowCategories(!showCategories)}
              className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm"
            >
              <div className="flex items-center">
                <FiFilter className="mr-2 text-gray-500" />
                <span className="font-medium">
                  {t('groups.category_label') || 'Category'}: {selectedCategory === 'all' ? (t('groups.categories.all') || 'All') : (t(`groups.categories.${selectedCategory}`) || selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1))}
                </span>
              </div>
              {showCategories ? 
                <FiChevronUp className="text-gray-500" /> : 
                <FiChevronDown className="text-gray-500" />
              }
            </button>
            
            <AnimatePresence>
              {showCategories && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 border-t-0 rounded-b-lg shadow-md overflow-hidden mt-[-1px] z-10 relative"
                >
                  <div className="max-h-60 overflow-y-auto p-2 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setShowCategories(false);
                      }}
                      className={`p-2 rounded-lg text-sm flex items-center ${
                        selectedCategory === 'all'
                        ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="mr-2">{categoryEmojis['all']}</span>
                      {t('groups.categories.all') || 'All'}
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setShowCategories(false);
                        }}
                        className={`p-2 rounded-lg text-sm flex items-center ${
                          selectedCategory === category
                          ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <span className="mr-2">{categoryEmojis[category]}</span>
                        {t(`groups.categories.${category}`) || category.charAt(0).toUpperCase() + category.slice(1)}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Fixed grid layout to prevent content shifting */}
        <div className="min-h-[60vh]">
          {loading ? (
            <div className="flex justify-center my-16">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center my-16 py-16 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <ErrorMessage message={error} />
              <Button 
                onClick={() => { if (activeTab === 'all') fetchGroups(); else fetchMyGroups(); }}
                className="mt-6 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3"
              >
                {t('buttons.tryAgain') || 'Try Again'}
              </Button>
            </div>
          ) : filteredGroups.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredGroups.map((group) => (
                <div 
                  key={group.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all transform hover:-translate-y-1 border border-gray-200 dark:border-gray-700 h-full flex flex-col"
                >
                  <div className="flex items-center justify-center h-32 bg-gradient-to-br from-rose-400/20 to-indigo-400/20 dark:from-rose-900/20 dark:to-indigo-900/20">
                    <span className="text-5xl" role="img" aria-label={group.category}>
                      {categoryEmojis[group.category] || categoryEmojis['all']}
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 truncate">
                      {group.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-3 flex-grow">
                      {group.description}
                    </p>
                    <div className="flex justify-between items-center mt-auto">
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <FiUsers className="mr-1 h-3 w-3" />
                        {group.member_count} {t('groups.members') || 'members'}
                      </span>
                      {!group.is_member ? (
                        <Button 
                          onClick={() => handleJoinGroup(group.id)}
                          disabled={joiningGroupId === group.id}
                          className="text-xs px-3 py-1 rounded-full"
                        >
                          {joiningGroupId === group.id ? (t('groups.buttons.joining') || 'Joining...') : (t('groups.buttons.join') || 'Join')}
                        </Button>
                      ) : (
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => navigate(`/groups/${group.id}/chat`)}
                            className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-full shadow-sm hover:shadow transition-all flex items-center"
                          >
                            <FiMessageSquare className="h-3 w-3 mr-1" />
                            {t('groups.buttons.chat') || 'Chat'}
                          </button>
                          <button 
                            onClick={() => handleUnjoinGroup(group.id)}
                            className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-full shadow-sm hover:shadow transition-all flex items-center"
                          >
                            {t('groups.buttons.leave') || 'Leave'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center my-16 py-16 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <FiUsers className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('groups.no_groups_found_title') || 'No groups found'}</h3>
              <p className="mt-3 text-gray-500 dark:text-gray-400 text-lg">
                {activeTab === 'my' 
                  ? (t('groups.no_my_groups_message') || "You haven't joined any groups yet.") 
                  : (t('groups.no_all_groups_message') || "Try adjusting your search or create a new group.")}
              </p>
              <Button 
                onClick={handleCreateGroup}
                className="mt-6 rounded-full bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white px-6 py-3"
              >
                {t('groups.buttons.create') || 'Create Group'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupsPage;
