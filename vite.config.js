import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// 保留原主页面与相对资源路径，仅追加独立 3D HTML 构建入口。
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        deskpet3d: fileURLToPath(new URL('./lab/deskpet3d/index.html', import.meta.url)),
      },
    },
  },
});
