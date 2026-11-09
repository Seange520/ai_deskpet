import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = 'D:/deepseek_file/work/acceptance/ui-mobile';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

async function shot(name) {
  await page.screenshot({ path: `${out}/${name}.png` });
}

async function overflow(tag) {
  const has = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (has) errors.push(`overflow:${tag}`);
  return has;
}

try {
  await page.goto(base + '/?quality=3', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('boot-screen').waitFor({ state: 'hidden', timeout: 120000 });
  await page.waitForTimeout(1500);
  await overflow('hub');
  await shot('01-hub');

  await page.getByTestId('teaching-entry').click();
  await page.locator('[data-teaching-panel]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(700);
  await overflow('panel');
  await shot('02-panel');

  await page.getByRole('tab', { name: '星图' }).click();
  await page.waitForTimeout(700);
  await overflow('starmap');
  await shot('03-starmap');

  await page.getByRole('tab', { name: '课节' }).click();
  await page.waitForTimeout(400);
  const entry = page.locator('[data-start-lesson-v2]').first();
  if ((await entry.count()) > 0) {
    await entry.click();
    await page.locator('[data-lesson-v2]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(700);
    await overflow('lesson');
    await shot('04-lesson');
    const next = page.locator('[data-v2-next]');
    if (await next.count()) {
      await next.click().catch(() => {});
      await page.waitForTimeout(900);
      await overflow('lesson2');
      await shot('05-lesson2');
    }
  }

  console.log(JSON.stringify({ ok: errors.length === 0, errors }));
} catch (error) {
  await page.screenshot({ path: out + '/failure.png' }).catch(() => {});
  console.error('FAILED', error.message, errors);
  process.exit(1);
} finally {
  await browser.close();
}
