import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiActivity, FiAlertCircle, FiAlertTriangle, FiCheck, FiInfo, FiRefreshCw, FiUser, FiUsers } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useChatTroubleshooter } from '../components/chat/ChatTroubleshooter';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

// Standard button style for consistency
const primaryButtonStyle = "px-4 py-2 bg-gradient-to-r from-indigo-500 to-rose-500 hover:opacity-90 text-white rounded-lg transition-colors font-medium";
const secondaryButtonStyle = "px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors font-medium";

const ChatDiagnosticsPage: React.FC = () => {
  const { user } = useAuth();
  const { tWithTemplate: t } = useLanguage();
  const navigate = useNavigate();
  const { runDiagnostics, fixIssues, diagnosisResult, isFixing, clearDiagnosis } = useChatTroubleshooter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [groupMemberships, setGroupMemberships] = useState<any[]>([]);
  const [isLoadingMemberships, setIsLoadingMemberships] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchGroupMemberships();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchGroupMemberships = async () => {
    if (!user) return;

    setIsLoadingMemberships(true);
    try {
      const { data, error } = await supabase
        .from('chat_group_members')
        .select(`
          id,
          group_id,
          is_admin,
          joined_at,
          chat_groups(
            id,
            name,
            description,
            avatar_url,
            is_public,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setGroupMemberships(data || []);
    } catch (error) {
      console.error('Error fetching group memberships:', error);
    } finally {
      setIsLoadingMemberships(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      await runDiagnostics();
      // Refresh memberships after diagnostics
      fetchGroupMemberships();
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const handleAutoFix = async () => {
    const success = await fixIssues();
    if (success) {
      // Refresh memberships after fix
      fetchGroupMemberships();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <FiCheck className="h-6 w-6 text-green-500" />;
      case 'error':
        return <FiAlertCircle className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <FiAlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'info':
        return <FiInfo className="h-6 w-6 text-blue-500" />;
      default:
        return <FiActivity className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Chat Diagnostics
      </h1>
      
      {/* User Info Section */}
      {userProfile && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <FiUser className="mr-2" /> User Information
          </h2>
          <div className="space-y-3">
            <div className="flex items-center">
              <span className="text-gray-600 dark:text-gray-400 w-32">User ID:</span>
              <span className="text-gray-900 dark:text-white font-mono text-sm">{userProfile.id}</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-600 dark:text-gray-400 w-32">Name:</span>
              <span className="text-gray-900 dark:text-white">{userProfile.full_name}</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-600 dark:text-gray-400 w-32">Email:</span>
              <span className="text-gray-900 dark:text-white">{userProfile.email}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Group Memberships Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <FiUsers className="mr-2" /> Group Memberships
        </h2>
        
        {isLoadingMemberships ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : groupMemberships.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <p>You are not a member of any chat groups.</p>
            <button 
              onClick={handleRunDiagnostics}
              className={`${primaryButtonStyle} mt-4`}
              disabled={isRunningDiagnostics}
            >
              {isRunningDiagnostics ? (
                <span className="flex items-center">
                  <LoadingSpinner size="sm" className="mr-2" /> Running Diagnostics...
                </span>
              ) : (
                <span className="flex items-center">
                  <FiActivity className="mr-2" /> Run Diagnostics
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {groupMemberships.map((membership) => (
              <div key={membership.id} className="p-4 border dark:border-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                    {membership.chat_groups.avatar_url ? (
                      <img 
                        src={membership.chat_groups.avatar_url} 
                        alt={membership.chat_groups.name} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <FiUsers className="text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{membership.chat_groups.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {membership.is_admin ? 'Admin' : 'Member'} • Joined on {new Date(membership.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                  {membership.chat_groups.description || 'No description provided'}
                </div>
                <div className="mt-3 flex">
                  <button
                    onClick={() => navigate(`/messages/group/${membership.group_id}`)}
                    className={primaryButtonStyle}
                  >
                    Open Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Diagnostics Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <FiActivity className="mr-2" /> Diagnostics
          </h2>
          <div className="flex space-x-2">
            <button 
              onClick={handleRunDiagnostics}
              className={secondaryButtonStyle}
              disabled={isRunningDiagnostics}
            >
              {isRunningDiagnostics ? (
                <span className="flex items-center">
                  <LoadingSpinner size="sm" className="mr-2" /> Running...
                </span>
              ) : (
                <span className="flex items-center">
                  <FiRefreshCw className="mr-2" /> Run Diagnostics
                </span>
              )}
            </button>
            {diagnosisResult && (
              <button 
                onClick={handleAutoFix}
                className={primaryButtonStyle}
                disabled={isFixing || diagnosisResult.status === 'success'}
              >
                {isFixing ? (
                  <span className="flex items-center">
                    <LoadingSpinner size="sm" className="mr-2" /> Fixing...
                  </span>
                ) : (
                  "Auto-Fix Issues"
                )}
              </button>
            )}
          </div>
        </div>
        
        {diagnosisResult ? (
          <div>
            <div className={`p-4 rounded-lg mb-4 flex items-start ${
              diagnosisResult.status === 'success' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
              diagnosisResult.status === 'error' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
              diagnosisResult.status === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
              'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
            }`}>
              <div className="mr-3 mt-0.5">
                {getStatusIcon(diagnosisResult.status)}
              </div>
              <div>
                <h3 className="font-semibold mb-1">{diagnosisResult.message}</h3>
                {diagnosisResult.issues && diagnosisResult.issues.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    {diagnosisResult.issues.map((issue: any, index: number) => (
                      <li key={index}>
                        {issue.message}
                        {issue.details && <span className="text-sm opacity-75"> ({issue.details})</span>}
                      </li>
                    ))}
                  </ul>
                ) : diagnosisResult.status === 'success' ? (
                  <p>All systems operational. Chat functionality is working correctly.</p>
                ) : null}
              </div>
            </div>
            
            {diagnosisResult.publicGroups && diagnosisResult.publicGroups.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Available Public Groups:</h3>
                <ul className="space-y-2">
                  {diagnosisResult.publicGroups.map((group: any) => (
                    <li key={group.id} className="flex items-center">
                      <FiUsers className="mr-2 text-blue-500" />
                      {group.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>Run the diagnostics to check your chat access.</p>
            <p className="mt-2 text-sm">This will check if you can access chat groups and identify any issues.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatDiagnosticsPage; 