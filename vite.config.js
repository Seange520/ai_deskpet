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
  // 编辑/代理写文件会在源码目录留下临时目录，Windows 下递归 watch 会 EBUSY 使 dev server 退出。
  server: {
    watch: {
      ignored: ['**/.*.tmpdir/**', '**/*.tmp'],
    },
  },
});
