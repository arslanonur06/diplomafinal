import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// path importuna gerek kalmaz (eğer başka yerde kullanmıyorsan)
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths() // Eklentiyi buraya ekle
  ],
  // resolve.alias bloğunu kaldırabilirsin
  build: {
    outDir: "dist",
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  server: {
    port: 3004,
  },
  base: "/",
});