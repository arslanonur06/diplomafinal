# ConnectMe Developer Guide

This comprehensive guide is intended to help developers understand the codebase structure, development workflow, and best practices for contributing to the ConnectMe social network platform.

## Development Environment Setup

### Required Software

- Node.js (v16+)
- npm (v7+)
- Git
- VS Code (recommended)

### Recommended VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Hero
- GitLens

### Initial Setup

1. Clone the repository
```bash
git clone https://github.com/your-username/social-network-platform.git
cd social-network-platform/frontend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

4. Start the development environment
```bash
./start-app.sh
```

## Code Architecture

### Core Technologies

- **React**: Frontend UI library
- **TypeScript**: Strongly typed JavaScript
- **Supabase**: Backend services (Auth, Database, Storage)
- **TailwindCSS**: Utility-first CSS framework
- **Vite**: Build tool and development server
- **React Router**: Navigation and routing
- **Shadcn UI**: Component library

### Project Structure

```
/frontend
├── /public              # Static assets
├── /server              # Translation server
│   └── /src             # Server source code
├── /src
│   ├── /components      # Reusable UI components
│   │   ├── /chat        # Chat-related components
│   │   ├── /layout      # Layout components
│   │   ├── /posts       # Post-related components
│   │   ├── /profile     # Profile-related components
│   │   ├── /shared      # Shared UI elements
│   │   └── /ui          # Shadcn UI components
│   ├── /contexts        # React context providers
│   ├── /hooks           # Custom React hooks
│   ├── /lib             # Utility functions
│   ├── /locales         # Translation files
│   ├── /pages           # Page components
│   └── /utils           # Helper functions
├── .env.example         # Example environment variables
├── .gitignore           # Git ignore file
├── package.json         # Dependencies and scripts
├── README.md            # Project overview
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## Key Concepts

### Authentication Flow

The platform uses Supabase Auth for user authentication. The authentication flow is managed in the `AuthContext` provider:

- `AuthContext.tsx`: Manages user authentication state
- `useAuth.ts`: Hook for accessing authentication functionality
- `PrivateRoute.tsx`: Route component that requires authentication

### State Management

We use a combination of React Context and local component state:

- **Global State**: React Context for auth, theme, language, etc.
- **Page State**: Local state for page-specific data
- **Component State**: Local state for component-specific behaviors

### Internationalization

The platform supports multiple languages through:

- `LanguageContext.tsx`: Manages current language setting
- `translations.ts`: Contains translation strings
- Translation Server: Node.js server for DeepL API integration

### Data Fetching

We use a hybrid approach for data fetching:

- **Supabase Client**: Direct queries to the database
- **Custom Hooks**: Encapsulated data fetching logic
- **Realtime Subscriptions**: For live updates

## Development Workflow

### Git Workflow

1. Create a new branch for each feature or bugfix
```bash
git checkout -b feature/feature-name
```

2. Make your changes, commit with meaningful messages
```bash
git commit -m "feat: add new feature description"
```

3. Push your branch and create a pull request
```bash
git push origin feature/feature-name
```

### Commit Message Guidelines

We follow the Conventional Commits specification:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or correcting tests
- `chore`: Changes to the build process or auxiliary tools

### Code Style and Linting

- We use ESLint and Prettier for code formatting
- Run linting before commits:
```bash
npm run lint
```

## Components and Patterns

### Component Structure

1. **Atomic Design Principles**
   - Atoms: Basic UI elements (buttons, inputs)
   - Molecules: Groups of atoms (search bar, menu item)
   - Organisms: Complex UI sections (header, sidebar)
   - Templates: Page layouts
   - Pages: Full pages with data

2. **Component File Structure**
```tsx
// Import statements
import React from 'react';
import { useHook } from '../hooks/useHook';

// TypeScript interfaces
interface ComponentProps {
  prop1: string;
  prop2?: number;
}

// Component definition
export const Component: React.FC<ComponentProps> = ({ prop1, prop2 = 0 }) => {
  // Hooks
  const { data } = useHook();
  
  // Event handlers
  const handleEvent = () => {
    // Logic
  };
  
  // Rendering
  return (
    <div>
      {/* JSX content */}
    </div>
  );
};
```

### Best Practices

1. **Performance Optimization**
   - Use `React.memo` for pure components
   - Implement `useMemo` and `useCallback` for expensive calculations
   - Avoid unnecessary re-renders
   
2. **Accessibility**
   - Use semantic HTML elements
   - Include proper ARIA attributes
   - Ensure keyboard navigation
   
3. **Responsive Design**
   - Use Tailwind's responsive modifiers
   - Test on multiple device sizes
   - Implement mobile-specific views when needed

## Translation Server

### Overview

The translation server is a Node.js application that:
1. Proxies requests to the DeepL API
2. Handles authentication and rate limiting
3. Provides a simplified API for the frontend

### Running the Server

The translation server can be started:
- Automatically via `start-app.sh`
- Manually using `node start-translation-server.js`

### Troubleshooting

If the translation server fails to start:
1. Check your DeepL API key configuration
2. Ensure no other services are using port 3002
3. Check server logs for detailed error information

## Testing

### Unit Testing

We use Jest and React Testing Library for unit tests:

```bash
npm run test
```

### End-to-End Testing

Cypress is used for E2E testing:

```bash
npm run cypress:open
```

## Deployment

### Build Process

Create a production build:

```bash
npm run build
```

### Deployment Platforms

- Vercel (recommended)
- Netlify
- AWS Amplify

## Resources

- [React Documentation](https://reactjs.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Supabase Documentation](https://supabase.io/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn UI Documentation](https://ui.shadcn.com/)

## Troubleshooting Common Issues

### Frontend Issues

- **Component rendering problems**: Check props passing and type definitions
- **State management issues**: Verify context providers are properly set up
- **UI inconsistencies**: Check Tailwind classes and responsive design

### Backend Issues

- **Authentication errors**: Verify Supabase configuration
- **Database queries failing**: Check SQL syntax and permissions
- **Translation server issues**: Verify API key and server logs 