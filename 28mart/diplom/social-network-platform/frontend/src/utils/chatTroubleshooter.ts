import { supabase } from './supabaseClient';
import toast from 'react-hot-toast';

/**
 * Utility functions to diagnose and fix chat access issues
 */

/**
 * Check if a user is a member of any groups
 */
export const checkGroupMembership = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error checking group membership:', error);
      return false;
    }
    
    return (data && data.length > 0);
  } catch (error) {
    console.error('Error in checkGroupMembership:', error);
    return false;
  }
};

/**
 * Check if a user is attending any events
 */
export const checkEventAttendance = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', userId)
      .in('status', ['going', 'interested']);
      
    if (error) {
      console.error('Error checking event attendance:', error);
      return false;
    }
    
    return (data && data.length > 0);
  } catch (error) {
    console.error('Error in checkEventAttendance:', error);
    return false;
  }
};

/**
 * Join a public group to ensure the user has chat access
 */
export const joinPublicGroup = async (userId: string): Promise<boolean> => {
  try {
    // First check if there are any public groups
    const { data: groups, error: groupError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('is_public', true)
      .limit(1);
      
    if (groupError) {
      console.error('Error finding public groups:', groupError);
      return false;
    }
    
    if (!groups || groups.length === 0) {
      console.log('No public groups found to join');
      return false;
    }
    
    const groupId = groups[0].id;
    const groupName = groups[0].name;
    
    // Check if user is already a member
    const { data: existingMemberships, error: membershipError } = await supabase
      .from('group_members')
      .select('id')
      .eq('user_id', userId)
      .eq('group_id', groupId);
      
    if (membershipError) {
      console.error('Error checking existing membership:', membershipError);
      return false;
    }
    
    // If already a member, no need to join
    if (existingMemberships && existingMemberships.length > 0) {
      console.log(`User is already a member of group: ${groupName}`);
      return true;
    }
    
    // Join the group
    const { error: joinError } = await supabase
      .from('group_members')
      .insert({
        user_id: userId,
        group_id: groupId,
        role: 'member',
        joined_at: new Date().toISOString()
      });
      
    if (joinError) {
      console.error('Error joining group:', joinError);
      return false;
    }
    
    toast.success(`Successfully joined group: ${groupName}`);
    return true;
  } catch (error) {
    console.error('Error in joinPublicGroup:', error);
    return false;
  }
};

/**
 * Create a test message in a group chat
 */
export const sendTestGroupMessage = async (userId: string): Promise<boolean> => {
  try {
    // Find a group the user is a member of
    const { data: memberships, error: membershipError } = await supabase
      .from('group_members')
      .select('group_id, groups(name)')
      .eq('user_id', userId)
      .limit(1);
      
    if (membershipError) {
      console.error('Error finding group memberships:', membershipError);
      return false;
    }
    
    if (!memberships || memberships.length === 0) {
      console.log('User is not a member of any groups');
      return false;
    }
    
    const groupId = memberships[0].group_id;
    
    // Send a test message
    const { error: messageError } = await supabase
      .from('group_messages')
      .insert({
        group_id: groupId,
        user_id: userId,
        content: 'Test message to verify chat functionality',
        created_at: new Date().toISOString()
      });
      
    if (messageError) {
      console.error('Error sending test message:', messageError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in sendTestGroupMessage:', error);
    return false;
  }
};

/**
 * Comprehensive chat access fix
 */
export const fixChatAccess = async (userId: string): Promise<{
  success: boolean;
  message: string;
  details: any;
}> => {
  try {
    const results = {
      hasGroups: false,
      hasEvents: false,
      joinedPublicGroup: false,
      sentTestMessage: false
    };
    
    // Step 1: Check if user is in any groups
    results.hasGroups = await checkGroupMembership(userId);
    
    // Step 2: Check if user is attending any events
    results.hasEvents = await checkEventAttendance(userId);
    
    // Step 3: If not in any groups, try to join a public group
    if (!results.hasGroups) {
      results.joinedPublicGroup = await joinPublicGroup(userId);
    }
    
    // Step 4: Try to send a test message if in a group
    if (results.hasGroups || results.joinedPublicGroup) {
      results.sentTestMessage = await sendTestGroupMessage(userId);
    }
    
    const success = results.hasGroups || results.joinedPublicGroup;
    
    return {
      success,
      message: success 
        ? 'Chat access should now be working properly' 
        : 'Could not fix chat access automatically',
      details: results
    };
  } catch (error) {
    console.error('Error in fixChatAccess:', error);
    return {
      success: false,
      message: 'Error attempting to fix chat access',
      details: { error }
    };
  }
};

export default {
  checkGroupMembership,
  checkEventAttendance,
  joinPublicGroup,
  sendTestGroupMessage,
  fixChatAccess
}; 