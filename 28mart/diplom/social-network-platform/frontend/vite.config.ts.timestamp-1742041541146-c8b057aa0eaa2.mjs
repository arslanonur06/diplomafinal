// vite.config.ts
import react from "file:///C:/Users/CENGIZ/Documents/diplom/social-network-platform/frontend/node_modules/@vitejs/plugin-react/dist/index.mjs";
import tailwindcss from "file:///C:/Users/CENGIZ/Documents/diplom/social-network-platform/frontend/node_modules/tailwindcss/lib/index.js";
import autoprefixer from "file:///C:/Users/CENGIZ/Documents/diplom/social-network-platform/frontend/node_modules/autoprefixer/lib/autoprefixer.js";
import { defineConfig } from "file:///C:/Users/CENGIZ/Documents/diplom/social-network-platform/frontend/node_modules/vite/dist/node/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  base: "./",
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer()
      ]
    }
  },
  server: {
    port: 3e3,
    // Use a completely different port
    strictPort: false,
    // Allow falling back to another port if 3000 is taken
    host: "0.0.0.0",
    // Listen on all IPv4 addresses
    hmr: {
      timeout: 5e3,
      // Increase WebSocket timeout
      overlay: true
      // Show errors as overlay
    },
    watch: {
      usePolling: true
      // Use polling for file changes
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxDRU5HSVpcXFxcRG9jdW1lbnRzXFxcXGRpcGxvbVxcXFxzb2NpYWwtbmV0d29yay1wbGF0Zm9ybVxcXFxmcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQ0VOR0laXFxcXERvY3VtZW50c1xcXFxkaXBsb21cXFxcc29jaWFsLW5ldHdvcmstcGxhdGZvcm1cXFxcZnJvbnRlbmRcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0NFTkdJWi9Eb2N1bWVudHMvZGlwbG9tL3NvY2lhbC1uZXR3b3JrLXBsYXRmb3JtL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICd0YWlsd2luZGNzcyc7XG5pbXBvcnQgYXV0b3ByZWZpeGVyIGZyb20gJ2F1dG9wcmVmaXhlcic7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgYmFzZTogJy4vJyxcbiAgY3NzOiB7XG4gICAgcG9zdGNzczoge1xuICAgICAgcGx1Z2luczogW1xuICAgICAgICB0YWlsd2luZGNzcygpLFxuICAgICAgICBhdXRvcHJlZml4ZXIoKSxcbiAgICAgIF0sXG4gICAgfSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMzAwMCwgLy8gVXNlIGEgY29tcGxldGVseSBkaWZmZXJlbnQgcG9ydFxuICAgIHN0cmljdFBvcnQ6IGZhbHNlLCAvLyBBbGxvdyBmYWxsaW5nIGJhY2sgdG8gYW5vdGhlciBwb3J0IGlmIDMwMDAgaXMgdGFrZW5cbiAgICBob3N0OiAnMC4wLjAuMCcsIC8vIExpc3RlbiBvbiBhbGwgSVB2NCBhZGRyZXNzZXNcbiAgICBobXI6IHtcbiAgICAgIHRpbWVvdXQ6IDUwMDAsIC8vIEluY3JlYXNlIFdlYlNvY2tldCB0aW1lb3V0XG4gICAgICBvdmVybGF5OiB0cnVlLCAvLyBTaG93IGVycm9ycyBhcyBvdmVybGF5XG4gICAgfSxcbiAgICB3YXRjaDoge1xuICAgICAgdXNlUG9sbGluZzogdHJ1ZSwgLy8gVXNlIHBvbGxpbmcgZm9yIGZpbGUgY2hhbmdlc1xuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBbVksT0FBTyxXQUFXO0FBQ3JaLE9BQU8saUJBQWlCO0FBQ3hCLE9BQU8sa0JBQWtCO0FBQ3pCLFNBQVMsb0JBQW9CO0FBRzdCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixNQUFNO0FBQUEsRUFDTixLQUFLO0FBQUEsSUFDSCxTQUFTO0FBQUEsTUFDUCxTQUFTO0FBQUEsUUFDUCxZQUFZO0FBQUEsUUFDWixhQUFhO0FBQUEsTUFDZjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUE7QUFBQSxJQUNOLFlBQVk7QUFBQTtBQUFBLElBQ1osTUFBTTtBQUFBO0FBQUEsSUFDTixLQUFLO0FBQUEsTUFDSCxTQUFTO0FBQUE7QUFBQSxNQUNULFNBQVM7QUFBQTtBQUFBLElBQ1g7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLFlBQVk7QUFBQTtBQUFBLElBQ2Q7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
