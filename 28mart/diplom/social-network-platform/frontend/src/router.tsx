import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { PrivateRoute } from './components/auth/PrivateRoute';
import Layout from './components/layout/Layout';
import ErrorPage from './pages/ErrorPage';
import LoadingPage from './pages/LoadingPage';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import GroupsPage from './pages/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import GroupChatPage from './pages/GroupChatPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import EventChatPage from './pages/EventChatPage';
import ChatGroupsPage from './pages/ChatGroupsPage';
import FriendsPage from './pages/FriendsPage';
import MessagesPage from './pages/MessagesPage';
import SavedItemsPage from './pages/SavedItemsPage';
import FavoritesPage from './pages/FavoritesPage';
import SettingsPage from './pages/SettingsPage';
import HelpSupportPage from './pages/HelpSupportPage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import NotificationsPage from './pages/NotificationsPage';
import SearchResultsPage from './pages/SearchResultsPage';
import ChatPage from './pages/ChatPage';

// Lazy-loaded pages
const HomePageLazy = lazy(() => import('./pages/HomePage'));
const ProfilePageLazy = lazy(() => import('./pages/ProfilePage'));
const GroupsPageLazy = lazy(() => import('./pages/GroupsPage'));
const GroupDetailPageLazy = lazy(() => import('./pages/GroupDetailPage'));
const EventsPageLazy = lazy(() => import('./pages/EventsPage'));
const EventDetailPageLazy = lazy(() => import('./pages/EventDetailPage'));
const SettingsPageLazy = lazy(() => import('./pages/SettingsPage'));
const NotificationsPageLazy = lazy(() => import('./pages/NotificationsPage'));
const SearchResultsPageLazy = lazy(() => import('./pages/SearchResultsPage'));
const LoginPageLazy = lazy(() => import('./pages/LoginPage'));
const RegisterPageLazy = lazy(() => import('./pages/RegisterPage'));
const ChatPageLazy = lazy(() => import('./pages/ChatPage'));

// Public Route Guard (redirect if logged in)
const PublicOnlyRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingPage />;
  }
  
  return !user ? element : <Navigate to="/home" />;
};

const AppRouter: React.FC = () => {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PublicOnlyRoute element={<LoginPageLazy />} />} />
        <Route path="/register" element={<PublicOnlyRoute element={<RegisterPageLazy />} />} />
        
        {/* Layout with sidebar for authenticated routes */}
        <Route element={<Layout>{/* Provide empty children prop */}<div /></Layout>}>
          <Route path="/home" element={
            <PrivateRoute>
              <HomePageLazy />
            </PrivateRoute>
          } />
          <Route path="/profile/:userId?" element={
            <PrivateRoute>
              <ProfilePageLazy />
            </PrivateRoute>
          } />
          <Route path="/groups" element={
            <PrivateRoute>
              <GroupsPageLazy />
            </PrivateRoute>
          } />
          <Route path="/groups/:groupId" element={
            <PrivateRoute>
              <GroupDetailPageLazy />
            </PrivateRoute>
          } />
          <Route path="/events" element={
            <PrivateRoute>
              <EventsPageLazy />
            </PrivateRoute>
          } />
          <Route path="/events/:eventId" element={
            <PrivateRoute>
              <EventDetailPageLazy />
            </PrivateRoute>
          } />
          <Route path="/settings" element={
            <PrivateRoute>
              <SettingsPageLazy />
            </PrivateRoute>
          } />
          <Route path="/notifications" element={
            <PrivateRoute>
              <NotificationsPageLazy />
            </PrivateRoute>
          } />
          <Route path="/search" element={
            <PrivateRoute>
              <SearchResultsPageLazy />
            </PrivateRoute>
          } />
          <Route path="/chat" element={
            <PrivateRoute>
              <ChatPageLazy />
            </PrivateRoute>
          } />
          <Route path="/chat/:chatId" element={
            <PrivateRoute>
              <ChatPageLazy />
            </PrivateRoute>
          } />
        </Route>
        
        {/* Fallback route for 404 errors */}
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter; 