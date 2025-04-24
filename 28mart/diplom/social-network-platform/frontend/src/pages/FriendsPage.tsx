import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FiUsers, FiUserPlus, FiClock, FiUserCheck, FiUserMinus, FiRefreshCw, FiUserX, FiMessageCircle, FiMoreVertical, FiUsers as FiUserGroup, FiBriefcase, FiGlobe, FiHeart, FiX } from 'react-icons/fi';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { createNotification } from '@/utils/userUtils';

// Define a unified Profile type
interface ProfileData {
  id: string;
  username?: string;
  full_name: string;
  avatar_url?: string;
  headline?: string;
}

// Define Connection type based on user_connections table
interface ConnectionData {
  id: string; // The connection ID itself
  user_id: string; // The user who initiated or is one part of the connection
  friend_id: string; // The other user in the connection
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  updated_at: string;
}

// FriendData will now include the ProfileData and status
interface FriendData extends ProfileData {
  connection_status?: ConnectionData['status'] | 'none'; // Temporarily allow 'none' for mock data compatibility
  connection_id?: string; // Make connection_id optional
  is_requester?: boolean; // Indicates if the current user sent the request
  mutual_friends_count?: number; // Keep for suggestions UI
}

// Mock users for testing - Update structure if needed
const mockUsers: FriendData[] = [
  {
    id: 'mock-user-1',
    username: 'johndoe',
    full_name: 'John Doe',
    avatar_url: 'https://i.pravatar.cc/150?img=1',
    connection_status: 'accepted'
  },
  {
    id: 'mock-user-2',
    username: 'janedoe',
    full_name: 'Jane Doe',
    avatar_url: 'https://i.pravatar.cc/150?img=5',
    connection_status: 'accepted'
  },
  {
    id: 'mock-user-3',
    username: 'bobsmith',
    full_name: 'Bob Smith',
    avatar_url: 'https://i.pravatar.cc/150?img=3',
    connection_status: 'pending', // Example: incoming request
    is_requester: false
  },
  {
    id: 'mock-user-4',
    username: 'alicejones',
    full_name: 'Alice Jones',
    avatar_url: 'https://i.pravatar.cc/150?img=9',
    connection_status: 'none',
    mutual_friends_count: 2
  },
  {
    id: 'mock-user-5',
    username: 'sarahwilliams',
    full_name: 'Sarah Williams',
    avatar_url: 'https://i.pravatar.cc/150?img=10',
    connection_status: 'none',
    mutual_friends_count: 1
  },
  {
    id: 'mock-user-6',
    username: 'mikedavis',
    full_name: 'Mike Davis',
    avatar_url: 'https://i.pravatar.cc/150?img=7',
    connection_status: 'pending', // Example: outgoing request
    is_requester: true
  }
];

const FriendsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendData[]>([]); // Outgoing requests
  const [incomingRequests, setIncomingRequests] = useState<FriendData[]>([]);
  const [suggestions, setSuggestions] = useState<FriendData[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'suggestions'>('friends');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false); // Set to true for testing

  const loadConnections = useCallback(async () => {
    if (!user) return;
    console.log("loadConnections: Starting connection fetch...");
    
      setLoading(true);
      setError(null);
      
      if (useMockData) {
        console.log("loadConnections: Using MOCK data.");
      setFriends(mockUsers.filter(u => u.connection_status === 'accepted'));
      setIncomingRequests(mockUsers.filter(u => u.connection_status === 'pending' && !u.is_requester));
      setPendingRequests(mockUsers.filter(u => u.connection_status === 'pending' && u.is_requester));
      setSuggestions(mockUsers.filter(u => u.connection_status === 'none'));
        setLoading(false);
        return;
      }
      
      console.log("loadConnections: Fetching REAL data for user:", user.id);

    try {
      // 1. Fetch all connection IDs involving the current user
      const { data: connections, error: connectionsError } = await supabase
        .from('user_connections')
        .select('id, user_id, friend_id, status, created_at, updated_at') // Select necessary fields including timestamps
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (connectionsError) {
        console.error("loadConnections: Error fetching connections", connectionsError);
        throw connectionsError;
      }

      console.log("loadConnections: Fetched raw connections", connections);
      
      if (!connections || connections.length === 0) {
        console.log("loadConnections: No connections found.");
        setFriends([]);
        setIncomingRequests([]);
        setPendingRequests([]);
        // Suggestions will be fetched later
      } else {
          // 2. Prepare lists based on status and extract friend IDs
          const friendIds = new Set<string>();
          const acceptedConnections: ConnectionData[] = [];
          const incomingConnectionMap = new Map<string, ConnectionData>(); // Map friend_id -> connection
          const outgoingConnectionMap = new Map<string, ConnectionData>(); // Map friend_id -> connection
    
          connections.forEach(conn => {
            const otherUserId = conn.user_id === user.id ? conn.friend_id : conn.user_id;
            friendIds.add(otherUserId);
    
            if (conn.status === 'accepted') {
              acceptedConnections.push(conn);
            } else if (conn.status === 'pending') {
              if (conn.user_id === user.id) { // Outgoing
                outgoingConnectionMap.set(otherUserId, conn);
              } else { // Incoming
                incomingConnectionMap.set(otherUserId, conn);
              }
            }
          });
    
          console.log('Friend IDs to fetch profiles for:', Array.from(friendIds));
    
          // 3. Fetch profiles for all involved friend IDs
          if (friendIds.size > 0) {
              const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, headline')
                .in('id', Array.from(friendIds));
        
              if (profilesError) {
                console.error("loadConnections: Error fetching profiles", profilesError);
                throw profilesError;
              }
              
              console.log("Fetched profiles:", profilesData);
              
              const profilesMap = new Map<string, ProfileData>();
              (profilesData || []).forEach(p => profilesMap.set(p.id, p));
              
              // 4. Combine connection data with profile data
              const currentFriends: FriendData[] = acceptedConnections.map(conn => {
                  const otherUserId = conn.user_id === user.id ? conn.friend_id : conn.user_id;
                  const profile = profilesMap.get(otherUserId);
                  return profile ? { ...profile, connection_id: conn.id, connection_status: 'accepted' } : null;
              }).filter(f => f !== null) as FriendData[]; // Use simple filter and explicit cast
              
              const currentIncoming: FriendData[] = Array.from(incomingConnectionMap.entries()).map(([friendId, conn]) => {
                  const profile = profilesMap.get(friendId);
                  return profile ? { ...profile, connection_id: conn.id, connection_status: 'pending', is_requester: false } : null;
              }).filter(f => f !== null) as FriendData[]; // Use simple filter and explicit cast
              
              const currentOutgoing: FriendData[] = Array.from(outgoingConnectionMap.entries()).map(([friendId, conn]) => {
                   const profile = profilesMap.get(friendId);
                  return profile ? { ...profile, connection_id: conn.id, connection_status: 'pending', is_requester: true } : null;
              }).filter(f => f !== null) as FriendData[]; // Use simple filter and explicit cast
              
              setFriends(currentFriends);
              setIncomingRequests(currentIncoming);
              setPendingRequests(currentOutgoing);
              console.log("Processed Friends:", currentFriends);
              console.log("Processed Incoming:", currentIncoming);
              console.log("Processed Outgoing:", currentOutgoing);
       } else {
              // No friends/requests if no friend IDs
              setFriends([]);
              setIncomingRequests([]);
              setPendingRequests([]);
          }
      }

      // Fetch suggestions - users not already connected or pending
      const connectedOrPendingIds = new Set<string>([user.id]);
      connections?.forEach(conn => {
          connectedOrPendingIds.add(conn.user_id === user.id ? conn.friend_id : conn.user_id);
      });
      
      const idsToExclude = Array.from(connectedOrPendingIds);
      console.log("loadConnections: Fetching suggestions, excluding IDs:", idsToExclude);
      
      let suggestionsQuery = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, headline');
        
      // Only add the .not filter if there are IDs to exclude
      if (idsToExclude.length > 0) {
        suggestionsQuery = suggestionsQuery.not('id', 'in', `(${idsToExclude.join(',')})`); // Keep the string format here as Supabase might expect it this way for .not
        // Alternative if the above fails: pass the array directly if Supabase client supports it for .not()
        // suggestionsQuery = suggestionsQuery.not('id', 'in', idsToExclude);
      }
      
      const { data: suggestionsData, error: suggestionsError } = await suggestionsQuery.limit(10);

      if (suggestionsError) {
        console.error("loadConnections: Error fetching suggestions", suggestionsError);
        toast.error("Could not load friend suggestions.");
        setSuggestions([]);
      } else {
        const formattedSuggestions = (suggestionsData || []).map((s: ProfileData) => ({
                    ...s,
          connection_status: undefined, // Use undefined instead of 'none' for non-connections
          mutual_friends_count: Math.floor(Math.random() * 5) // Random for demo
                }));
                console.log("loadConnections: Processed suggestions", formattedSuggestions);
                setSuggestions(formattedSuggestions);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load connections');
      console.error('loadConnections: CATCH BLOCK - Error loading connections:', err);
      // Consider fallback to mock data or showing a persistent error
    } finally {
      console.log("loadConnections: Fetch finished.");
      setLoading(false);
    }
  }, [user, useMockData]); // Added useCallback and dependencies

  useEffect(() => {
    console.log("FriendsPage useEffect triggered. User:", user?.id, "UseMockData:", useMockData);
    loadConnections();
  }, [loadConnections]); // Use loadConnections in dependency array

  const handleAcceptRequest = async (request: FriendData) => {
    if (!user || !request.connection_id) return;
    console.log("handleAcceptRequest: Attempting for connection ID:", request.connection_id);

    try {
      if (useMockData) {
        console.log("handleAcceptRequest: Using MOCK accept.");
        setIncomingRequests(prev => prev.filter(r => r.connection_id !== request.connection_id));
        setFriends(prev => [...prev, { ...request, connection_status: 'accepted' }]);
        toast.success('Friend request accepted! (Mock)');
        return;
      }
      
      const { error } = await supabase
        .from('user_connections')
        .update({ status: 'accepted' })
        .eq('id', request.connection_id)
        .eq('friend_id', user.id); // Ensure only the receiver can accept

      if (error) {
        console.error('handleAcceptRequest: Error updating connection:', error);
          throw error;
      }
      console.log(`handleAcceptRequest: Connection ${request.connection_id} updated.`);

      // Notify the original requester (profile.id is the sender's ID here)
      await createNotification(
        request.id, // The ID of the user who sent the request
        'friend_accepted',
        user.id // The ID of the user who accepted
      );

      toast.success('Friend request accepted!');
      loadConnections(); // Reload data
    } catch (error) {
      console.error('handleAcceptRequest: CATCH BLOCK - Error:', error);
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async (request: FriendData) => {
     if (!user || !request.connection_id) return;
     console.log("handleRejectRequest: Attempting for connection ID:", request.connection_id);

    try {
      if (useMockData) {
        console.log("handleRejectRequest: Using MOCK reject.");
        setIncomingRequests(prev => prev.filter(r => r.connection_id !== request.connection_id));
        // Add the user back to suggestions maybe?
        setSuggestions(prev => [...prev, { ...request, connection_status: 'none' }]);
        toast.success('Friend request rejected (Mock)');
        return;
      }
      
      // Simply delete the pending request row
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', request.connection_id)
        .eq('friend_id', user.id); // Ensure only the receiver can reject

      if (error) {
        console.error('handleRejectRequest: Error deleting connection:', error);
          throw error;
      }
      console.log(`handleRejectRequest: Connection ${request.connection_id} deleted.`);

      toast.success('Friend request rejected');
      loadConnections(); // Reload data
    } catch (error) {
      console.error('handleRejectRequest: CATCH BLOCK - Error:', error);
      toast.error('Failed to reject request');
    }
  };
  
  const handleSendRequest = async (profileId: string) => {
    if (!user || user.id === profileId) {
      toast.error("Cannot send request to yourself.");
      return;
    }
    console.log("handleSendRequest: Attempting to send to profile ID:", profileId);

      if (useMockData) {
        console.log("handleSendRequest: Using MOCK send.");
       const suggestion = suggestions.find(s => s.id === profileId);
        if (suggestion) {
         setSuggestions(prev => prev.filter(s => s.id !== profileId));
         setPendingRequests(prev => [...prev, {...suggestion, connection_status: 'pending', is_requester: true}]);
          toast.success('Friend request sent! (Mock)');
        }
        return;
      }
      
    try {
      // Check if connection already exists (pending or accepted)
      const { data: existingConnection, error: checkError } = await supabase
        .from('user_connections')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${profileId}),and(user_id.eq.${profileId},friend_id.eq.${user.id})`)
        .in('status', ['pending', 'accepted']) // Check only relevant statuses
        .maybeSingle();

      if (checkError) {
        console.error("handleSendRequest: Error checking existing connection:", checkError);
        // Potentially proceed carefully or inform user
      }

      if (existingConnection) {
        if (existingConnection.status === 'accepted') {
          toast("You are already friends.");
        } else { // status === 'pending'
          toast("A friend request is already pending.");
        }
        return; // Stop if connection exists
      }

      // Insert new pending connection
      const { data: newConnection, error: insertError } = await supabase
        .from('user_connections')
        .insert({ user_id: user.id, friend_id: profileId, status: 'pending' })
        .select('id') // Select the ID of the new connection
        .single();

      if (insertError || !newConnection) {
        console.error('handleSendRequest: Error inserting connection:', insertError);
        throw insertError || new Error("Failed to create connection.");
      }
      console.log("handleSendRequest: Connection inserted with ID:", newConnection.id);

      // Create notification for the recipient
       await createNotification(
         profileId, // The user receiving the request
         'friend_request',
         user.id // The user sending the request
       );

      toast.success('Friend request sent!');
      loadConnections(); // Reload
    } catch (error: any) {
      console.error('handleSendRequest: CATCH BLOCK - Error:', error);
      toast.error(`Failed to send request: ${error.message || 'Please try again.'}`);
    }
  };
  
  const handleCancelRequest = async (request: FriendData) => {
    if (!user || !request.connection_id) return;
    console.log("handleCancelRequest: Attempting for connection ID:", request.connection_id);

    try {
      if (useMockData) {
        console.log("handleCancelRequest: Using MOCK cancel.");
         setPendingRequests(prev => prev.filter(r => r.connection_id !== request.connection_id));
         setSuggestions(prev => [...prev, { ...request, connection_status: 'none' }]);
        toast.success('Friend request cancelled (Mock)');
        return;
      }
      
      // Delete the pending request sent by the current user
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', request.connection_id)
        .eq('user_id', user.id) // Make sure only the sender can cancel
        .eq('status', 'pending');

      if (error) {
        console.error('handleCancelRequest: Error deleting connection:', error);
        toast.error('Failed to cancel friend request');
        return;
      }
      console.log(`handleCancelRequest: Connection ${request.connection_id} deleted.`);

      // Optionally delete the notification (might be complex if notification ID isn't stored)
      // You might need a different approach for notification deletion based on related IDs.

      toast.success('Friend request cancelled');
      loadConnections(); // Reload
    } catch (error) {
      console.error('handleCancelRequest: CATCH BLOCK - Error:', error);
      toast.error('Failed to cancel friend request');
    }
  };

  const handleUnjoinFriend = async (friend: FriendData) => {
     if (!user || !friend.connection_id) return;
     console.log("handleUnjoinFriend: Attempting for connection ID:", friend.connection_id);

    if (!window.confirm(`Are you sure you want to remove ${friend.full_name} as a friend?`)) return;

    try {
      if (useMockData) {
        console.log("handleUnjoinFriend: Using MOCK unfriend.");
        setFriends(prev => prev.filter(f => f.connection_id !== friend.connection_id));
        setSuggestions(prev => [...prev, { ...friend, connection_status: 'none' }]);
        toast.success('Friend removed (Mock)');
        return;
      }

      // Delete the 'accepted' connection
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', friend.connection_id)
        // Add OR condition to ensure either user can unfriend
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');


      if (error) {
        console.error('handleUnjoinFriend: Error deleting connection:', error);
        toast.error('Failed to remove friend');
        return;
      }
      console.log(`handleUnjoinFriend: Connection ${friend.connection_id} deleted.`);

      // Optionally delete related notifications

      toast.success('Friend removed successfully');
      loadConnections(); // Reload
    } catch (error) {
      console.error('handleUnjoinFriend: CATCH BLOCK - Error:', error);
      toast.error('Failed to remove friend');
    }
  };
  
  const navigateToChat = (friendId: string) => {
    if (!friendId) return;
    console.log("Navigating to chat with user:", friendId);
    navigate(`/messages/${friendId}`); // Assuming direct message route
  };

  const handleViewProfile = (profileId: string) => {
    if (!profileId) return;
    console.log("Navigating to profile:", profileId);
    navigate(`/profile/${profileId}`); // Navigate to the profile page with the ID
  };

  // renderUserCard component needs updates to use FriendData and button handlers
  const renderUserCard = (profile: FriendData, type: 'friend' | 'incoming' | 'outgoing' | 'suggestion') => {
    const isOnline = Math.random() > 0.6; // Mock online status
    const wasRecentlyActive = Math.random() > 0.3; // Mock recent status
    
    return (
      <motion.div
        key={profile.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 dark:border-gray-700 mb-3 group"
      >
        {/* User info */}
        <div className="flex items-center mb-3 sm:mb-0 w-full sm:w-auto text-center sm:text-left cursor-pointer" onClick={() => handleViewProfile(profile.id)}>
          {/* Avatar with online indicator */}
          <div className="relative mr-4">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-xl font-semibold">
                  {profile.full_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {/* Status indicator */}
            <div className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white dark:border-gray-800 ${
              isOnline ? 'bg-green-500' : wasRecentlyActive ? 'bg-yellow-400' : 'bg-gray-400'
            }`}></div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{profile.full_name}</h3>
            {profile.headline && (
               <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{profile.headline}</p>
            )}
            {!profile.headline && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
                {isOnline ? 'Online now' : wasRecentlyActive ? 'Recently active' : 'Offline'}
            </p>
            )}
            {(type === 'suggestion' && profile.mutual_friends_count && profile.mutual_friends_count > 0) && (
              <span className="text-xs mt-1 text-indigo-600 dark:text-indigo-400 flex items-center">
                <FiUserCheck className="mr-1" size={12} />
                {profile.mutual_friends_count} mutual {profile.mutual_friends_count === 1 ? 'friend' : 'friends'}
              </span>
            )}
          </div>
        </div>
        
        {/* Action buttons - Adjust based on type */}
        <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end mt-3 sm:mt-0">
          {type === 'friend' && (
            <>
              <button
                onClick={() => navigateToChat(profile.id)}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium transition duration-150 flex items-center"
              >
                <FiMessageCircle className="mr-1.5" size={16} />
                {t('buttons.message') || 'Message'}
              </button>
              {/* <button
                onClick={() => handleViewProfile(profile.id)} // Already handled by clicking the user info area
                className="px-3 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition duration-150 flex items-center"
              >
                <FiUserCheck className="mr-1.5" size={16} />
                {t('buttons.viewProfile') || 'Profile'}
              </button> */}
              {/* More options or unfriend button */}
              <div className="relative group">
                   <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                      <FiMoreVertical size={18} />
              </button>
                   <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 hidden group-hover:block z-10 border border-gray-200 dark:border-gray-700">
                <button
                        onClick={() => handleUnjoinFriend(profile)}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                        <FiUserX className="inline mr-2" /> {t('buttons.remove') || 'Remove Friend'}
                </button>
                      {/* Add other options like 'Add to Favorites' here */}
                   </div>
              </div>
            </>
          )}
          {type === 'incoming' && (
             <div className="flex space-x-2">
               <button
                 onClick={() => handleAcceptRequest(profile)}
                 className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
               >
                 {t('friends.buttons.accept') || 'Accept'}
               </button>
               <button
                 onClick={() => handleRejectRequest(profile)}
                 className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
               >
                 {t('friends.buttons.decline') || 'Decline'}
               </button>
               {/* Maybe keep View Profile button here too */}
        </div>
          )}
           {type === 'outgoing' && (
             <div className="flex space-x-2">
               <button
                 onClick={() => handleCancelRequest(profile)}
                 className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
               >
                 {t('friends.buttons.cancel') || 'Cancel Request'}
               </button>
               {/* Maybe keep View Profile button here too */}
      </div>
          )}
           {type === 'suggestion' && (
             <div className="flex space-x-2">
               <button
                 onClick={() => handleSendRequest(profile.id)}
                 className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
               >
                 <FiUserPlus className="inline mr-1" /> Connect
               </button>
               {/* Maybe remove View Profile if clicking the card does it */}
             </div>
           )}
        </div>
      </motion.div>
    );
  };

  // Modal state and handlers remain largely the same, ensure friends list for modal uses updated `friends` state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  
   const handleCreateGroup = async () => { // Make async for potential DB interaction
    if (selectedFriends.length < 1) { // Allow creating a group with just one other person initially? Or keep 2?
      toast.error('Please select at least 1 friend to create a group');
      return;
    }
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    if (!user) return;

    // TODO: Implement actual group creation logic using Supabase
    // 1. Insert into chat_groups table
    // 2. Insert current user and selected friends into chat_group_members
    // 3. Handle potential errors

    console.log("Creating group:", groupName, "with members:", [user.id, ...selectedFriends]);
    toast.success(`Group "${groupName}" creation initiated (DB logic needed)`);
    
    // Reset and close modal
    setSelectedFriends([]);
    setGroupName('');
    setShowCreateGroupModal(false);
    
    // Optionally navigate to the new group page or messages page
    // navigate('/groups'); // Or navigate(`/chat-groups/${newGroupId}`);
  };
  
  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !useMockData) { // Only show critical error if not using mock data fallback
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center mb-4 md:mb-0">
            <FiUsers className="mr-3 h-8 w-8 text-indigo-500" /> {t('friends.title') || 'Connections'}
          </h1>
          
          <div className="flex items-center space-x-4">
             {/* Create Group button - improved visibility */}
              {friends.length > 0 && (
            <button
              onClick={() => setShowCreateGroupModal(true)}
                    className="flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-sm hover:shadow-md transition-all text-sm font-medium"
            >
              <FiUserGroup className="mr-2" /> {t('friends.buttons.createGroup') || 'Create Group'}
            </button>
          )}
              {/* Toggle Mock Data Button */}
              <button
                  onClick={() => setUseMockData(prev => !prev)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                      useMockData
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
              >
                  {useMockData ? 'Using Mock Data' : 'Using Real Data'}
              </button>
          </div>
        </div>
        
        {/* Tabs Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('friends')}
             className={`py-4 px-6 font-medium text-base focus:outline-none transition-colors duration-150 ${
              activeTab === 'friends'
                ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold'
                 : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <span className="flex items-center">
              <FiUserCheck className="mr-2" /> 
              {t('friends.tabs.friends') || 'Friends'}
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                {friends.length}
              </span>
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('requests')}
             className={`py-4 px-6 font-medium text-base focus:outline-none transition-colors duration-150 ${
              activeTab === 'requests'
                ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold'
                 : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <span className="flex items-center">
              <FiClock className="mr-2" /> 
              {t('friends.tabs.requests') || 'Requests'}
              {(incomingRequests.length + pendingRequests.length) > 0 && (
                 <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${incomingRequests.length > 0 ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                  {incomingRequests.length + pendingRequests.length}
                </span>
              )}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('suggestions')}
             className={`py-4 px-6 font-medium text-base focus:outline-none transition-colors duration-150 ${
              activeTab === 'suggestions'
                ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold'
                 : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <span className="flex items-center">
              <FiUserPlus className="mr-2" /> 
               {t('friends.tabs.people') || 'Suggestions'}
               {suggestions.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {suggestions.length}
                  </span>
               )}
            </span>
          </button>
        </div>
        
        {/* Tab Content */}
        <div>
          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <div>
              {friends.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <FiHeart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">{t('friends.no_friends_message') || "You haven't connected with anyone yet."}</p>
                  <button
                    onClick={() => setActiveTab('suggestions')}
                    className="mt-4 px-5 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium"
                  >
                    {t('friends.buttons.findPeople') || 'Find People'}
                  </button>
                </div>
              ) : (
                 <div className="grid grid-cols-1 gap-4"> {/* Changed to single column list */}
                   {friends.map(friend => renderUserCard(friend, 'friend'))}
                 </div>
              )}
            </div>
          )}
          
          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div>
              {incomingRequests.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">
                    {t('friends.incoming_requests') || 'Incoming Requests'} ({incomingRequests.length})
                  </h2>
                  <div className="space-y-3">
                     {incomingRequests.map(request => renderUserCard(request, 'incoming'))}
                  </div>
                </div>
              )}
              
              {pendingRequests.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">
                    {t('friends.sent_requests') || 'Sent Requests'} ({pendingRequests.length})
                  </h2>
                  <div className="space-y-3">
                     {pendingRequests.map(request => renderUserCard(request, 'outgoing'))}
                  </div>
                </div>
              )}
              
              {incomingRequests.length === 0 && pendingRequests.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <FiUserCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">{t('friends.no_pending_requests') || 'No pending friend requests'}</p>
                </div>
              )}
            </div>
          )}
          
          {/* People/Suggestions Tab */}
          {activeTab === 'suggestions' && (
            <div>
              {suggestions.length === 0 ? (
                 <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <FiGlobe className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No suggestions available right now. Check back later!</p>
                  </div>
                ) : (
                <div className="grid grid-cols-1 gap-4"> {/* Changed to single column list */}
                   {suggestions.map(suggestion => renderUserCard(suggestion, 'suggestion'))}
                  </div>
                )}
            </div>
          )}
        </div>
        
        {/* Create Group Modal - No changes needed here unless DB logic is added */}
        {showCreateGroupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Group</h2>
                 <button onClick={() => setShowCreateGroupModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <FiX size={20} />
                 </button>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Friends ({selectedFriends.length} selected)</label>
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                    {friends.map(friend => (
                      <div 
                        key={friend.id}
                        className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                          selectedFriends.includes(friend.id) ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
                        }`}
                        onClick={() => toggleFriendSelection(friend.id)}
                      >
                        <input 
                          type="checkbox"
                          checked={selectedFriends.includes(friend.id)}
                          readOnly
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                        />
                        <div className="ml-3 flex items-center">
                          <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 mr-3">
                            {friend.avatar_url ? (
                              <img src={friend.avatar_url} alt={friend.full_name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-lg">
                                {friend.full_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{friend.full_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3 bg-gray-50 dark:bg-gray-800/50">
                <button
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={selectedFriends.length < 1 || !groupName.trim()}
                >
                  Create Group
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
