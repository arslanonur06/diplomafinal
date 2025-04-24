import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { FiSend, FiPaperclip, FiMic, FiSmile } from 'react-icons/fi';
import { format } from 'date-fns';

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

type GroupChatProps = {
  groupId: string;
  groupName?: string;
};

const GroupChat: React.FC<GroupChatProps> = ({ groupId, groupName }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('group_messages')
          .select(`
            id,
            group_id,
            sender_id,
            content,
            created_at
          `)
          .eq('group_id', groupId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        // Load messages
        if (data) {
          setMessages(data as GroupMessage[]);
          
          // Extract unique sender IDs
          const senderIds = [...new Set(data.map(msg => msg.sender_id))];
          
          // Fetch profiles for all senders
          if (senderIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .in('id', senderIds);
              
            if (profilesError) throw profilesError;
            
            // Create a map of profiles by ID
            const profileMap: Record<string, Profile> = {};
            if (profilesData) {
              profilesData.forEach((profile) => {
                // Ensure the profile has the correct shape before adding to the map
                const typedProfile: Profile = {
                  id: profile.id as string,
                  full_name: profile.full_name as string,
                  avatar_url: profile.avatar_url as string | undefined
                };
                profileMap[typedProfile.id] = typedProfile;
              });
            }
            
            setProfiles(profileMap);
          }
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [groupId]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel('group-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`
      }, async (payload) => {
        const newMsg = payload.new as GroupMessage;
        
        // Check if we have the sender's profile
        if (newMsg.sender_id && !profiles[newMsg.sender_id]) {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', newMsg.sender_id)
              .single();
            
            if (data) {
              const newProfile: Profile = {
                id: data.id as string,
                full_name: data.full_name as string,
                avatar_url: data.avatar_url as string | undefined
              };
              
              setProfiles(prev => {
                // Create a new object to avoid mutating the previous state
                const updatedProfiles = { ...prev };
                // Add the new profile with the ID as a string key
                updatedProfiles[newProfile.id as string] = newProfile;
                return updatedProfiles;
              });
            }
          } catch (error) {
            console.error('Error fetching sender profile:', error);
          }
        }
        
        setMessages(prev => [...prev, newMsg]);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [groupId, profiles]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !user?.id) return;

    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          sender_id: user.id,
          content: newMessage,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setNewMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'HH:mm');
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-md">
      {/* Chat header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{groupName || 'Group Chat'}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {messages.length} messages
          </p>
        </div>
      </div>
      
      {/* Messages container */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-850">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-gray-500 dark:text-gray-400">
            No messages yet. Be the first to send one!
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => {
              const isCurrentUser = message.sender_id === user?.id;
              const profile = profiles[message.sender_id];
              const senderName = profile?.full_name || 'Unknown User';
              const avatarUrl = profile?.avatar_url || '/default-avatar.png';
              
              // Check if this is a new sender or if enough time has passed
              const showSender = index === 0 || 
                messages[index - 1].sender_id !== message.sender_id ||
                new Date(message.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000; // 5 minutes
              
              return (
                <div 
                  key={message.id} 
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[80%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isCurrentUser && showSender && (
                      <div className="flex-shrink-0 mr-2">
                        <img 
                          src={avatarUrl} 
                          alt={senderName} 
                          className="w-8 h-8 rounded-full"
                        />
                      </div>
                    )}
                    <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                      {showSender && !isCurrentUser && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-2">
                          {senderName}
                        </span>
                      )}
                      <div 
                        className={`rounded-lg px-4 py-2 inline-block ${
                          isCurrentUser 
                            ? 'bg-indigo-500 text-white rounded-tr-none' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
                        <div className={`text-xs mt-1 ${isCurrentUser ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'}`}>
                          {formatMessageTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Message input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <button 
            type="button"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <FiPaperclip className="h-5 w-5" />
          </button>
          <input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Type a message..."
          />
          <button 
            type="button"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <FiSmile className="h-5 w-5" />
          </button>
          {newMessage.trim() ? (
            <button
              type="submit"
              className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-2 transition-colors duration-200"
            >
              <FiSend className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-2 transition-colors duration-200"
            >
              <FiMic className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default GroupChat;
