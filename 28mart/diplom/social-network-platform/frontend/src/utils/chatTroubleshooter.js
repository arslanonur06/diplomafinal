import { supabase } from '../services/supabase';

/**
 * Utility to diagnose and fix common chat access issues
 * @param {string} userId - The current user's ID
 * @returns {Promise<Object>} - Result of the fix attempt
 */
export async function fixChatAccess(userId) {
  if (!userId) {
    return {
      success: false,
      message: 'No user ID provided',
      details: {
        hasGroups: false,
        hasEvents: false,
        joinedPublicGroup: false
      }
    };
  }

  const result = {
    success: false,
    message: 'Could not fix chat access',
    details: {
      hasGroups: false,
      hasEvents: false,
      joinedPublicGroup: false
    }
  };

  try {
    console.log('Checking chat access for user:', userId);

    // Check if user is a member of any group
    const { data: groupMemberships, error: groupError } = await supabase
      .from('chat_group_members')
      .select('group_id')
      .eq('user_id', userId);

    if (groupError) {
      console.error('Error checking group memberships:', groupError);
      throw groupError;
    }

    result.details.hasGroups = groupMemberships && groupMemberships.length > 0;
    console.log('User has group memberships:', result.details.hasGroups, groupMemberships?.length || 0);

    // Check if user is attending any events
    const { data: eventAttendance, error: eventError } = await supabase
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', userId);

    if (eventError) {
      console.error('Error checking event attendance:', eventError);
      // Not throwing here as we can still proceed with groups
    } else {
      result.details.hasEvents = eventAttendance && eventAttendance.length > 0;
      console.log('User is attending events:', result.details.hasEvents, eventAttendance?.length || 0);
    }

    // If user is not in any group, try to add them to a public group
    if (!result.details.hasGroups) {
      console.log('User is not in any groups, finding a public group to join...');
      
      // Find a public group
      const { data: publicGroups, error: publicGroupError } = await supabase
        .from('chat_groups')
        .select('id, name')
        .eq('is_public', true)
        .limit(1);

      if (publicGroupError) {
        console.error('Error finding public groups:', publicGroupError);
        throw publicGroupError;
      }

      if (!publicGroups || publicGroups.length === 0) {
        console.log('No public groups found, creating one...');
        
        // Create a public group if none exists
        const { data: newGroup, error: createError } = await supabase
          .from('chat_groups')
          .insert({
            name: 'Public Chat',
            description: 'A public chat group for all users',
            created_by: userId,
            is_public: true,
            avatar_url: 'https://ui-avatars.com/api/?name=Public+Chat&background=0D8ABC&color=fff'
          })
          .select();

        if (createError) {
          console.error('Error creating public group:', createError);
          throw createError;
        }

        if (newGroup && newGroup.length > 0) {
          const groupId = newGroup[0].id;
          
          // Add the user to the new group
          const { error: memberError } = await supabase
            .from('chat_group_members')
            .insert({
              group_id: groupId,
              user_id: userId,
              is_admin: true,
              joined_at: new Date().toISOString()
            });

          if (memberError) {
            console.error('Error adding user to new public group:', memberError);
            throw memberError;
          }

          // Add a welcome message
          const { error: msgError } = await supabase
            .from('chat_messages')
            .insert({
              group_id: groupId,
              user_id: userId,
              content: 'Welcome to the public chat group! This group was created automatically for you.',
              created_at: new Date().toISOString()
            });

          if (msgError) {
            console.error('Error adding welcome message:', msgError);
            // Not throwing as the group was created successfully
          }

          result.details.joinedPublicGroup = true;
          console.log('Created new public group and added user');
        }
      } else {
        // Add user to existing public group
        const groupId = publicGroups[0].id;
        
        // Check if user is already a member
        const { data: existingMembership, error: membershipError } = await supabase
          .from('chat_group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('user_id', userId);

        if (membershipError) {
          console.error('Error checking existing membership:', membershipError);
          throw membershipError;
        }

        if (!existingMembership || existingMembership.length === 0) {
          // Add the user to the group
          const { error: joinError } = await supabase
            .from('chat_group_members')
            .insert({
              group_id: groupId,
              user_id: userId,
              is_admin: false,
              joined_at: new Date().toISOString()
            });

          if (joinError) {
            console.error('Error joining public group:', joinError);
            throw joinError;
          }

          // Add a join message
          const { error: msgError } = await supabase
            .from('chat_messages')
            .insert({
              group_id: groupId,
              user_id: userId,
              content: 'I just joined this group.',
              created_at: new Date().toISOString()
            });

          if (msgError) {
            console.error('Error adding join message:', msgError);
            // Not throwing as the user was added successfully
          }

          result.details.joinedPublicGroup = true;
          console.log('Added user to existing public group:', publicGroups[0].name);
        } else {
          // User is already a member
          result.details.hasGroups = true;
          result.details.joinedPublicGroup = true;
          console.log('User is already a member of the public group');
        }
      }
    }

    // Final check to see if the issues were fixed
    const { data: finalCheck, error: finalError } = await supabase
      .from('chat_group_members')
      .select('id')
      .eq('user_id', userId);

    if (finalError) {
      console.error('Error in final membership check:', finalError);
      throw finalError;
    }

    const hasAccess = finalCheck && finalCheck.length > 0;
    
    if (hasAccess) {
      result.success = true;
      result.message = 'Chat access has been fixed successfully!';
      console.log('Chat access fix completed successfully');
    } else {
      result.message = 'Chat access could not be fully fixed';
      console.log('Chat access fix was not successful');
    }

    return result;
  } catch (error) {
    console.error('Error fixing chat access:', error);
    result.message = `Error fixing chat access: ${error.message || 'Unknown error'}`;
    return result;
  }
} 