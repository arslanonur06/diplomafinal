# Frontend Guide for Social Network Platform

This document provides an overview of the frontend structure, components, and key features of the social network platform.

## Project Structure

```
frontend/
├── public/            # Static assets
├── src/
│   ├── components/    # Reusable UI components
│   │   ├── auth/      # Authentication-related components
│   │   ├── common/    # Common UI elements
│   │   ├── group/     # Group-related components
│   │   ├── post/      # Post-related components
│   │   ├── profile/   # Profile-related components
│   │   └── ...
│   ├── contexts/      # React context providers
│   ├── hooks/         # Custom React hooks
│   ├── layouts/       # Page layouts
│   ├── locales/       # i18n translation files
│   ├── pages/         # Page components
│   ├── services/      # API services
│   ├── styles/        # Global styles
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   ├── App.tsx        # Main application component
│   └── index.tsx      # Application entry point
└── supabase-rls-policies-updated.sql  # Database security policies
```

## Key Components

### Authentication

The application uses Supabase for authentication. Key components include:

- `SignIn.tsx` - User login form
- `SignUp.tsx` - User registration form
- `AuthContext.tsx` - Authentication state management

### Profile Management

User profiles are managed through these components:

- `ProfilePage.tsx` - Displays user profile information
- `ProfileEditModal.tsx` - Modal for editing user profile
- `ProfileAvatar.tsx` - Reusable avatar component supporting both image and emoji avatars

### Posts

The main social content is handled by:

- `Post.tsx` - Displays a single post
- `PostCreate.tsx` - Form for creating new posts
- `PostsList.tsx` - List of posts with pagination

### Navigation

Site navigation is handled by:

- `Navbar.tsx` - Main navigation bar
- `Sidebar.tsx` - Side navigation menu
- `NotificationBell.tsx` - Notification indicator with dropdown

## Multilingual Support

The application supports multiple languages through i18n:

- Language files are stored in `src/locales/`
- English (`en.json`) is the default language
- Russian (`ru.json`) is available as an alternative
- The language can be switched via the language selector in the settings

## Theme Support

The application supports both light and dark themes:

- Theme settings are stored in local storage and user preferences
- Theme can be toggled in the settings page or navbar

## Avatar System

The platform features a unique avatar system:

- Users can choose between image uploads or emoji avatars
- `ProfileAvatar` component handles both types seamlessly
- Avatar editing is integrated into the profile editor

## Real-time Features

Supabase's real-time subscription feature is used for:

- Live notifications
- Post updates
- Friend requests

## Database Security

Row Level Security (RLS) policies ensure data security:

- Users can only access data they're authorized to see
- Authorization is enforced at the database level
- Policies are defined in `supabase-rls-policies-updated.sql`

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Configure environment variables:
   - Create a `.env.local` file based on `.env.example`
   - Add your Supabase URL and API key
4. Run the development server with `npm run dev`

## Adding New Features

When adding new features:

1. Create components in the appropriate folders
2. Add any necessary translations to the locale files
3. Update database tables and RLS policies if needed
4. Add routes in the router configuration

## Performance Considerations

- Use React.memo() for components that render frequently but don't change often
- Use Suspense and lazy loading for code splitting
- Optimize images and assets for faster loading

## Deployment

The application is configured for deployment on Vercel:

1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy 