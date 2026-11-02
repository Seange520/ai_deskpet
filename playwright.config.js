import { defineConfig } from '@playwright/test';

// 默认仍为 5173；本机存在其他项目副本时可指定独立端口，避免验收错版本。
const port = process.env.SPARKMATE_TEST_PORT || '5173';
const baseURL = `http://127.0.0.1:${port}`;

// 使用本机 Chrome，无需额外下载浏览器；也可设 PLAYWRIGHT_CHANNEL=msedge。
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  // 在终端展示结果，并始终生成可由 show-report 打开的 HTML 报告。
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    headless: true,
    viewport: { width: 1440, height: 1080 },
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: baseURL,
    // 不复用未知服务：同机的其他源码副本可能恰好占据相同端口。
    reuseExistingServer: false,
  },
});
