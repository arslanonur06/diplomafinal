# Render Deployment Guide

## Setup for Render

This project is configured for easy deployment on Render.com.

## Deployment Steps

1. **Log in to Render**
   - Go to https://render.com and log in to your account
   - If you don't have an account, create one

2. **Deploy as a Web Service**
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository 
   - Select the repository with your project

3. **Configure the Web Service**
   - **Name**: Your service name (e.g., "social-network-app")
   - **Root Directory**: Use "frontend" if your app is in a subdirectory
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod` 
   - **Plan**: Choose an appropriate plan (Free tier works for testing)

4. **Environment Variables**
   - Add any needed environment variables under the "Environment" tab
   - Minimum variables:
     - `NODE_ENV`: production
     - `PORT`: 3004 (or leave blank to use Render's assigned port)
   
5. **Click "Create Web Service"**
   - Render will start deploying your application
   - This process may take a few minutes

## Troubleshooting

### Build Taking Too Long

If the build process seems stuck:

1. **Check build logs** in the Render dashboard
2. Make sure **Node version** is compatible (project uses Node 18)
3. Try simplifying the build by temporarily removing unnecessary steps
4. Consider adding a `.node-version` file with `18.19.1` to specify Node version

### Connection Issues

If you can see the app running locally but not on Render:

1. Ensure you're using `process.env.PORT` in your server.js file
2. Check the logs for any errors during startup
3. Make sure all dependencies are properly listed in package.json

### Other Issues

- Verify your render.yaml file has the correct configuration
- Make sure the server.js file exists and is properly configured
- Consider using a custom build script if needed

## Monitoring Your App

Once deployed, you can monitor your app through the Render dashboard, which provides:
- Build and deployment logs
- Service metrics
- Custom domain and HTTPS settings 