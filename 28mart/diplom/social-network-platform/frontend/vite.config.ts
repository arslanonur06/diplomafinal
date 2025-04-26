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
      },
    },
    server: {
      host: true,
      port: Number(process.env.PORT) || 4173, // Port ayarı eklendi
      cors: true,
      proxy: {
        '/api': {
          target: 'https://diplomafinalx.onrender.com',
          changeOrigin: true,
          secure: false
        }
      },
      hmr: {
        overlay: false,
      },
      watch: {
        usePolling: false,
        interval: 1000,
      },
      fs: {
        strict: false,
      },
      allowedHosts: ['diplomafinalx.onrender.com'],
    },
    build: {
      sourcemap: true,
      minify: 'terser',
      outDir: 'dist',
      assetsDir: 'assets',
      terserOptions: {
        compress: {
          drop_console: false,
        },
      },
    },
    optimizeDeps: {
      force: true,
      exclude: ['react-router-dom'],
    },
  };
});
