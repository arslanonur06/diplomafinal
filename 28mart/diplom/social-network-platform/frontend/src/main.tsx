import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import { ThemeProvider } from './contexts/ThemeContext'
import App from './App'
import './index.css'
import './i18n' // Import i18n configuration
import ErrorBoundaryDebug from './ErrorBoundaryDebug'
import { checkTranslationServer } from './services/googleTranslateService'

// Add console logging for debugging
console.log('Application starting...');
console.log('Environment:', import.meta.env);

// Check the translation server availability
checkTranslationServer(2, 1000).then(isAvailable => {
  if (isAvailable) {
    console.log('Translation server is available and connected.');
  } else {
    console.warn('Translation server is not available. Translations will be disabled.');
  }
}).catch(error => {
  console.error('Error checking translation server:', error);
});

// Log any unhandled errors
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
});

// Log any unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Custom event to force UI updates when language changes
window.addEventListener('languageChanged', () => {
  console.log('Language changed event detected, refreshing UI...');
  
  // Force DOM updates by making minimal style changes
  document.body.style.zoom = '0.99999';
  setTimeout(() => {
    document.body.style.zoom = '1';
  }, 10);
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

console.log('Root element found, rendering app...');

// Handle authentication tokens in URL
if (window.location.hash && (
  window.location.hash.includes('access_token') || 
  window.location.hash.includes('refresh_token') ||
  window.location.hash.includes('error_description')
)) {
  console.log('MAIN.TSX: Detected auth tokens in URL hash!');
  console.log('Hash content:', window.location.hash);
  
  // TEMPORARILY DISABLED AUTOMATIC REDIRECTS TO FIX AUTH ISSUES
  /*
  // Set flags to handle authentication flow
  localStorage.setItem('force_redirect_home', 'true');
  localStorage.setItem('auth_hash', window.location.hash);
  
  // Always route to the auth callback when we have tokens
  if (!window.location.pathname.includes('/auth/callback') && !window.location.pathname.includes('/callback')) {
    console.log('MAIN.TSX: Redirecting to auth callback page to process tokens');
    window.location.replace('/auth/callback' + window.location.hash);
  } else {
    console.log('MAIN.TSX: Already on callback page, letting it handle tokens');
  }
  */
} else if (localStorage.getItem('force_redirect_home') === 'true') {
  // TEMPORARILY DISABLED AUTOMATIC REDIRECTS TO FIX AUTH ISSUES
  /*
  // Detect if we're stuck in a redirect loop
  const redirectAttempts = parseInt(localStorage.getItem('redirect_attempts') || '0', 10);
  
  // Clear the redirect flags if we're on home or have tried too many times
  if (window.location.pathname === '/home') {
    console.log('MAIN.TSX: Successfully reached home page');
    // Clear redirect flags but preserve auth state
    localStorage.removeItem('force_redirect_home');
    localStorage.removeItem('redirect_attempts');
    localStorage.removeItem('auth_hash');
  } else if (redirectAttempts > 5) {
    console.log('MAIN.TSX: Too many redirect attempts, stopping redirect loop');
    localStorage.removeItem('force_redirect_home');
    localStorage.removeItem('redirect_attempts');
  } else {
    // Track redirect attempts
    localStorage.setItem('redirect_attempts', (redirectAttempts + 1).toString());
    
    console.log('MAIN.TSX: Redirecting to home (attempt ' + (redirectAttempts + 1) + ')');
    window.location.replace('/home');
  }
  */
  
  // Just clear any redirect flags
  localStorage.removeItem('force_redirect_home');
  localStorage.removeItem('redirect_attempts');
  localStorage.removeItem('auth_hash');
}

// Define router options with future flags to address warnings
const routerOptions = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundaryDebug>
      <BrowserRouter future={routerOptions.future}>
        <LanguageProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundaryDebug>
  </React.StrictMode>
);
