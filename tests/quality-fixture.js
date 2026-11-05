import { test as base, expect } from '@playwright/test';
export const test = base.extend({
  quality: [process.env.SPARKMATE_TEST_QUALITY || 'dom', { option: true }],
  page: async ({ page, quality }, use) => {
    await page.addInitScript((quality) => {
      const url = new URL(location.href);
      if (url.protocol.startsWith('http') && !url.searchParams.has('quality')) {
        url.searchParams.set('quality', quality);
        history.replaceState(history.state, '', url);
      }
    }, quality);
    await use(page);
  },
});
export { expect };
