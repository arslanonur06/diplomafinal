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
      },
      // Add preserve symlinks option to handle case sensitivity
      preserveSymlinks: true
    },
    server: {
      host: true,
      port: 3004,
      // CORS sorunlarını önlemek için
      cors: true,
      // HMR sorunu için çözüm
      hmr: {
        overlay: false, // Flash sorunu çözümü için HMR overlay'i devre dışı bırak
      },
      // Flash sorununu azaltmak için daha az güncellemelere neden olan yapılandırma
      watch: {
        usePolling: false,
        interval: 1000, // dosyaları daha az sıklıkta kontrol et
      },
      // Handle SPA routing
      fs: {
        strict: false,
        // Allow serving files from one level up to the project root
        allow: ['..']
      },
    },
    // Çok fazla konsol mesajı olmasını önleyelim
    build: {
      sourcemap: true,
      minify: true,
      terserOptions: {
        compress: {
          drop_console: false, // Hata ayıklama için console.log'ları tutuyoruz ama canlıda true yapılabilir
        },
      },
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      // Rollup specific options
      rollupOptions: {
        // Preserve file paths and case
        preserveEntrySignatures: 'strict',
      }
    },
    // Olası döngü sorunlarını çözen debug ayarları
    optimizeDeps: {
      // Bağımlılıkların önceden yüklenmesini iyileştir
      force: true,
      // Optimization sorunlarıyla çakışan paketler
      exclude: ['react-router-dom'],
      include: [
        '@testing-library/react',
        '@testing-library/jest-dom'
      ],
      esbuildOptions: {
        // Don't require type declarations for JS files
        allowOverwrite: true,
        resolveExtensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    },
    // Add environment variables for testing
    define: {
      'process.env': process.env
    }
  };
});
