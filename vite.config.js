import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production has a single SPA entry; the isolated lab remains a dev-only fixture.
export default defineConfig({
  plugins: [react()],
  base: './',
});
