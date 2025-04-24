import React, { useState, useEffect, useRef } from 'react'; // Removed useCallback as it's implicitly used by useEffect dependencies
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase'; // Ensure correct path
import { useAuth } from '../contexts/AuthContext'; // Ensure useAuth is imported
import { FiUsers, FiSend, FiX, FiArrowLeft, FiMoreHorizontal, FiSettings, FiVolume2, FiCalendar, FiMoreVertical, FiBellOff, FiLogOut, FiMaximize2, FiMinimize2, FiMessageSquare } from 'react-icons/fi';
import { format } from 'date-fns';
// Use standard react-i18next hook
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/ui/LoadingSpinner'; // Ensure correct path (relative: ../components/ui/LoadingSpinner)
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'; // Use the aliased path
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

// Interfaces
interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Message {
  id: string;
  created_at: string;
  content: string;
  user_id: string;
  group_id: string;
  profiles: Profile | null;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
}

interface GroupMember {
  id: string; // membership id
  user_id: string;
  group_id: string;
  profiles: Profile | null;
  is_admin?: boolean;
}

// Format timestamp function
const formatTime = (timestamp: string | null | undefined): string => {
  if (!timestamp) return "";
  try {
    // 'p' typically formats as 'h:mm AM/PM'
    return format(new Date(timestamp), 'p');
  } catch (e) {
    console.error("Error formatting time:", e);
    return "Invalid date";
  }
};

// MessageItem Component Props
interface MessageItemProps {
  message: Message;
  isCurrentUser: boolean;
  currentUserProfile?: { avatar_url: string | null | undefined; full_name: string | null | undefined };
  getMessageStyle: (isCurrentUser: boolean) => string;
}

// MessageItem Component
const MessageItem: React.FC<MessageItemProps> = React.memo(({ message, isCurrentUser, currentUserProfile, getMessageStyle }) => {
  const { t } = useTranslation();
  const profile = isCurrentUser ? currentUserProfile : message.profiles;
  const name = profile?.full_name || (isCurrentUser ? 'You' : t('group_chat.unknown_user'));
  const avatar = profile?.avatar_url || '/default-avatar.png';

  return (
    <div className={`flex items-end gap-2.5 ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-2`}>
      {!isCurrentUser && (
        <img
          src={avatar}
          alt={name}
          className="h-6 w-6 rounded-full flex-shrink-0 border border-gray-200 dark:border-gray-600 self-start mt-1"
          onError={(e) => (e.currentTarget.src = '/default-avatar.png')}
        />
      )}
      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
        {!isCurrentUser && profile && (
          <span className="text-xs font-medium mb-0.5 text-indigo-600 dark:text-indigo-400 ml-1">
            {name}
          </span>
        )}
        <div className={getMessageStyle(isCurrentUser)}>
          <p className="whitespace-pre-wrap">{message.content}</p>
          <span className={`text-[10px] mt-1 ${isCurrentUser ? 'text-indigo-100/80' : 'text-gray-500 dark:text-gray-400'} ${isCurrentUser ? 'text-right' : 'text-left'} block opacity-80`}>
            {formatTime(message.created_at)}
          </span>
        </div>
      </div>
      {isCurrentUser && (
        <img
          src={avatar}
          alt={name}
          className="h-6 w-6 rounded-full flex-shrink-0 border border-gray-200 dark:border-gray-600 self-start mt-1 ml-1"
          onError={(e) => (e.currentTarget.src = '/default-avatar.png')}
        />
      )}
    </div>
  );
});
MessageItem.displayName = 'MessageItem';

