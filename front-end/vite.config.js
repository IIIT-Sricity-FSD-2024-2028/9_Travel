import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The NestJS backend runs separately (default http://localhost:3000).
// The API base URL is configured through VITE_API_BASE_URL (see .env.example).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: 'dist',
    // The original stylesheets are large; they are bundled as-is to preserve the design.
    chunkSizeWarningLimit: 2000,
  },
});
