import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = 'D:/deepseek_file/work/acceptance/ui-v2b';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

async function shot(name) {
  await page.screenshot({ path: `${out}/${name}.png` });
}

try {
  await page.goto(base + '/?quality=3', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out + '/00-boot.png' }).catch(() => {});

  await page.getByTestId('boot-screen').waitFor({ state: 'hidden', timeout: 120000 });
  await page.waitForTimeout(1800);
  await shot('01-hub');

  await page.getByTestId('teaching-entry').click();
  await page.locator('[data-teaching-panel]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(600);
  await shot('02-teaching-panel');

  await page.getByRole('tab', { name: '星图' }).click();
  await page.waitForTimeout(800);
  await shot('03-starmap');

  await page.getByRole('tab', { name: '课节' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '开始诊断' }).click().catch(() => {});
  await page.waitForTimeout(800);
  await shot('04-diagnostic');
  await page.getByRole('button', { name: '以后再说' }).click().catch(() => {});
  await page.waitForTimeout(300);

  const entries = page.locator('[data-start-lesson-v2]');
  const n = await entries.count();
  if (n > 0) {
    await entries.nth(0).click();
    await page.locator('[data-lesson-v2]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(700);
    await shot('05-lesson-mission');
    for (const step of [1, 2, 3]) {
      const next = page.locator('[data-v2-next]');
      if ((await next.count()) === 0) break;
      await next.click().catch(() => {});
      await page.waitForTimeout(900);
      await shot(`06-lesson-seg${step}`);
    }
  }

  console.log(JSON.stringify({ ok: true, lessons: n, errors }));
} catch (error) {
  await page.screenshot({ path: out + '/failure.png' }).catch(() => {});
  console.error('FAILED', error.message, errors);
  process.exit(1);
} finally {
  await browser.close();
}
