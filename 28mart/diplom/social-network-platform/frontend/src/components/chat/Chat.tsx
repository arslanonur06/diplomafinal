import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { FiSend } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import Avatar from '../common/Avatar';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: Profile;
}

interface ChatProps {
  chatId: string;
  chatType: 'group' | 'event';
  chatName: string;
}

const Chat: React.FC<ChatProps> = ({ chatId, chatType, chatName }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [tableCreated, setTableCreated] = useState(false);

  useEffect(() => {
    if (!chatId || !user) {
      console.log("Missing chatId or user:", { chatId, userId: user?.id });
      return;
    }
    
    console.log(`Initializing chat for ${chatType} with ID: ${chatId}`);
    
    // Check and create tables if needed
    const initializeChat = async () => {
      try {
        await ensureChatTablesExist();
        fetchMessages();
      } catch (err) {
        console.error("Failed to initialize chat:", err);
        setError("Failed to initialize chat. Please try again later.");
        setLoading(false);
      }
    };
    
    initializeChat();
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`${chatType}_messages:${chatId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: `${chatType}_messages`,
        filter: `${chatType}_id=eq.${chatId}`
      }, async (payload) => {
        console.log("New message received:", payload);
        // When a new message is received
        const newMsg = payload.new as any;
        
        try {
          // Fetch the profile for this message
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', newMsg.user_id)
            .single();
            
          if (profileError) {
            console.error("Error fetching profile for message:", profileError);
            return;
          }

          console.log("Adding new message with profile:", { newMsg, profileData });
          
          // Add the message with profile info to our state
          setMessages(prev => [...prev, {
            ...newMsg,
            profiles: profileData
          }]);
          
          // Scroll to bottom
          scrollToBottom();
        } catch (err) {
          console.error("Error processing new message:", err);
        }
      })
      .subscribe((status) => {
        console.log(`Subscription status for ${chatType}_messages:${chatId}:`, status);
      });
      
    return () => {
      console.log(`Removing channel for ${chatType}_messages:${chatId}`);
      supabase.removeChannel(channel);
    };
  }, [chatId, chatType, user]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const ensureChatTablesExist = async () => {
    try {
      // Check if the table exists
      const { error: checkError } = await supabase
        .from(`${chatType}_messages`)
        .select('id')
        .limit(1);
      
      // If error is "relation does not exist", create the table
      if (checkError && checkError.message.includes('relation') && checkError.message.includes('does not exist')) {
        console.log(`${chatType}_messages table does not exist, attempting to create it...`);
        
        // We need to create the table via RPC since we don't have direct access to create tables
        // This assumes you have a stored procedure that can create the table
        const { error: createError } = await supabase.rpc('create_chat_tables', { 
          chat_type: chatType 
        });
        
        if (createError) {
          console.error(`Failed to create ${chatType}_messages table:`, createError);
          throw new Error(`Chat functionality is not available. Please contact support.`);
        }
        
        setTableCreated(true);
        console.log(`${chatType}_messages table created successfully`);
      }
    } catch (err) {
      console.error(`Error ensuring ${chatType}_messages table exists:`, err);
      // If we can't create the table, we'll just try to continue
      // The fetchMessages function will handle the error if the table still doesn't exist
    }
  };

  const fetchMessages = async (retryCount = 0) => {
    if (!chatId) {
      console.error("Cannot fetch messages: Missing chatId");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching messages for ${chatType}_id: ${chatId}`);
      
      // Try to get messages from the table
      const { data, error } = await supabase
        .from(`${chatType}_messages`)
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles:user_id(id, full_name, avatar_url)
        `)
        .eq(`${chatType}_id`, chatId)
        .order('created_at', { ascending: true })
        .throwOnError();
        
      if (error) {
        console.error(`Error fetching ${chatType} messages:`, error);
        
        // Cast error to a type that has message
        const typedError = error as { message?: string };
        
        // If the table doesn't exist and we already tried to create it
        if (typedError.message && typedError.message.includes('relation') && typedError.message.includes('does not exist') && tableCreated) {
          setError(`Chat system is being set up. Please try again in a few minutes.`);
        } else {
          setError(`Failed to load messages. ${typedError.message || 'Unknown error'}`);
        }
        throw error;
      }
      
      console.log(`Fetched ${data?.length || 0} messages`);
      
      // Transform the data to match our Message interface
      const transformedMessages = data.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        created_at: msg.created_at,
        user_id: msg.user_id,
        profiles: msg.profiles
      }));
      
      setMessages(transformedMessages as Message[]);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      
      // Handle 406 Not Acceptable errors with a retry mechanism
      if (err.status === 406 && retryCount < 3) {
        console.log(`Received 406 error during message fetch, retrying (${retryCount + 1}/3)...`);
        
        // Wait with exponential backoff before retrying
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          fetchMessages(retryCount + 1);
        }, delay);
        
        return;
      }
      
      if (!error) {
        setError(err instanceof Error ? err.message : 'Failed to load chat messages');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || !chatId) {
      if (!newMessage.trim()) console.log("Cannot send empty message");
      if (!user) console.log("User not authenticated");
      if (!chatId) console.log("Missing chatId");
      return;
    }
    
    try {
      console.log(`Sending message to ${chatType}_id: ${chatId}`);
      
      const messageData = {
        content: newMessage.trim(),
        user_id: user.id,
        [`${chatType}_id`]: chatId
      };
      
      console.log("Message data:", messageData);
      
      const { error } = await supabase
        .from(`${chatType}_messages`)
        .insert(messageData);
        
      if (error) {
        console.error(`Error sending ${chatType} message:`, error);
        toast.error("Failed to send message. Please try again.");
        throw error;
      }
      
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    
    // Check if the message is from today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    // Check if the message is from yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise return the full date
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-200">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 dark:border-indigo-400"></div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-red-500 text-center">
              <p>{error}</p>
              <button 
                onClick={() => fetchMessages()} 
                className="mt-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-rose-500 text-white rounded-lg hover:opacity-90 transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500 dark:text-gray-400">No messages yet. Be the first to say something!</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isFirstMessageOfDay = index === 0 || 
                formatDate(message.created_at) !== formatDate(messages[index - 1].created_at);
              
              return (
                <React.Fragment key={message.id}>
                  {isFirstMessageOfDay && (
                    <div className="flex justify-center my-4">
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-500 dark:text-gray-400 transition-colors duration-200">
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${message.user_id === user?.id 
                      ? 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'} rounded-lg px-4 py-2 transition-colors duration-200`}>
                      {message.user_id !== user?.id && (
                        <div className="flex items-center mb-1">
                          <Avatar 
                            src={message.profiles?.avatar_url || undefined} 
                            name={message.profiles?.full_name || 'User'} 
                            size="sm" 
                          />
                          <span className="font-medium text-xs ml-2">
                            {message.profiles?.full_name || 'Unknown User'}
                          </span>
                        </div>
                      )}
                      <p>{message.content}</p>
                      <span className={`text-xs block text-right ${message.user_id === user?.id ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'} transition-colors duration-200`}>
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Message Input */}
      <div className="border-t border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-[#121212] transition-colors duration-200">
        <form onSubmit={sendMessage} className="flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${chatName}...`}
            className="flex-1 border border-gray-300 dark:border-white/10 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500 bg-white dark:bg-white/5 text-gray-800 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-white/40 transition-colors duration-200"
          />
          <button
            type="submit"
            className="bg-gradient-to-r from-indigo-500 to-rose-500 hover:opacity-90 text-white px-4 py-2 rounded-r-lg transition-colors duration-200"
            disabled={!newMessage.trim()}
          >
            <FiSend />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;