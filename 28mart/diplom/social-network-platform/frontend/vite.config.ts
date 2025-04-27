import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/',
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true,
    port: Number(process.env.PORT) || 4173,
    proxy: {
      '/api': {
        target: 'https://your-backend-api-url.onrender.com', // Replace with your backend API URL
        changeOrigin: true,
        secure: true,
      },
      '/translation': {
        target: 'http://localhost:3005', // Translation server for local development
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: true,
    target: 'es2015'
  },
  define: {
    'process.env': {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
      VITE_GOOGLE_REDIRECT_URL: process.env.VITE_GOOGLE_REDIRECT_URL,
    },
  },
});
