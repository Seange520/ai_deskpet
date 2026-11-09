import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.SPARKMATE_RENDER_URL || 'http://127.0.0.1:15262';
const out = 'D:/deepseek_file/work/acceptance/render-review';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const results = {};
for (const mode of ['toon', 'standard']) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}/?quality=3&render=${mode}`, { waitUntil: 'domcontentloaded' });
  await page.locator('.render-r1').waitFor({ timeout: 60000 });
  await page.waitForFunction(() => window.__sparkmateRenderR1?.read?.().triangles > 0, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  for (const hour of [10, 18, 2]) {
    await page.evaluate((h) => {
      const url = new URL(location.href);
      url.searchParams.set('time', String(h));
      history.replaceState(null, '', url);
      window.__sparkmateRenderR1?.setHour?.(h);
    }, hour);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/${mode}-${hour}h.png` });
  }
  const fps = await page.evaluate(async () => {
    let frames = 0;
    const t0 = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        frames += 1;
        if (performance.now() - t0 > 3000) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return Math.round((frames * 1000) / (performance.now() - t0));
  });
  const state = await page.evaluate(() => window.__sparkmateRenderR1.read());
  results[mode] = { state, fps, errors };
  await page.close();
}
await browser.close();
console.log(JSON.stringify({ ok: true, results }));
