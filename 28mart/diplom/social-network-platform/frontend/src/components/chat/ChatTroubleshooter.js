import { useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

/**
 * ChatTroubleshooter - Diagnoses and fixes common chat access issues
 */
export const useChatTroubleshooter = () => {
  const { user } = useAuth();
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [isFixing, setIsFixing] = useState(false);

  /**
   * Run diagnostics to determine why a user can't access chat
   */
  const runDiagnostics = async () => {
    if (!user) {
      setDiagnosisResult({
        status: 'error',
        message: 'You must be logged in to use chat features',
        issues: [{ type: 'auth', message: 'Not authenticated' }]
      });
      return;
    }

    try {
      const issues = [];
      let groupAccess = false;

      // Check if chat_groups table exists
      const { count: groupTableCount, error: groupTableError } = await supabase
        .from('chat_groups')
        .select('*', { count: 'exact', head: true });

      if (groupTableError) {
        console.error('Error checking chat_groups table:', groupTableError);
        issues.push({ 
          type: 'database', 
          message: 'Chat tables may not exist in the database', 
          details: groupTableError.message
        });
      }

      // Check if user is member of any group
      const { data: memberships, error: membershipError } = await supabase
        .from('chat_group_members')
        .select('group_id, chat_groups(name, is_public)')
        .eq('user_id', user.id);

      if (membershipError) {
        console.error('Error checking group memberships:', membershipError);
        issues.push({ 
          type: 'membership', 
          message: 'Could not verify group memberships', 
          details: membershipError.message
        });
      } else if (!memberships || memberships.length === 0) {
        issues.push({ 
          type: 'membership', 
          message: 'You are not a member of any chat groups',
          fixable: true
        });
      } else {
        groupAccess = true;
      }

      // Check if there are any public groups the user could join
      const { data: publicGroups, error: publicGroupsError } = await supabase
        .from('chat_groups')
        .select('id, name')
        .eq('is_public', true)
        .limit(5);

      if (publicGroupsError) {
        console.error('Error checking public groups:', publicGroupsError);
      } else if (!publicGroups || publicGroups.length === 0) {
        issues.push({ 
          type: 'groups', 
          message: 'No public groups available',
          fixable: true
        });
      }

      // Determine overall status
      let status = 'success';
      let message = 'Chat access is working correctly';
      
      if (issues.length > 0) {
        if (issues.some(issue => issue.type === 'database')) {
          status = 'error';
          message = 'Database setup issue detected';
        } else if (!groupAccess) {
          status = 'warning';
          message = 'You cannot access any chat groups';
        } else {
          status = 'info';
          message = 'Some minor issues detected';
        }
      }

      setDiagnosisResult({
        status,
        message,
        issues,
        publicGroups: publicGroups || []
      });
      
      return { status, message, issues, publicGroups: publicGroups || [] };
    } catch (error) {
      console.error('Error during chat diagnostics:', error);
      setDiagnosisResult({
        status: 'error',
        message: 'An error occurred during diagnostics',
        issues: [{ type: 'unknown', message: error.message }]
      });
      return {
        status: 'error',
        message: 'An error occurred during diagnostics',
        issues: [{ type: 'unknown', message: error.message }]
      };
    }
  };

  /**
   * Fix chat access issues automatically
   */
  const fixIssues = async () => {
    if (!user) {
      toast.error('You must be logged in to fix chat issues');
      return false;
    }

    if (!diagnosisResult) {
      const result = await runDiagnostics();
      if (result.status === 'success') {
        toast.success('No issues to fix!');
        return true;
      }
    }
    
    setIsFixing(true);
    try {
      const issues = diagnosisResult?.issues || [];
      const fixableIssues = issues.filter(issue => issue.fixable);
      
      if (fixableIssues.length === 0) {
        toast.error('No automatically fixable issues found');
        return false;
      }
      
      let success = false;
      
      // Fix membership issues by adding the user to a public group
      if (issues.some(issue => issue.type === 'membership')) {
        const publicGroups = diagnosisResult?.publicGroups || [];
        
        if (publicGroups.length > 0) {
          // Join the first public group
          const groupToJoin = publicGroups[0];
          
          // Check if we're already a member
          const { data: existingMembership, error: checkError } = await supabase
            .from('chat_group_members')
            .select('id')
            .eq('user_id', user.id)
            .eq('group_id', groupToJoin.id)
            .maybeSingle();
          
          if (checkError) {
            throw new Error(`Failed to check existing membership: ${checkError.message}`);
          }
          
          if (!existingMembership) {
            // Add user to group
            const { error: joinError } = await supabase
              .from('chat_group_members')
              .insert({
                user_id: user.id,
                group_id: groupToJoin.id,
                joined_at: new Date().toISOString()
              });
            
            if (joinError) {
              throw new Error(`Failed to join group: ${joinError.message}`);
            }
            
            // Add welcome message to the group
            const { error: messageError } = await supabase
              .from('chat_messages')
              .insert({
                group_id: groupToJoin.id,
                user_id: user.id,
                content: 'I just joined this group!',
                created_at: new Date().toISOString()
              });
            
            if (messageError) {
              console.error('Failed to add welcome message:', messageError);
            }
            
            toast.success(`You have been added to the group: ${groupToJoin.name}`);
            success = true;
          } else {
            toast.info('You are already a member of a public group');
          }
        } else {
          // Create a new public group if none exist
          const { data: newGroup, error: createGroupError } = await supabase
            .from('chat_groups')
            .insert({
              name: 'General Chat',
              description: 'Public chat group for all users',
              created_by: user.id,
              is_public: true,
              max_members: 100,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              avatar_url: 'https://ui-avatars.com/api/?name=General+Chat&background=random'
            })
            .select();
          
          if (createGroupError) {
            throw new Error(`Failed to create public group: ${createGroupError.message}`);
          }
          
          if (newGroup && newGroup[0]) {
            // Add the user to the newly created group
            const { error: joinError } = await supabase
              .from('chat_group_members')
              .insert({
                user_id: user.id,
                group_id: newGroup[0].id,
                is_admin: true, 
                joined_at: new Date().toISOString()
              });
            
            if (joinError) {
              throw new Error(`Failed to join new group: ${joinError.message}`);
            }
            
            toast.success('Created and joined General Chat group');
            success = true;
          }
        }
      }
      
      // Re-run diagnostics to get updated status
      await runDiagnostics();
      
      return success;
    } catch (error) {
      console.error('Error fixing chat issues:', error);
      toast.error(`Failed to fix issues: ${error.message}`);
      return false;
    } finally {
      setIsFixing(false);
    }
  };

  return {
    runDiagnostics,
    fixIssues,
    diagnosisResult,
    isFixing,
    clearDiagnosis: () => setDiagnosisResult(null)
  };
};

export default useChatTroubleshooter; 