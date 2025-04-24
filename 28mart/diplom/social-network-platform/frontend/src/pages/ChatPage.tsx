import React from 'react';
import { useParams } from 'react-router-dom';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatDetail from '../components/chat/ChatDetail';
import { useAuth } from '../contexts/AuthContext';

const ChatPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please Sign In
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You need to be signed in to access your messages.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      {/* Sidebar - fixed width */}
      <div className="w-80 h-full border-r border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0">
        <ChatSidebar />
      </div>
      
      {/* Chat area - takes remaining width */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {chatId ? (
          <ChatDetail chatId={chatId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="max-w-md text-center p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Select a Conversation
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a conversation from the sidebar or start a new one to begin messaging.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage; 