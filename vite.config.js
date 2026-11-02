import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 相对资源路径便于后续打包进桌面应用的静态资源目录。
export default defineConfig({ plugins: [react()], base: './' });
