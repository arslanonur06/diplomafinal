import React, { Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';
import RequireAuth from './components/RequireAuth';
import RequireProfileCompletion from './components/RequireProfileCompletion';
import { useTheme } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import LandingPage from './pages/LandingPage';
import DiscoverPage from './pages/DiscoverPage';
import FriendsPage from './pages/FriendsPage';
import FavoritesPage from './pages/FavoritesPage';
import MessagesPage from './pages/MessagesPage';
import ChatDiagnosticsPage from './pages/ChatDiagnosticsPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import CreateGroupPage from './pages/CreateGroupPage';
import GroupsPage from './pages/GroupsPage';
import EventsPage from './pages/EventsPage';
import SavedItemsPage from './pages/SavedItemsPage';
import CreateEventPage from './pages/CreateEventPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import MockUsersPage from './pages/MockUsersPage';
import GroupChatPage from './pages/GroupChatPage';
import EventChatPage from './pages/EventChatPage';

// Add ScrollToTop component to ensure pages start at the top when navigating
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Define the layout wrapper component
const ProtectedLayout: React.FC = () => (
  <RequireAuth>
    <RequireProfileCompletion>
      <MainLayout />
    </RequireProfileCompletion>
  </RequireAuth>
);

// Main App Component
const App = () => {
  const { isDarkMode } = useTheme();

  return (
    <LanguageProvider>
      <AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
        <div className={`app ${isDarkMode ? 'dark' : ''}`}>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>}>
            <ScrollToTop />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/callback" element={<AuthCallbackPage />} />

              {/* Route requiring auth but not profile completion */}
              <Route path="/complete-profile" element={
                <RequireAuth>
                  <CompleteProfilePage />
                </RequireAuth>
              } />

              {/* Protected routes using the MainLayout */}
              <Route element={<ProtectedLayout />}>
                <Route path="/home" element={<HomePage />} />
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="/profile/:id?" element={<ProfilePage />} />
                <Route path="/friends" element={<FriendsPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/messages/:id" element={<MessagesPage />} />
                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/groups/create" element={<CreateGroupPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/create" element={<CreateEventPage />} />
                <Route path="/saved" element={<SavedItemsPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/chat-diagnostics" element={<ChatDiagnosticsPage />} />
                <Route path="/mock-users" element={<MockUsersPage />} />
              </Route>

              {/* Standalone protected routes (no MainLayout) */}
              <Route path="/groups/:id/chat" element={
                <RequireAuth>
                  <RequireProfileCompletion>
                    <GroupChatPage />
                  </RequireProfileCompletion>
                </RequireAuth>
              } />
              <Route path="/events/:eventId/chat" element={
                <RequireAuth>
                  <RequireProfileCompletion>
                    <EventChatPage />
                  </RequireProfileCompletion>
                </RequireAuth>
              } />

              {/* Catch-all 404 route */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </div>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
