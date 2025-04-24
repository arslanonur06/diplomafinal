import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { FiSend } from 'react-icons/fi';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  is_read: boolean;
  profiles?: Profile;
}

interface DirectMessageChatProps {
  conversationId: string;
  otherUserId: string;
  otherUserName?: string;
  otherUserAvatar?: string;
}

// Veritabanından gelen veriyi Message formatına dönüştüren yardımcı fonksiyon
const formatMessage = (rawData: any): Message => {
  const profileData = Array.isArray(rawData.profiles) && rawData.profiles.length > 0
    ? {
        id: rawData.profiles[0].id,
        full_name: rawData.profiles[0].full_name,
        avatar_url: rawData.profiles[0].avatar_url
      }
    : rawData.profiles && !Array.isArray(rawData.profiles)
      ? rawData.profiles
      : undefined;

  return {
    id: rawData.id,
    content: rawData.content,
    created_at: rawData.created_at,
    sender_id: rawData.sender_id,
    receiver_id: rawData.receiver_id,
    is_read: rawData.is_read || false,
    profiles: profileData
  };
};

const DirectMessageChat: React.FC<DirectMessageChatProps> = ({ 
  conversationId, 
  otherUserId,
  otherUserName,
  otherUserAvatar
}) => {
  const { tWithTemplate: t } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mesajları getir
  useEffect(() => {
    if (!conversationId || !user || !otherUserId) return;
    
    const fetchMessages = async () => {
      try {
        setLoading(true);
        console.log(`Fetching messages between user ${user.id} and ${otherUserId}`);
        
        const { data, error } = await supabase
          .from('direct_messages')
          .select(`
            id,
            content,
            created_at,
            sender_id,
            receiver_id,
            is_read,
            profiles:sender_id(id, full_name, avatar_url)
          `)
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        if (data) {
          // Verileri formatla ve tipini düzelt
          const formattedMessages = data.map(msg => formatMessage(msg));
          setMessages(formattedMessages);
          
          // Mesajları okundu olarak işaretle
          const unreadMessagesIds = data
            .filter(msg => msg.receiver_id === user.id && !msg.is_read)
            .map(msg => msg.id);
            
          if (unreadMessagesIds.length > 0) {
            await supabase
              .from('direct_messages')
              .update({ is_read: true })
              .in('id', unreadMessagesIds);
          }
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessages();
    
    // Gerçek zamanlı mesaj aboneliği
    const channel = supabase
      .channel(`direct_messages:${user.id}_${otherUserId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'direct_messages',
        filter: `or(and(sender_id=eq.${user.id},receiver_id=eq.${otherUserId}),and(sender_id=eq.${otherUserId},receiver_id=eq.${user.id}))`
      }, async (payload) => {
        // Yeni mesaj geldiğinde
        if (payload.new) {
          console.log('New message received:', payload.new);
          
          // Gönderen profil bilgisini al
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();
          
          // Yeni mesajı formatla
          const newMsg = formatMessage({
            ...payload.new,
            profiles: profileData
          });
          
          setMessages(prevMessages => [...prevMessages, newMsg]);
          
          // Eğer mesaj karşı taraftan geldiyse okundu olarak işaretle
          if (payload.new.sender_id === otherUserId) {
            await supabase
              .from('direct_messages')
              .update({ is_read: true })
              .eq('id', payload.new.id);
          }
          
          // Otomatik aşağı kaydır
          scrollToBottom();
        }
      })
      .subscribe();
    
    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, otherUserId]);
  
  // Mesajlar yüklendiğinde otomatik aşağı kaydır
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || sending) return;
    
    const content = newMessage.trim();
    
    try {
      setSending(true);
      
      // Mesaj içeriğini temizle (kullanıcı deneyimi için erken yapılır)
      setNewMessage('');
      
      // Mesajı optimistik olarak UI'a ekleyelim
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`, // Geçici ID
        content: content,
        created_at: new Date().toISOString(),
        sender_id: user.id,
        receiver_id: otherUserId,
        is_read: false,
        profiles: {
          id: user.id,
          full_name: user.user_metadata?.full_name || 'You',
          avatar_url: user.user_metadata?.avatar_url
        }
      };
      
      // Önce UI'ı güncelleyelim
      setMessages(prevMessages => [...prevMessages, optimisticMessage]);
      
      // Sonra mesajı veritabanına kaydedelim
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          content: content,
          sender_id: user.id,
          receiver_id: otherUserId,
          is_read: false
        })
        .select();
      
      if (error) throw error;
      
      // Gerçek mesaj ID ile optimistik mesajı değiştirelim (eğer data varsa)
      if (data && data.length > 0) {
        const realMessage = formatMessage(data[0]);
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === optimisticMessage.id ? realMessage : msg
          )
        );
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(t('failed_to_send_message'));
      // Hata durumunda mesajı geri yükle
      setNewMessage(content);
    } finally {
      setSending(false);
      // Mesaj gönderildikten sonra scrollu aşağıya kaydır
      scrollToBottom();
    }
  };
  
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };
  
  if (loading && messages.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400 text-center">
              {t('no_messages_start_conversation')}
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {messages.map((message) => {
              const isCurrentUser = message.sender_id === user?.id;
              const profile = message.profiles || {
                id: isCurrentUser ? user?.id : otherUserId,
                full_name: isCurrentUser ? user?.user_metadata?.full_name : otherUserName || '',
                avatar_url: isCurrentUser ? user?.user_metadata?.avatar_url : otherUserAvatar || null
              };
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 ${
                      isCurrentUser
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                    }`}
                  >
                    <div className="text-sm">{message.content}</div>
                    <div
                      className={`text-xs mt-1 flex justify-between items-center ${
                        isCurrentUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <span>{formatTime(message.created_at)}</span>
                      {isCurrentUser && (
                        <span className="ml-2">
                          {message.is_read ? t('read') : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      <form onSubmit={handleSendMessage} className="border-t dark:border-gray-700 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t('type_a_message')}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-2 bg-blue-500 text-white rounded-full disabled:opacity-50 transition-opacity"
          >
            <FiSend size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default DirectMessageChat;
