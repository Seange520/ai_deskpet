import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production has a single SPA entry; the isolated lab remains a dev-only fixture.
export default defineConfig({
  plugins: [react()],
  base: './',
  worker: { format: 'es' },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.endsWith('/node_modules/three/build/three.module.js')) return 'three-core';
        },
      },
    },
  },
  optimizeDeps: { include: ['@mediapipe/tasks-vision'] },
});
