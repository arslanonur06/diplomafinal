import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import path from 'path';
import fs from 'fs';

// Handle Button.tsx file casing during build
const ensureButtonCasing = () => {
  const buttonLowerPath = path.resolve(__dirname, 'src/components/ui/button.tsx');
  const buttonUpperPath = path.resolve(__dirname, 'src/components/ui/Button.tsx');
  
  if (fs.existsSync(buttonLowerPath) && !fs.existsSync(buttonUpperPath)) {
    console.log('Creating Button.tsx from button.tsx for case consistency');
    try {
      fs.copyFileSync(buttonLowerPath, buttonUpperPath);
    } catch (error) {
      console.error('Error creating Button.tsx file:', error);
    }
  }
};

// Call the function to ensure Button.tsx exists with proper casing
ensureButtonCasing();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'handle-case-sensitivity',
        buildStart() {
          // Check again before build starts
          ensureButtonCasing();
        }
      }
    ],
    base: '/',
    css: {
      postcss: {
        plugins: [
          tailwindcss(),
          autoprefixer(),
        ],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@contexts': path.resolve(__dirname, './src/contexts')
      }
    },
    server: {
      port: 3004,
      fs: {
        // Allow serving files from one level up to the project root
        allow: ['..']
      }
    },
    build: {
      sourcemap: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      }
    }
  };
});
