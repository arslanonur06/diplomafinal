import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { FiSend, FiPaperclip, FiMoreVertical } from 'react-icons/fi';
import { HiOutlineEmojiHappy } from 'react-icons/hi';
import Skeleton from '../ui/Skeleton';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
}

interface ProfileData {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface ChatParticipantWithProfile {
  profile: ProfileData;
}

interface DirectChatData {
  id: string;
  type: string;
  participants: ChatParticipantWithProfile[];
}

interface GroupChatData {
  id: string;
  title: string;
  members: ChatParticipantWithProfile[];
}

interface ChatDetailProps {
  chatId?: string;
}

const ChatDetail: React.FC<ChatDetailProps> = ({ chatId: propChatId }) => {
  const { chatId: paramChatId } = useParams<{ chatId: string }>();
  const chatId = propChatId || paramChatId;
  const { user } = useAuth();
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId || !user) return;

    const fetchChatAndMessages = async () => {
      setLoading(true);
      try {
        // First determine if this is a direct or group chat
        let chatData: DirectChatData | GroupChatData | null = null;
        let chatType: 'direct' | 'group' = 'direct';

        // Try to fetch as direct chat
        const { data: directChat } = await supabase
          .from('chats')
          .select(`
            id,
            type,
            participants:chat_participants(
              profile:profiles(id, full_name, avatar_url)
            )
          `)
          .eq('id', chatId)
          .single();

        if (directChat) {
          // Transform the data to match the expected type structure
          const transformedDirectChat = {
            id: directChat.id,
            type: directChat.type,
            participants: directChat.participants.map((participant: any) => ({
              profile: Array.isArray(participant.profile) 
                ? participant.profile[0] // Take the first profile if it's an array
                : participant.profile
            }))
          };
          chatData = transformedDirectChat as DirectChatData;
          chatType = 'direct';
        } else {
          // Try to fetch as group chat
          const { data: groupChat } = await supabase
            .from('group_chats')
            .select(`
              id,
              title,
              members:group_chat_members(
                profile:profiles(id, full_name, avatar_url)
              )
            `)
            .eq('id', chatId)
            .single();

          if (groupChat) {
            // Transform the data to match the expected type structure
            const transformedGroupChat = {
              id: groupChat.id,
              title: groupChat.title,
              members: groupChat.members.map((member: any) => ({
                profile: Array.isArray(member.profile) 
                  ? member.profile[0] // Take the first profile if it's an array
                  : member.profile
              }))
            };
            chatData = transformedGroupChat as GroupChatData;
            chatType = 'group';
          }
        }

        if (!chatData) {
          throw new Error('Chat not found');
        }

        // Format chat info for UI
        if (chatType === 'direct') {
          const directChatData = chatData as DirectChatData;
          const otherParticipant = directChatData.participants
            .find(p => p.profile.id !== user.id)?.profile;

          setChatInfo({
            id: directChatData.id,
            type: 'direct',
            title: otherParticipant ? otherParticipant.full_name : 'Unknown User',
            avatar: otherParticipant ? otherParticipant.avatar_url : null,
            participants: directChatData.participants.map(p => p.profile)
          });
        } else {
          const groupChatData = chatData as GroupChatData;
          setChatInfo({
            id: groupChatData.id,
            type: 'group',
            title: groupChatData.title,
            members: groupChatData.members.map(m => m.profile)
          });
        }

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            created_at,
            sender_id,
            sender:profiles(full_name, avatar_url)
          `)
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;

        if (messagesData && messagesData.length > 0) {
          setMessages(messagesData.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            created_at: msg.created_at,
            sender_id: msg.sender_id,
            sender_name: msg.sender ? msg.sender.full_name : 'Unknown User',
            sender_avatar: msg.sender ? msg.sender.avatar_url : null
          })));
        } else {
          // If no messages, create a welcome message
          setMessages([{
            id: 'welcome',
            content: chatType === 'direct' 
              ? 'Say hello to start a conversation!' 
              : 'Welcome to the group chat!',
            created_at: new Date().toISOString(),
            sender_id: 'system',
            sender_name: 'System',
            sender_avatar: null
          }]);
        }
      } catch (error) {
        console.error('Error fetching chat data:', error);
        // Create mock data if there's an error
        setChatInfo({
          id: chatId,
          type: 'direct',
          title: 'Chat Unavailable',
          avatar: null
        });
        setMessages([{
          id: 'error',
          content: 'Unable to load chat messages. Please try again later.',
          created_at: new Date().toISOString(),
          sender_id: 'system',
          sender_name: 'System',
          sender_avatar: null
        }]);
      } finally {
        setLoading(false);
      }
    };

    fetchChatAndMessages();

    // Set up realtime subscription for new messages
    const subscription = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        console.log('New message received:', payload);
        const newMsg = payload.new as any;
        
        // Fetch sender info
        supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', newMsg.sender_id)
          .single()
          .then(({ data: sender }) => {
            if (sender) {
              setMessages(prev => [...prev, {
                id: newMsg.id,
                content: newMsg.content,
                created_at: newMsg.created_at,
                sender_id: newMsg.sender_id,
                sender_name: sender.full_name,
                sender_avatar: sender.avatar_url
              }]);
            }
          });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [chatId, user]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chatId) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          content: messageContent,
          sender_id: user.id
        });

      if (error) throw error;

      // Update last message in the chat
      const updateTable = chatInfo.type === 'direct' ? 'chats' : 'group_chats';
      await supabase
        .from(updateTable)
        .update({
          last_message: messageContent,
          last_message_time: new Date().toISOString()
        })
        .eq('id', chatId);

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen p-4">
        <div className="flex items-center mb-4">
          <Skeleton circle width={40} height={40} />
          <div className="ml-3">
            <Skeleton width={150} height={20} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="my-4">
              <Skeleton width={300} height={60} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!chatInfo) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="text-center">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            Chat Not Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            The chat you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Chat header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <div className="flex items-center">
          {chatInfo.type === 'direct' ? (
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-medium">
              {chatInfo.title ? chatInfo.title.charAt(0) : '?'}
            </div>
          ) : (
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-300">
              <span className="text-lg font-medium">
                {chatInfo.title ? chatInfo.title.charAt(0) : 'G'}
              </span>
            </div>
          )}
          <div className="ml-3">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {chatInfo.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {chatInfo.type === 'direct' 
                ? 'Direct message' 
                : `${chatInfo.members?.length || 0} members`}
            </p>
          </div>
        </div>
        <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
          <FiMoreVertical className="text-gray-500 dark:text-gray-400" />
        </button>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const isCurrentUser = message.sender_id === user?.id;
          const showSenderInfo = index === 0 || messages[index - 1].sender_id !== message.sender_id;
          
          return (
            <div 
              key={message.id} 
              className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[75%] ${isCurrentUser ? 'order-1' : 'order-2'}`}>
                {(!isCurrentUser && showSenderInfo) && (
                  <div className="flex items-center mb-1">
                    <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs font-medium">
                      {message.sender_name.charAt(0)}
                    </div>
                    <span className="ml-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                      {message.sender_name}
                    </span>
                  </div>
                )}
                
                <div 
                  className={`p-3 rounded-lg ${
                    isCurrentUser 
                      ? 'bg-indigo-500 text-white' 
                      : message.sender_id === 'system'
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 italic'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <p>{message.content}</p>
                  <span 
                    className={`text-xs mt-1 block text-right ${
                      isCurrentUser ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {formatTime(message.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <div className="p-4 border-t dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <FiPaperclip />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Type a message..."
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-full focus:ring-2 focus:ring-indigo-500"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <HiOutlineEmojiHappy />
            </button>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={`p-2.5 rounded-full ${
              newMessage.trim()
                ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            <FiSend />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatDetail; 