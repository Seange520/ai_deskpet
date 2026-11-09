import { chromium } from '@playwright/test';

const base = process.env.R1_BASE_URL || 'http://127.0.0.1:15262';
const out = 'work/acceptance/r1-progress';
const results = [];
const errors = [];

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(String(e)));

try {
  await page.goto(base + '/?mission=r1&quality=3&boot=0');
  await page.waitForSelector('[data-mission-step]', { timeout: 30000 });

  // 干净档：从 A 开始
  await page.evaluate(() => localStorage.removeItem('sparkmate.checksum.mission.v1'));
  await page.reload();
  await page.waitForSelector('[data-mission-step]', { timeout: 30000 });
  const fresh = await page.locator('.mission-header small').innerText();
  if (!/A · 1 OF 3/.test(fresh)) throw new Error('fresh order 不是 A：' + fresh);
  if (!/已完成 0\/3/.test(fresh)) throw new Error('fresh progress 应为 0/3：' + fresh);
  results.push('干净档从 A 开始，进度 0/3');

  // 模拟完成 A 后刷新：应从 B 继续
  await page.evaluate(() => {
    localStorage.setItem(
      'sparkmate.checksum.mission.v1',
      JSON.stringify({ completed: ['A'], updatedAt: Date.now() }),
    );
  });
  await page.reload();
  await page.waitForSelector('[data-mission-step]', { timeout: 30000 });
  const resumed = await page.locator('.mission-header small').innerText();
  if (!/B · 2 OF 3/.test(resumed)) throw new Error('resume 未停在 B：' + resumed);
  if (!/已完成 1\/3/.test(resumed)) throw new Error('resume 进度应为 1/3：' + resumed);
  results.push('已完成 A 后刷新，从 B 继续且显示 1/3');
  await page.screenshot({ path: out + '/1-resume-B.png' });

  // 坏档回退：A/B/C 之外的脏数据不应破坏页面
  await page.evaluate(() => {
    localStorage.setItem('sparkmate.checksum.mission.v1', 'not-json');
  });
  await page.reload();
  await page.waitForSelector('[data-mission-step]', { timeout: 30000 });
  const fallback = await page.locator('.mission-header small').innerText();
  if (!/A · 1 OF 3/.test(fallback)) throw new Error('坏档未回退 A：' + fallback);
  results.push('坏档回退到 A');
  await page.screenshot({ path: out + '/2-bad-storage-fallback.png' });

  console.log(JSON.stringify({ ok: true, results, errors }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, results, errors, failure: String(e) }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
