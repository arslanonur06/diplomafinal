# ConnectMe Setup Guide

This guide will walk you through the complete setup process for the ConnectMe social network platform, from installation to configuration.

## System Requirements

Before starting, make sure your system meets the following requirements:

- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+ recommended)
- **Memory**: Minimum 4GB RAM (8GB or more recommended)
- **Disk Space**: At least 1GB of free disk space
- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)

## Installation

### Step 1: Install Node.js and npm

#### Windows
1. Download the installer from [Node.js website](https://nodejs.org/)
2. Run the installer and follow the instructions
3. Verify installation by opening Command Prompt and typing:
```
node -v
npm -v
```

#### macOS
1. Using Homebrew (recommended):
```bash
brew install node
```
2. Or download the macOS installer from [Node.js website](https://nodejs.org/)
3. Verify installation:
```bash
node -v
npm -v
```

#### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Clone the Repository

```bash
git clone https://github.com/your-username/social-network-platform.git
cd social-network-platform/frontend
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Configure Environment Variables

1. Create a local environment file:
```bash
cp .env.example .env.local
```

2. Open `.env.local` in a text editor and update the following variables:

```
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# DeepL Translation API
VITE_DEEPL_API_KEY=your_deepl_api_key

# Optional settings
VITE_APP_NAME=ConnectMe
VITE_DEFAULT_LANGUAGE=en
```

## Starting the Application

### Option 1: Using the start script (recommended)

The start script will launch both the frontend application and the translation server:

```bash
./start-app.sh
```

If you get a permission error, make the script executable:
```bash
chmod +x start-app.sh
```

### Option 2: Manual startup

You can start the components individually:

1. Start the translation server:
```bash
node start-translation-server.js
```

2. In a new terminal window, start the frontend application:
```bash
npm run dev
```

### Accessing the Application

Once started, the application will be available at:
- Frontend: http://localhost:5174 (or another port if 5174 is in use)
- Translation server: http://localhost:3002

## Configuration Options

### Language Settings

ConnectMe supports multiple languages out of the box:
- English (default)
- Russian
- Kazakh
- Turkish

You can change the language in the application using the language selector in the sidebar.

### Theme Settings

The application supports light and dark themes:
1. Navigate to Settings
2. Select "Appearance"
3. Choose your preferred theme

## User Account Setup

### Creating an Account

1. Navigate to the sign-up page
2. Fill in your information:
   - Full name
   - Email address
   - Password (minimum 8 characters)
3. Verify your email address by clicking the link in the confirmation email
4. Complete your profile by adding:
   - Profile picture
   - Bio
   - Location
   - Interests

### Security Recommendations

1. Use a strong, unique password
2. Enable two-factor authentication (if available)
3. Regularly review your account activity
4. Be cautious about the information you share

## Troubleshooting

### Common Issues

#### Application won't start

1. Check that Node.js and npm are installed correctly
2. Verify all dependencies are installed
3. Check for port conflicts
4. Ensure environment variables are set correctly

#### Translation not working

1. Verify your DeepL API key is valid
2. Check that the translation server is running
3. Look for errors in the translation server console

### Authentication issues

1. Ensure Supabase credentials (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are correct in `.env.local` or your deployment environment (e.g., Render).
2. Verify the `VITE_` prefix is used for client-side environment variables.
3. Clear browser cookies and cache.
4. Try using an incognito/private browser window.
5. Check the browser's developer console for specific errors.

### Google Sign-In Specific Issues

If you encounter errors like "Invalid API Key", "Redirect URI mismatch", etc., during Google Sign-In:

1. **Check Supabase Google Auth Settings**:
    * In your Supabase project dashboard: Authentication -> Providers -> Google.
    * Confirm it's **Enabled**.
    * Ensure the **Client ID** and **Client Secret** match your Google Cloud Console credentials.
    * Copy the **Redirect URI** shown by Supabase (e.g., `https://<ref>.supabase.co/auth/v1/callback`).
2. **Check Google Cloud Console Credentials**:
    * Go to APIs & Services -> Credentials -> Your OAuth 2.0 Client ID.
    * Add your frontend URL(s) to **Authorized JavaScript origins** (e.g., `http://localhost:5174`, `https://your-app.onrender.com`).
    * **Crucially**: Add the **Redirect URI copied from Supabase** to the **Authorized redirect URIs** list.
3. **Check API Enablement**: Ensure necessary Google APIs (like Identity Platform) are enabled in Google Cloud Console.
4. **Environment Variables**: Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correctly set where your app is running (local or Render). Google Client ID/Secret are used by Supabase backend, not directly by your Vite frontend code for the sign-in flow.

### Getting Help

If you encounter issues not covered here:

1. Check the GitHub repository issues section
2. Join our community Discord server
3. Contact support at support@connectme.example.com

## Additional Resources

- [User Guide](USER-GUIDE.md): Detailed guide for using the application
- [Developer Guide](DEVELOPER-GUIDE.md): Information for developers
- [API Documentation](API-DOCS.md): Details on the available API endpoints

## Updating

To update to the latest version:

1. Pull the latest changes:
```bash
git pull origin main
```

2. Install any new dependencies:
```bash
npm install
```

3. Restart the application

## Feedback and Contributions

We welcome your feedback and contributions:

- Submit bug reports and feature requests in the GitHub issues
- Contribute code by creating pull requests
- Share your experience in the community forums