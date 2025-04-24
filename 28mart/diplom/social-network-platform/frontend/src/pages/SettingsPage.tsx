import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../services/supabase';
import { useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  FiSettings, FiBell, FiLock, FiHelpCircle, FiUser, FiDroplet, FiShield, FiTrash2,
  FiChevronDown, FiBook, FiLogOut
} from 'react-icons/fi';
import { FaTelegram, FaEnvelope, FaHeadset, FaSearch, FaExternalLinkAlt, FaVideo } from 'react-icons/fa';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface UserProfile {
  name: string;
  email: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  marketing_notifications: boolean;
}

interface PrivacySettings {
  profile_visibility: 'public' | 'private' | 'connections';
  show_email: boolean;
  show_location: boolean;
}

const SettingsPage: React.FC = () => {
  const { user, signOut, setUser } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [helpSearchQuery, setHelpSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      loadUserSettings();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadUserSettings = async () => {
    setLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (profile) {
        setProfileData({
          name: profile.full_name || '',
          email: user?.email || '',
        });
        setNotificationSettings({
          email_notifications: profile.email_notifications !== false,
          push_notifications: profile.push_notifications !== false,
          marketing_notifications: profile.marketing_notifications || false,
        });
        setPrivacySettings({
          profile_visibility: profile.profile_visibility || 'public',
            show_email: profile.show_email || false,
          show_location: profile.show_location || false,
        });
      } else {
        console.log("Profile not found for user:", user?.id);
        setProfileData({ name: '', email: user?.email || '' });
        setNotificationSettings({ email_notifications: true, push_notifications: true, marketing_notifications: false });
        setPrivacySettings({ profile_visibility: 'public', show_email: false, show_location: false });
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!profileData) return;
    const { name, value } = e.target;
    setProfileData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleNotificationChange = (key: keyof NotificationSettings) => {
    if (!notificationSettings) return;
    setNotificationSettings(prev => prev ? { ...prev, [key]: !prev[key] } : null);
  };

  const handlePrivacyChange = (key: keyof PrivacySettings, value: string) => {
    if (!privacySettings) return;
    setPrivacySettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleSaveAll = async (section: string) => {
    if (!user) return;
    setSaving(true);
    try {
      let updates: Partial<UserProfile & NotificationSettings & PrivacySettings> = {};
      let errorOccurred = false;

      if (section === 'profile' && profileData) {
        updates = { ...updates, ...profileData };
        const { error: profileError } = await supabase
        .from('profiles')
          .update(updates)
        .eq('id', user.id);
        if (profileError) {
          console.error('Error saving profile:', profileError);
          errorOccurred = true;
        }
      } else if (section === 'notifications' && notificationSettings) {
         // Implement notification saving logic with supabase
         console.log("Saving notifications:", notificationSettings); 
         await new Promise(res => setTimeout(res, 500)); // Placeholder
      } else if (section === 'privacy' && privacySettings) {
         // Implement privacy saving logic with supabase
          console.log("Saving privacy:", privacySettings);
          await new Promise(res => setTimeout(res, 500)); // Placeholder
      } else if (section === 'password') {
          if (newPassword !== confirmPassword || !newPassword) {
             toast.error("Passwords do not match or are empty.");
             errorOccurred = true;
          } else {
            const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
            if (passwordError) {
                console.error('Error updating password:', passwordError);
                toast.error(`Password Update Failed: ${passwordError.message}`);
                 errorOccurred = true;
             } else {
                 setNewPassword('');
                 setConfirmPassword('');
                 toast.success('Password updated successfully!');
             }
         }
      }

      if (!errorOccurred && section !== 'password') {
        toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved!`);
      }
       if (errorOccurred) {
          toast.error(`Failed to save ${section} settings.`);
       }

    } catch (err: any) {
      console.error(`Error saving ${section} settings:`, err);
      toast.error(`Failed to save ${section} settings.`);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!user) return;
    if (window.confirm('Are you sure you want to delete your account permanently? This action cannot be undone.')) {
    setSaving(true);
    try {
        // Call a Supabase function to handle cascading deletes or necessary cleanup
        const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;

        toast.success('Account deleted successfully.');
        setUser(null);
        navigate('/'); 
    } catch (error: any) {
        console.error('Error deleting account:', error);
        toast.error(`Failed to delete account: ${error.message}`);
    } finally {
       setSaving(false);
      }
    }
  };

  const handleThemeChange = (theme: 'light' | 'dark') => {
    if ((theme === 'dark' && !isDarkMode) || (theme === 'light' && isDarkMode)) {
      toggleDarkMode();
    }
  };
  
  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout Error:', error);
      toast.error('Logout failed. Please try again.');
    }
  };

  const handleTelegramSupport = () => {
    window.open('https://t.me/your_support_bot', '_blank');
    toast.success(t('helpAndSupport.openingTelegram') || 'Opening Telegram support');
  };

  const handleEmailSupport = () => {
    window.location.href = 'mailto:support@yourapp.com';
    toast.success(t('helpAndSupport.openingEmail') || 'Opening email client');
  };

  const handleHelpCenter = () => {
    toast.success(t('helpAndSupport.redirectingToHelp') || 'Redirecting to Help Center...');
    setTimeout(() => {
      window.open('https://help.yourdomain.com', '_blank'); // Replace with your actual help center URL
    }, 1000);
  };
  
  const handleViewDocs = () => {
      toast.success(t('helpAndSupport.redirectingToDocs') || 'Opening Documentation...');
      setTimeout(() => {
         window.open('https://docs.yourdomain.com', '_blank'); // Replace with actual docs URL
      }, 1000);
  }

  const handleWatchTutorials = () => {
      toast.success(t('helpAndSupport.redirectingToTutorials') || 'Opening Tutorials...');
      setTimeout(() => {
         window.open('https://youtube.com/yourchannel', '_blank'); // Replace with actual tutorials URL
      }, 1000);
  }

  const renderProfileSection = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('settings.profile.title') || 'Profile Information'}</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.profile.fullNameLabel') || 'Full Name'}</label>
          <input
            type="text"
            id="name"
            name="name"
            value={profileData?.name || ''}
            onChange={handleProfileChange}
            disabled={saving}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.profile.emailLabel') || 'Email Address'}</label>
          <input
            type="email"
            id="email"
            name="email"
            value={profileData?.email || ''}
            disabled
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          />
        </div>
      </div>
      <div className="text-right">
        <Button type="submit" onClick={() => handleSaveAll('profile')} disabled={saving || loading} className="px-5 py-2.5 rounded-lg">
          {saving ? (t('buttons.saving') || 'Saving...') : (t('buttons.saveProfile') || 'Save Profile')}
        </Button>
              </div>
                  </div>
  );

  const renderNotificationSection = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('settings.notifications.title') || 'Notifications'}</h2>
      <div className="space-y-4 divide-y divide-gray-200 dark:divide-gray-700">
        <div className="flex items-center justify-between pt-4">
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-200">{t('settings.notifications.emailLabel') || 'Email Notifications'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.notifications.emailDescription') || 'Receive important updates via email.'}</p>
          </div>
          <input
            type="checkbox"
            id="email_notifications"
            name="email_notifications"
            checked={notificationSettings?.email_notifications || false}
            onChange={() => handleNotificationChange('email_notifications')}
            disabled={saving}
            className="form-checkbox h-5 w-5 text-rose-600 rounded focus:ring-rose-500 cursor-pointer"
          />
        </div>
        <div className="flex items-center justify-between pt-4">
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-200">{t('settings.notifications.pushLabel') || 'Push Notifications'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.notifications.pushDescription') || 'Get notified directly in the app (requires browser permission).'}</p>
          </div>
                    <input
            type="checkbox"
            id="push_notifications"
            name="push_notifications"
            checked={notificationSettings?.push_notifications || false}
            onChange={() => handleNotificationChange('push_notifications')}
            disabled={saving}
            className="form-checkbox h-5 w-5 text-rose-600 rounded focus:ring-rose-500 cursor-pointer"
                    />
                  </div>
         <div className="flex items-center justify-between pt-4">
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-200">{t('settings.notifications.marketingLabel') || 'Marketing Emails'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.notifications.marketingDescription') || 'Receive promotional offers and news.'}</p>
          </div>
          <input
            type="checkbox"
            id="marketing_notifications"
            name="marketing_notifications"
            checked={notificationSettings?.marketing_notifications || false}
            onChange={() => handleNotificationChange('marketing_notifications')}
            disabled={saving}
            className="form-checkbox h-5 w-5 text-rose-600 rounded focus:ring-rose-500 cursor-pointer"
          />
        </div>
      </div>
       <div className="text-right">
        <Button type="submit" onClick={() => handleSaveAll('notifications')} disabled={saving || loading} className="px-5 py-2.5 rounded-lg">
          {saving ? (t('buttons.saving') || 'Saving...') : (t('settings.notifications.saveButton') || 'Save Notifications')}
        </Button>
      </div>
          </div>
  );

  const renderPrivacySection = () => (
     <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('settings.privacy.title') || 'Privacy Settings'}</h2>
            <div className="space-y-4">
           <div>
             <label htmlFor="profile_visibility" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.privacy.profileVisibilityLabel') || 'Profile Visibility'}</label>
             <select
                id="profile_visibility"
                name="profile_visibility"
                value={privacySettings?.profile_visibility || 'public'}
                onChange={(e) => handlePrivacyChange('profile_visibility', e.target.value)}
                disabled={saving}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
             >
                <option value="public">{t('settings.privacy.visibilityOptions.public') || 'Public (Visible to everyone)'}</option>
                <option value="connections">{t('settings.privacy.visibilityOptions.connections') || 'Connections Only'}</option>
                <option value="private">{t('settings.privacy.visibilityOptions.private') || 'Private (Only you)'}</option>
             </select>
           </div>
           <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <label htmlFor="show_email" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.privacy.showEmailLabel') || 'Show Email on Profile'}</label>
              <input
                 type="checkbox"
                 id="show_email"
                 name="show_email"
                 checked={privacySettings?.show_email || false}
                 onChange={(e) => handlePrivacyChange('show_email', e.target.checked.toString())}
                 disabled={saving}
                 className="form-checkbox h-5 w-5 text-rose-600 rounded focus:ring-rose-500 cursor-pointer"
              />
           </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <label htmlFor="show_location" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.privacy.showLocationLabel') || 'Show Location on Profile'}</label>
                  <input
                    type="checkbox"
                 id="show_location"
                 name="show_location"
                 checked={privacySettings?.show_location || false}
                 onChange={(e) => handlePrivacyChange('show_location', e.target.checked.toString())}
                 disabled={saving}
                 className="form-checkbox h-5 w-5 text-rose-600 rounded focus:ring-rose-500 cursor-pointer"
                  />
                </div>
        </div>
         <div className="text-right">
           <Button type="submit" onClick={() => handleSaveAll('privacy')} disabled={saving || loading} className="px-5 py-2.5 rounded-lg">
              {saving ? (t('buttons.saving') || 'Saving...') : (t('settings.privacy.saveButton') || 'Save Privacy Settings')}
           </Button>
        </div>
          </div>
  );

   const renderAppearanceSection = () => (
     <div className="space-y-6">
       <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('settings.appearance.title') || 'Appearance'}</h2>
            <div className="space-y-4">
          <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.appearance.themeLabel') || 'Theme'}</label>
             <div className="flex gap-4">
                 <button 
                    onClick={() => handleThemeChange('light')}
                    className={`px-4 py-2 rounded-lg border ${!isDarkMode ? 'bg-rose-100 border-rose-500 text-rose-700' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                 >
                    {t('settings.appearance.lightTheme') || 'Light'}
                 </button>
                 <button 
                    onClick={() => handleThemeChange('dark')}
                    className={`px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-rose-900 border-rose-500 text-rose-300' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                 >
                    {t('settings.appearance.darkTheme') || 'Dark'}
                 </button>
              </div>
          </div>
       </div>
          </div>
  );

  const renderSecuritySection = () => (
    <div className="space-y-6">
       <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('settings.security.title') || 'Security'}</h2>
       
       <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
           <h3 className="font-medium text-gray-800 dark:text-gray-200">{t('settings.security.changePasswordTitle') || 'Change Password'}</h3>
           <div>
             <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.security.newPasswordLabel') || 'New Password'}</label>
             <input 
                type="password" 
                id="newPassword" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
             />
           </div>
           <div>
             <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.security.confirmPasswordLabel') || 'Confirm New Password'}</label>
             <input 
                type="password" 
                id="confirmPassword" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
             />
           </div>
           <div className="text-right">
               <Button type="submit" onClick={() => handleSaveAll('password')} disabled={saving || !newPassword || !confirmPassword} className="px-5 py-2.5 rounded-lg">
                 {saving ? (t('buttons.saving') || 'Saving...') : (t('settings.security.changePasswordButton') || 'Change Password')}
               </Button>
           </div>
       </div>

       <div className="space-y-4 p-4 border border-red-300 dark:border-red-700 rounded-lg">
          <h3 className="font-medium text-red-600 dark:text-red-400">{t('settings.security.accountActionsTitle') || 'Account Actions'}</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleLogout} 
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              disabled={saving}
            >
              <FiLogOut/> {t('settings.security.logoutButton') || 'Log Out'}
            </button>
            <button 
              onClick={handleDeleteAccount} 
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2"
              disabled={saving}
            >
               <FiTrash2/> {t('settings.security.deleteAccountButton') || 'Delete Account'}
            </button>
          </div>
          <p className="text-xs text-red-500 dark:text-red-400">{t('settings.security.deleteWarning') || 'Warning: Deleting your account is permanent and cannot be undone.'}</p>
       </div>
    </div>
  );
  
  const renderHelpSection = () => {
    const faqItems = [
      { question: t('faq.createGroup.question') || 'How do I create a group?', answer: t('faq.createGroup.answer') || 'Navigate to the Groups page and click the \"Create Group\" button. Fill in the details and invite members.' },
      { question: t('faq.addFriends.question') || 'How can I add friends?', answer: t('faq.addFriends.answer') || 'Go to the Friends page, find people under \"Suggestions\" or search, and click \"Connect\" or \"Add Friend\".' },
      { question: t('faq.privacy.question') || 'How do I manage my privacy settings?', answer: t('faq.privacy.answer') || 'Go to Settings -> Privacy. Here you can control who sees your profile and posts.' },
      { question: t('faq.notifications.question') || 'How can I change my notification preferences?', answer: t('faq.notifications.answer') || 'Visit Settings -> Notifications to enable or disable email and push notifications.' },
      { question: t('faq.deleteAccount.question') || 'How do I delete my account?', answer: t('faq.deleteAccount.answer') || 'Go to Settings -> Security -> Account Actions. Be aware that deleting your account is permanent.' }
    ];

    const filteredFAQs = faqItems.filter(item =>
      item.question.toLowerCase().includes(helpSearchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(helpSearchQuery.toLowerCase())
    );

    return (
      <div className="space-y-8">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('settings.help.title') || 'Help & Support'}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            onClick={handleTelegramSupport}
            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group border border-gray-100 dark:border-gray-600"
          >
             <div className="flex items-center mb-2">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full mr-3">
                  <FaTelegram className="text-lg text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-white flex items-center">
                   {t('helpAndSupport.telegramSupport') || 'Telegram Support'}
                   <FaExternalLinkAlt className="ml-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
             </div>
             <p className="text-xs text-gray-600 dark:text-gray-400">
                {t('helpAndSupport.telegramSupportDescription') || 'Chat with us directly on Telegram.'}
             </p>
          </div>
           <div 
             onClick={handleEmailSupport}
             className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group border border-gray-100 dark:border-gray-600"
           >
              <div className="flex items-center mb-2">
                 <div className="bg-red-100 dark:bg-red-900 p-2 rounded-full mr-3">
                   <FaEnvelope className="text-lg text-red-500 dark:text-red-400 group-hover:scale-110 transition-transform" />
                 </div>
                 <h3 className="font-semibold text-gray-800 dark:text-white flex items-center">
                    {t('helpAndSupport.emailSupport') || 'Email Support'}
                    <FaExternalLinkAlt className="ml-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
                 </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                 {t('helpAndSupport.emailSupportDescription') || 'Send us an email for assistance.'}
              </p>
           </div>
            <div 
              onClick={handleHelpCenter}
              className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group border border-gray-100 dark:border-gray-600"
            >
               <div className="flex items-center mb-2">
                  <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-3">
                    <FaHeadset className="text-lg text-green-500 dark:text-green-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="font-semibold text-gray-800 dark:text-white flex items-center">
                     {t('helpAndSupport.helpCenter') || 'Help Center'}
                     <FaExternalLinkAlt className="ml-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
               </div>
               <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('helpAndSupport.helpCenterDescription') || 'Find answers in our knowledge base.'}
               </p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-600">
                <div className="flex items-center mb-2">
                   <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-3">
                      <FiBook className="text-lg text-purple-500 dark:text-purple-400" />
                   </div>
                   <h3 className="font-semibold text-gray-800 dark:text-white">
                      {t('helpAndSupport.documentation') || 'Documentation'}
                   </h3>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                   {t('helpAndSupport.documentationDescription') || 'Browse comprehensive guides.'}
                </p>
                <button onClick={handleViewDocs} className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                   {t('helpAndSupport.viewDocumentation') || 'View Documentation'}
                </button>
            </div>
             <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-600">
                 <div className="flex items-center mb-2">
                    <div className="bg-yellow-100 dark:bg-yellow-900 p-2 rounded-full mr-3">
                       <FaVideo className="text-lg text-yellow-500 dark:text-yellow-400" />
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                       {t('helpAndSupport.videoTutorials') || 'Video Tutorials'}
                    </h3>
                 </div>
                 <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    {t('helpAndSupport.videoTutorialsDescription') || 'Watch videos to get started.'}
                 </p>
                 <button onClick={handleWatchTutorials} className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                    {t('helpAndSupport.watchTutorials') || 'Watch Tutorials'}
                 </button>
             </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('helpAndSupport.frequentlyAskedQuestions') || 'Frequently Asked Questions'}</h3>
          <div className="relative mb-4">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t('actions.search') || 'Search FAQs...'}
              value={helpSearchQuery}
              onChange={(e) => setHelpSearchQuery(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            {filteredFAQs.length > 0 ? (
              filteredFAQs.map((item, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex justify-between items-center"
                    onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                  >
                    <span className="font-medium text-gray-800 dark:text-white">{item.question}</span>
                    <FiChevronDown className={`h-5 w-5 text-gray-500 dark:text-gray-400 transform transition-transform ${ expandedFAQ === index ? 'rotate-180' : '' }`} />
                  </button>
                  {expandedFAQ === index && (
                    <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-gray-600 dark:text-gray-300">{t('helpAndSupport.noMatchingFAQs') || 'No matching FAQs found.'}</p>
              </div>
            )}
          </div>
      </div>
          </div>
  );
  };
  
  const renderAccountSection = () => (
     <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('settings.account.title') || 'Account Management'}</h2>
         <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Button 
              variant="secondary"
              className="w-full justify-center py-2"
              onClick={() => toast('Sessions management not implemented yet')}
            >
              {t('settings.account.manageSessionsButton') || 'Manage Logged-in Sessions'}
            </Button>
            
            <Button 
              variant="secondary"
              className="w-full justify-center py-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => toast('Password change UI not fully implemented')}
            >
              {t('settings.account.managePasswordButton') || 'Manage Password (OAuth?)'}
            </Button>
            
            <Button 
              variant="secondary"
              className="w-full justify-center py-2 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => toast('Account deactivation not implemented')}
            >
              {t('settings.account.deactivateButton') || 'Deactivate Account (Temporary)'}
            </Button>
            
            <Button 
              variant="destructive"
              className="w-full justify-center py-2"
              onClick={handleDeleteAccount}
              disabled={saving}
            >
              {saving ? (t('buttons.deleting') || 'Deleting...') : (t('settings.account.deletePermanentlyButton') || 'Delete Account Permanently')}
            </Button>
        </div>
    </div>
  );

  const tabs = [
    { id: 'profile', label: t('settings.tabs.profile') || 'Profile', icon: FiUser, content: renderProfileSection },
    { id: 'appearance', label: t('settings.tabs.appearance') || 'Appearance', icon: FiDroplet, content: renderAppearanceSection },
    { id: 'notifications', label: t('settings.tabs.notifications') || 'Notifications', icon: FiBell, content: renderNotificationSection },
    { id: 'privacy', label: t('settings.tabs.privacy') || 'Privacy', icon: FiShield, content: renderPrivacySection },
    { id: 'security', label: t('settings.tabs.security') || 'Security', icon: FiLock, content: renderSecuritySection },
    { id: 'account', label: t('settings.tabs.account') || 'Account', icon: FiSettings, content: renderAccountSection },
    { id: 'help', label: t('settings.tabs.help') || 'Help & Support', icon: FiHelpCircle, content: renderHelpSection },
  ];

  if (loading && !profileData) {
    return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner size="lg" /></div>;
  }
  
  if (!user && !loading) {
      return <Navigate to="/login" replace />;
  }

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">{t('settings.pageTitle') || 'Settings'}</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar - fixed width on larger screens */}
        <aside className="w-full lg:w-64 flex-shrink-0 mb-6 lg:mb-0">
          <div className="sticky top-6 space-y-1 bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md w-full text-left ${
                    activeTab === tab.id
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                  }`}
                >
                  <tab.icon className={`mr-3 flex-shrink-0 h-5 w-5 ${activeTab === tab.id ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400'}`} />
                  {tab.label}
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md w-full text-left text-gray-600 hover:bg-red-50 hover:text-red-700 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 mt-4"
              >
                <FiLogOut className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-red-500 dark:group-hover:text-red-400" />
                Logout
              </button>
            </nav>
          </div>
        </aside>

        {/* Main content - expanded to fill available space */}
        <div className="flex-1 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          {activeTabData ? activeTabData.content() : <div>Select a category</div>}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
