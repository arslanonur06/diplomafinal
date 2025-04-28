import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
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
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, './src/components'),
        '@contexts': resolve(__dirname, './src/contexts')
      },
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
      ]
    },
    // Add environment variables for testing
    define: {
      'process.env': process.env
    }
  };
});
