# Netlify Deployment Guide

## Prerequisites
- Netlify account
- Git repository with your project

## Deployment Steps

### Option 1: Deploy through Netlify UI

1. Log in to your Netlify account
2. Click "Add new site" > "Import an existing project"
3. Connect to your Git provider (GitHub, GitLab, Bitbucket)
4. Select your repository
5. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18 (or your preferred version)
6. Click "Deploy site"

### Option 2: Deploy using Netlify CLI

1. Install Netlify CLI:
   ```
   npm install netlify-cli -g
   ```

2. Login to Netlify:
   ```
   netlify login
   ```

3. Navigate to your frontend directory and initialize Netlify:
   ```
   cd path/to/frontend
   netlify init
   ```

4. Follow the prompts to link to an existing site or create a new one
5. Deploy your site:
   ```
   netlify deploy --prod
   ```

## Configuration Files

This project includes the following Netlify configuration files:

- `netlify.toml`: Main configuration file for build settings and redirects
- `public/_redirects`: Handles SPA routing

## Environment Variables

To configure environment variables:

1. Go to Site settings > Build & deploy > Environment
2. Add your environment variables:
   - Any API endpoints or keys needed by your application

## Testing Locally

To test the Netlify build locally:

```
npm install netlify-cli -g
netlify dev
```

## Troubleshooting

If you encounter issues with routing:
- Make sure `netlify.toml` and `_redirects` files are properly configured
- Check that your build is creating the correct output files in the `dist` directory

For build failures:
- Review the build logs in Netlify
- Test the build locally with `npm run build` 