# Social Network Platform Frontend

This is the frontend application for the social network platform, built with React, TypeScript, and Vite.

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the frontend directory:
   ```
   cd diplom/social-network-platform/frontend
   ```
3. Install dependencies:
   ```
   npm install
   ```

### Running the Application

To start the application, use:

```
npm run dev
```

This will start the development server, typically on port 5174. You can access the application at:

```
http://localhost:5174
```

### Environment Setup

Create a `.env.local` file in the frontend directory with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key
VITE_GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key
```

Note: Make sure to use the `VITE_` prefix for your environment variables when using Vite.

## Recent Fixes

### Authentication Fixes

The following authentication issues have been resolved:

1. **Environment Variables**: Updated naming convention in the .env.local file from `REACT_APP_` to `VITE_` to ensure compatibility with Vite.

2. **Supabase Client**: Enhanced the supabaseClient file to correctly load environment variables and improved error handling.

3. **Authentication Components**: 
   - Modified RequireAuth component to be more reliable during authentication checks
   - Added local storage checks to detect existing sessions
   - Improved profile completion checks to prevent unnecessary redirects

4. **Code Improvements**:
   - Fixed hook definitions in authentication-related components
   - Ensured consistent imports across files
   - Added better logging for easier debugging

## Features

### Groups Functionality

The platform now supports comprehensive group features:

- **Group Browsing**: View and filter groups by category and search term
- **Group Creation**: Create new groups with image uploads, descriptions, and privacy settings
- **Group Membership**: Join and leave groups
- **Group Chat**: Communicate with other group members in real-time
- **Private Groups**: Support for private groups where only members can see content

### Mock Users & Groups

For testing purposes, you can create mock users and groups using the Mock Users page:

1. Navigate to `/admin/mock-users` in the application
2. Click "Create Mock Users" to generate sample user profiles
3. Click "Create Mock Group" to create a chat group with some of the mock users
4. Use the "Message" button to start direct conversations with mock users
5. Use the "View Group" button to enter a group chat

### Profile Editing

1. Navigate to your profile page
2. Click the edit icon in the top-right corner of your cover photo
3. Edit your profile information including:
   - Name
   - Bio
   - Profile picture
   - Cover photo
   - Location
   - Website
   - Interests

### Social Interactions

The platform supports various social interactions:

- Creating posts with text and images
- Liking, commenting, and sharing posts
- Saving posts for later viewing
- Creating and joining groups
- Creating and attending events
- Adding friends and sending direct messages

### Translation Service

The application includes a real-time translation service powered by Google Translate. To use it:

1. Ensure the translation server is running (it starts automatically with `npm run dev`)
2. Configure your Google Translate API key in the `.env.local` file:
   ```
   VITE_GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key
   ```
3. Use the language selector in the application to change your preferred language

**Note**: If the Google Translate API key is not configured, the application will fall back to displaying text in the original language (English).

## Development

### Project Structure

- `src/` - Source code
  - `components/` - React components
  - `contexts/` - React context providers
  - `pages/` - Application pages
  - `services/` - API and external services
  - `types/` - TypeScript type definitions
  - `utils/` - Utility functions

### Adding New Features

When adding new features:

1. Create components in the appropriate directory
2. Update routes in `App.tsx` if needed
3. Add translations to the appropriate language files
4. Write tests for new functionality

## Troubleshooting

### Authentication Issues

If you encounter authentication problems:

1.  **Check Environment Variables**:
    *   Ensure your `.env.local` (for local development) or Render environment variables contain the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
    *   Verify the `VITE_` prefix is used for variables accessed in the frontend code (`import.meta.env.VITE_...`).
    *   On Render, ensure variables are set for the correct service and environment, and restart the service after changes.
2.  **Supabase Client**: Ensure the Supabase client is properly initialized in `src/services/supabase.ts` (or your client file).
3.  **Clear Browser Data**: Clear local storage and cookies in your browser to reset any potentially corrupted session data.
4.  **Check Console**: Look for specific error messages in the browser's developer console.

### Google Sign-In Issues ("Invalid API Key" or similar)

If Google Sign-In fails, especially on deployment (like Render):

1.  **Supabase Google Provider Config**:
    *   Go to your Supabase Project -> Authentication -> Providers -> Google.
    *   Ensure it's **Enabled**.
    *   Verify the **Client ID** and **Client Secret** exactly match the credentials from your Google Cloud Console project.
    *   **Crucially**: Copy the **Redirect URI** provided by Supabase (it looks like `https://<your-project-ref>.supabase.co/auth/v1/callback`).
2.  **Google Cloud Console Config**:
    *   Go to Google Cloud Console -> APIs & Services -> Credentials.
    *   Select the OAuth 2.0 Client ID used for your web application.
    *   Under **Authorized JavaScript origins**, add your frontend's URL (e.g., `http://localhost:5174` for local dev, `https://your-app-name.onrender.com` for production).
    *   Under **Authorized redirect URIs**, **add the exact Redirect URI copied from the Supabase Google Provider settings**.
3.  **API Enablement**: In Google Cloud Console, ensure the "Google Identity Platform" or necessary OAuth APIs are enabled for your project.
4.  **Environment Variables**: Remember, Google Sign-In primarily relies on the Client ID/Secret configured *within Supabase*. The frontend only needs the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Supabase to handle the OAuth flow. The `VITE_GOOGLE_TRANSLATE_API_KEY` is **not** used for sign-in.
5.  **Render Environment**: Double-check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correctly set in your Render service's environment variables.

### Group and Chat Issues

If you encounter issues with the group functionality:

1. Ensure the database has the correct tables:
   - `groups` - Contains group information
   - `group_members` - Links users to groups
   - `group_messages` - Contains messages for each group

2. Database Schema Check: Make sure the tables have the correct columns:
   ```
   groups: id, name, description, category, is_private, image_url, creator_id, created_at
   group_members: id, group_id, user_id, role, joined_at
   group_messages: id, group_id, user_id, content, created_at
   ```

If you've verified these and still have issues, try clearing your browser cache or checking the network tab for additional error details.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Shadcn UI for the beautiful components
- React and TypeScript communities
- DeepL for the translation API
- Supabase team for the backend infrastructure