// GroupChatPage Component
const GroupChatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupInfo, setGroupInfo] = useState<Group | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMember, setIsMember] = useState(false);

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [fetchMembersError, setFetchMembersError] = useState<string | null>(null);

  // Add this state for fullscreen
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Sohbet görünüm ayarları için yeni state'ler
  const [chatTheme, setChatTheme] = useState<'default' | 'modern' | 'minimal' | 'colorful'>('default');
  const [bubbleStyle, setBubbleStyle] = useState<'rounded' | 'square' | 'bubble'>('rounded');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showSettings, setShowSettings] = useState(false);
  const [groupSettings, setGroupSettings] = useState<any>(null);

  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  // Add this function to toggle fullscreen
  const toggleFullScreen = () => {
    setIsFullScreen(prevState => !prevState);
  };

  // Fetch initial messages and group info
  const fetchInitialData = async () => {
    if (!id || !user) {
      setError(t('group_chat.error_invalid_group_id'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get user's own profile data
      const { data: userProfileData, error: userProfileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (!userProfileError && userProfileData) {
        setUserProfile(userProfileData);
      }

      // 1. Get group information from 'groups' table
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('id, name, description, image_url')
        .eq('id', id)
        .single();

      if (groupError) {
        if (groupError.code === 'PGRST116') {
          throw new Error(t('group_chat.error_group_not_found'));
        }
        throw groupError;
      }

      setGroupInfo({
        id: groupData.id,
        name: groupData.name,
        description: groupData.description,
        image_url: groupData.image_url
      } as Group);

      // 2. Check if user is a member using direct query instead of RPC
      console.log(`[fetchInitialData] Checking membership for user ${user.id} in group ${id}...`);
      try {
        // Select count from chat_group_members
        const { count, error: membershipError } = await supabase
          .from('chat_group_members')
          .select('*', { count: 'exact', head: true }) // Only need the count
          .eq('group_id', id)
          .eq('user_id', user.id);

        if (membershipError) {
          console.error('[fetchInitialData] Error checking membership via direct query:', membershipError);
          setIsMember(false); // Assume not a member on error
        } else {
          const isUserMember = (count ?? 0) > 0;
          setIsMember(isUserMember);
          console.log('[fetchInitialData] Membership check result via direct query:', { isMember: isUserMember, count: count });
        }
      } catch (memberCheckErr) {
        console.error('[fetchInitialData] Exception in membership check:', memberCheckErr);
        setIsMember(false);
      }

      // Fetch messages regardless of membership status
      // This ensures we can check errors correctly
      const { data: messageData, error: messageError } = await supabase
        .from('chat_messages') 
        .select('id, created_at, content, user_id, group_id')
        .eq('group_id', id)
        .order('created_at', { ascending: true });

      if (messageError) {
        console.log('[fetchInitialData] Error fetching messages:', messageError);
        // Only throw if it's not a permissions error
        if (!messageError.message.includes('permission denied')) {
          throw messageError;
        }
      } else {
        console.log('[fetchInitialData] Fetched messages data:', messageData);

        const processedMessages = messageData || [];
        const userIds = [...new Set(processedMessages.map(m => m.user_id))];

        let profilesMap: Record<string, Profile> = {};
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          if (!profilesError && profilesData) {
            profilesMap = profilesData.reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {} as Record<string, Profile>);
          }
        }
        const messagesWithProfiles = processedMessages.map(message => ({
          ...message,
          profiles: profilesMap[message.user_id] || null
        }));
        setMessages(messagesWithProfiles as Message[]);
      }
    } catch (err: any) {
      console.error('[fetchInitialData] Error fetching initial data:', err);
      setError(err.message || t('group_chat.error_loading_chat'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchInitialData();
  }, [user, navigate, id, t]);

  // Fetch group members
  const fetchGroupMembers = async () => {
    if (!id) return;

    try {
      setLoadingMembers(true);
      setFetchMembersError(null);

      // Use direct query with join instead of RPC
      const { data: membersData, error: membersError } = await supabase
        .from('chat_group_members')
        .select(`
          id,
          user_id,
          group_id,
          role,
          profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('group_id', id);

      if (membersError) {
        console.error('Error fetching group members directly:', membersError);
        throw membersError;
      }

      if (membersData && membersData.length > 0) {
        // Map the data directly, Supabase handles the join
        const membersWithProfiles = membersData.map((member: any) => ({
          id: member.id,
          user_id: member.user_id,
          group_id: member.group_id,
          role: member.role,
          is_admin: member.role === 'admin',
          profiles: member.profiles as Profile | null // Cast the joined profile data
        }));
        
        console.log("Fetched members with profiles:", membersWithProfiles);
        setGroupMembers(membersWithProfiles as GroupMember[]);
      } else {
        console.log("No members found for group:", id);
        setGroupMembers([]);
      }
    } catch (err: any) {
      console.error('Error fetching group members:', err);
      setFetchMembersError(t('group_chat.error_loading_members'));
    } finally {
      setLoadingMembers(false);
    }
  };

  // Fetch members when modal is shown for the first time
  useEffect(() => {
    if (showMembersModal && groupMembers.length === 0 && !loadingMembers) {
      fetchGroupMembers();
    }
  }, [showMembersModal, groupMembers.length, loadingMembers, id, t]);

  // Real-time message subscription
  useEffect(() => {
    if (!id) return;

    const channel = supabase.channel(`group_chat_${id}`)
      .on<Message>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `group_id=eq.${id}` },
        async (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new;

          // Get the profile data for the user sending the message
          if (newMessage.user_id) {
            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', newMessage.user_id)
                .single();

              setMessages((prevMessages) => {
                // Avoid duplicating messages
                if (prevMessages.some(msg => msg.id === newMessage.id)) {
                  return prevMessages;
                }
                return [...prevMessages, {
                  ...newMessage,
                  profiles: profileData || null
                } as Message];
              });
            } catch (err) {
              console.error('Error fetching profile for new message:', err);
              // Still add the message even without profile data
              setMessages((prevMessages) => {
                if (prevMessages.some(msg => msg.id === newMessage.id)) {
                  return prevMessages;
                }
                return [...prevMessages, {
                  ...newMessage,
                  profiles: null
                } as Message];
              });
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to group_chat_${id}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Subscription error on channel group_chat_${id}`);
          setError(t('group_chat.error_realtime_connection'));
        }
      });

    return () => {
      supabase.removeChannel(channel).then(status => console.log(`Unsubscribed from group_chat_${id}:`, status));
    };
  }, [id, t]);

  // Fetch group settings for chat appearance
  const fetchGroupSettings = async () => {
    if (!id || !user) return;
    
    try {
      const { data, error } = await supabase.rpc('get_chat_group_settings', {
        p_group_id: id,
        p_user_id: user.id
      });
      
      if (error) throw error;
      
      if (data) {
        setGroupSettings(data);
        // Apply saved settings if available
        if (data.theme) setChatTheme(data.theme);
        if (data.bubble_style) setBubbleStyle(data.bubble_style);
        if (data.font_size) setFontSize(data.font_size);
      }
    } catch (err) {
      console.error('Error fetching group settings:', err);
      // Continue with default settings
    }
  };

  // Save user's chat appearance settings
  const saveGroupSettings = async () => {
    if (!id || !user) return;
    
    try {
      const { error } = await supabase
        .from('group_chat_settings')
        .upsert({
          group_id: id,
          user_id: user.id,
          theme: chatTheme,
          bubble_style: bubbleStyle,
          font_size: fontSize,
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      toast.success(t('group_chat.settings_saved'));
    } catch (err) {
      console.error('Error saving chat settings:', err);
      toast.error(t('group_chat.error_saving_settings'));
    }
  };

  useEffect(() => {
    fetchInitialData();
    // Sohbet ayarlarını getir
    fetchGroupSettings();
  }, [id, user]);

  // Handle sending messages
  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    
    let tempMessageId = `temp-${Date.now()}`;

    if (!newMessage.trim() || !user || !id) return;

    const content = newMessage.trim();
    const userId = user.id;
    const groupId = id;
    
    setNewMessage(''); // Clear input immediately
    
    const tempMessage: Message = {
      id: tempMessageId, 
      content,
      user_id: userId,
      group_id: groupId,
      created_at: new Date().toISOString(),
      profiles: userProfile // Use fetched userProfile state
    };
    // Optimistically add message to UI
    setMessages(prev => [...prev, tempMessage]);
    
    try {
      // **Use direct insert instead of RPC**
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          content: content,
          group_id: groupId,
          user_id: userId
          // created_at is handled by the database default
        })
        .select('id, created_at') // Select generated id and timestamp
        .single();
      
      if (error) {
        console.error('Error inserting message directly:', error);
        // Revert optimistic update
        setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
        toast.error(t('group_chat.error_sending_message'));
        setNewMessage(content); // Restore typed message
        return;
      }
      
      console.log('Message inserted successfully:', data);
      // Update the temporary message with the real ID and timestamp from the DB
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessageId 
          ? { ...msg, id: data.id, created_at: data.created_at } 
          : msg
      ));

    } catch (err: any) {
      console.error('Error sending message catch block:', err);
      // Revert optimistic update
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      toast.error(t('group_chat.error_sending_message'));
      setNewMessage(content); // Restore typed message
    }
  };

  // Scroll to bottom effect
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Add this new function to handle joining the group
  const handleJoinGroup = async () => {
    if (!user || !id) return;
    
    const groupId = id;
    const userId = user.id;

    try {
      // Use direct insert instead of RPC
      const { data, error } = await supabase
        .from('chat_group_members')
        .insert({
          group_id: groupId,
          user_id: userId
          // role defaults to 'member', joined_at defaults to now() in DB
        })
        .select() // Select the newly inserted row (optional)
        .single(); // Expecting a single row insert
      
      if (error) {
        // Handle potential unique constraint violation if user tries to join again without leaving properly
        if (error.code === '23505') { // Unique violation code
          console.warn('User might already be a member or rejoining failed due to constraint:', error);
          // Assume the user is now a member, maybe force a state refresh
          setIsMember(true);
          toast.success(t('group_chat.joined_group_success')); // Still show success
        } else {
          console.error('Error inserting group membership:', error);
          toast.error(t('group_chat.error_joining_group'));
          return; // Stop execution on other errors
        }
      } else {
         console.log('Successfully inserted group membership:', data);
         toast.success(t('group_chat.joined_group_success'));
         setIsMember(true);
      }
      
      // Refresh initial data regardless of error type (if it was a unique constraint)
      // This will re-check actual membership status and fetch messages
      fetchInitialData(); 
      
    } catch (err: any) {
      console.error('Error in handleJoinGroup catch block:', err);
      toast.error(err.message || t('group_chat.error_joining_group'));
    }
  };

  // MessageItem component stilini dinamik olarak uygula
  const getMessageStyle = (isCurrentUser: boolean) => {
    let baseStyle = '';
    
    // Tema seçimi
    switch (chatTheme) {
      case 'modern':
        baseStyle = isCurrentUser 
          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' 
          : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100';
        break;
      case 'minimal':
        baseStyle = isCurrentUser 
          ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-100 border border-indigo-200 dark:border-indigo-800' 
          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700';
        break;
      case 'colorful':
        baseStyle = isCurrentUser 
          ? 'bg-gradient-to-br from-pink-500 to-orange-500 text-white' 
          : 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white';
        break;
      default: // default theme
        baseStyle = isCurrentUser 
          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' 
          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100';
    }
    
    // Baloncuk şekli
    switch (bubbleStyle) {
      case 'square':
        baseStyle += ' rounded-md';
        break;
      case 'bubble':
        baseStyle += isCurrentUser 
          ? ' rounded-2xl rounded-br-sm' 
          : ' rounded-2xl rounded-bl-sm';
        break;
      default: // rounded
        baseStyle += isCurrentUser 
          ? ' rounded-xl rounded-br-sm' 
          : ' rounded-xl rounded-bl-sm';
    }
    
    // Yazı boyutu
    switch (fontSize) {
      case 'small':
        baseStyle += ' text-xs';
        break;
      case 'large':
        baseStyle += ' text-base';
        break;
      default: // medium
        baseStyle += ' text-sm';
    }
    
    return `${baseStyle} px-3.5 py-2 shadow-sm break-words`;
  };

  // Render header with theme settings button
  const renderHeader = () => (
    <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center">
        <button
          onClick={() => navigate('/messages')}
          className="mr-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <FiArrowLeft size={20} />
        </button>
        <div className="flex items-center">
          {groupInfo?.image_url ? (
            <img
              src={groupInfo.image_url}
              alt={groupInfo.name}
              className="w-8 h-8 rounded-full mr-2"
              onError={(e) => (e.currentTarget.src = '/default-group.png')}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mr-2">
              <FiUsers size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
          )}
          <div>
            <h2 className="font-medium text-gray-900 dark:text-white">{groupInfo?.name}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{groupMembers.length} {t('group_chat.members')}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowMembersModal(true)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label={t('group_chat.view_members')}
        >
          <FiUsers size={18} />
        </button>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label={t('group_chat.settings')}
        >
          <FiSettings size={18} />
        </button>
        
        <button
          onClick={toggleFullScreen}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {isFullScreen ? (
            <FiMinimize2 size={18} />
          ) : (
            <FiMaximize2 size={18} />
          )}
        </button>
      </div>
    </div>
  );

  // Görünüm ayarları paneli
  const renderSettingsPanel = () => (
    <div className={`${showSettings ? 'block' : 'hidden'} p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700`}>
      <h3 className="font-medium text-gray-900 dark:text-white mb-3">{t('group_chat.appearance_settings')}</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('group_chat.chat_theme')}
        </label>
        <div className="flex space-x-2">
          {['default', 'modern', 'minimal', 'colorful'].map((theme) => (
            <button
              key={theme}
              onClick={() => setChatTheme(theme as any)}
              className={`px-3 py-1.5 text-xs rounded-full ${
                chatTheme === theme
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t(`group_chat.theme_${theme}`)}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('group_chat.bubble_style')}
        </label>
        <div className="flex space-x-2">
          {['rounded', 'square', 'bubble'].map((style) => (
            <button
              key={style}
              onClick={() => setBubbleStyle(style as any)}
              className={`px-3 py-1.5 text-xs rounded-full ${
                bubbleStyle === style
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t(`group_chat.style_${style}`)}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('group_chat.font_size')}
        </label>
        <div className="flex space-x-2">
          {['small', 'medium', 'large'].map((size) => (
            <button
              key={size}
              onClick={() => setFontSize(size as any)}
              className={`px-3 py-1.5 text-xs rounded-full ${
                fontSize === size
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t(`group_chat.size_${size}`)}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={saveGroupSettings}
          className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {t('group_chat.save_settings')}
        </button>
      </div>
    </div>
  );

  // Loading state
  if (loading && messages.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error && !groupInfo) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={() => navigate('/groups')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          {t('group_chat.back_to_groups')}
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${isFullScreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : ''}`}>
      {renderHeader()}
      {renderSettingsPanel()}
      
      {/* Rest of the component */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
        {/* Not a member message */}
        {!isMember && groupInfo && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 text-center">
            <p className="text-yellow-800 dark:text-yellow-200 mb-2">
              {t('group_chat.not_a_member') || 'You are not a member of this group.'}
            </p>
            <button
              onClick={handleJoinGroup}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition"
            >
              {t('group_chat.join_group') || 'Join Group'}
            </button>
          </div>
        )}
        
        {/* Chat Messages Area - Added padding at bottom to account for fixed input */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1 pb-16">
          {error && groupInfo && (
            <p className="text-red-500 dark:text-red-400 text-center text-sm mb-2">{error}</p>
          )}
          {loading && messages.length === 0 && (
            <div className="flex justify-center pt-4"><LoadingSpinner /></div>
          )}
          {!loading && messages.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-center pt-4">{t('group_chat.no_messages_yet')}</p>
          )}
          {!loading && messages.length > 0 && messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isCurrentUser={message.user_id === user?.id}
              currentUserProfile={{
                avatar_url: userProfile?.avatar_url,
                full_name: userProfile?.full_name
              }}
              getMessageStyle={getMessageStyle}
            />
          ))}
          <div ref={messagesEndRef} />
        </main>

        {/* Message Input Area - Only show if user is a member */}
        <footer className="fixed bottom-0 left-0 right-0 p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850">
          {isMember ? (
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t('group_chat.type_a_message')}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm transition duration-150 ease-in-out"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="flex-shrink-0 flex items-center justify-center p-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full hover:opacity-90 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={t('group_chat.send_message')}
              >
                <FiSend size={18} />
              </button>
            </form>
          ) : (
            <div className="flex justify-center items-center p-2">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t('group_chat.join_to_send_messages') || 'Join the group to send messages'}
              </p>
            </div>
          )}
        </footer>
      </div>
      
      {/* Member Modal */}
      <Dialog open={showMembersModal} onOpenChange={setShowMembersModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('group_chat.group_members')}</DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto my-4">
            {loadingMembers ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner />
              </div>
            ) : fetchMembersError ? (
              <div className="text-center py-4 text-red-500">
                {fetchMembersError}
              </div>
            ) : (
              <div className="space-y-3">
                {groupMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md">
                    <div className="flex items-center space-x-3">
                      <img
                        src={member.profiles?.avatar_url || '/default-avatar.png'}
                        alt={member.profiles?.full_name || 'Member'}
                        className="h-8 w-8 rounded-full"
                        onError={(e) => (e.currentTarget.src = '/default-avatar.png')}
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {member.profiles?.full_name || t('group_chat.unknown_user')}
                          {member.is_admin && (
                            <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 px-2 py-0.5 rounded-full">
                              {t('group_chat.admin')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {member.user_id !== user?.id && (
                      <button
                        onClick={() => navigate(`/profile/${member.user_id}`)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        {t('general.view_profile')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setShowMembersModal(false)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none"
            >
              {t('general.close')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupChatPage;

// Add this to your CSS/Tailwind config for the modal animation if desired:
/*
@keyframes modal-appear {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-modal-appear {
  animation: modal-appear 0.3s ease-out;
}
*/