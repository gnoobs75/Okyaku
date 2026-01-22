import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        timeout: 120000, // 2 minutes for AI requests
        configure: (proxy) => {
          // Handle redirects by following them server-side
          proxy.on('proxyRes', (proxyRes, req, res) => {
            if (proxyRes.statusCode === 307 || proxyRes.statusCode === 308) {
              const location = proxyRes.headers.location;
              if (location) {
                // Rewrite redirect to go through proxy
                const newLocation = location.replace('http://localhost:8000', '');
                proxyRes.headers.location = newLocation;
              }
            }
          });
        },
      },
    },
  },
});
