import { writeFileSync } from 'fs';
import { batchTranslate } from '../services/translateService';

// Base English translations
const englishTranslations = {
  // Navigation
  home: 'Home',
  profile: 'Profile',
  messages: 'Messages',
  notifications: 'Notifications',
  discover: 'Discover',
  groups: 'Groups',
  friends: 'Friends',
  saved: 'Saved Items',
  favorites: 'Favorites',
  settings: 'Settings',
  
  // Help & Support
  helpAndSupport: 'Help & Support',
  helpAndSupportDescription: 'Get help with any issues you encounter',
  telegramSupport: 'Telegram Support',
  telegramSupportDescription: 'Contact us on Telegram for quick assistance',
  emailSupport: 'Email Support',
  emailSupportDescription: 'Send us an email with your questions',
  helpCenter: 'Help Center',
  helpCenterDescription: 'Browse our help articles and guides',
  frequentlyAskedQuestions: 'Frequently Asked Questions',
  
  // Buttons
  save: 'Save Changes',
  cancel: 'Cancel',
  edit: 'Edit',
  delete: 'Delete',
  confirm: 'Confirm',
  logout: 'Logout',
  search: 'Search',
  signIn: 'Sign In',
  signOut: 'Sign Out',
  signUp: 'Sign Up',
  continueWithGoogle: 'Continue with Google',
  
  // Form Labels
  name: 'Name',
  email: 'Email',
  password: 'Password',
  language: 'Language',
  theme: 'Theme',
  
  // Themes
  lightTheme: 'Light',
  darkTheme: 'Dark',
  systemTheme: 'System',
  
  // Languages
  english: 'English',
  russian: 'Russian',
  kazakh: 'Kazakh',
  turkish: 'Turkish'
};

async function generateTranslations() {
  try {
    // Generate Kazakh translations
    console.log('Generating Kazakh translations...');
    const kazakhTranslations = await batchTranslate(englishTranslations, 'kk');
    
    // Generate Turkish translations
    console.log('Generating Turkish translations...');
    const turkishTranslations = await batchTranslate(englishTranslations, 'tr');
    
    // Combine all translations
    const translations = {
      en: englishTranslations,
      kz: kazakhTranslations,
      tr: turkishTranslations
    };
    
    // Write to translations file
    const translationsContent = `export const translations = ${JSON.stringify(translations, null, 2)};`;
    writeFileSync('../locales/translations.ts', translationsContent);
    
    console.log('Translations generated successfully!');
  } catch (error) {
    console.error('Error generating translations:', error);
  }
}

generateTranslations();
