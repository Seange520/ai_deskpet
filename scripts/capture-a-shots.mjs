import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.A_SHOT_URL || 'http://127.0.0.1:15262';
const out = process.env.A_SHOT_OUT || '../work/store/shots-a';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const shots = [];

async function snap(page, name) {
  await page.screenshot({ path: `${out}/${name}.png` });
  shots.push(name);
}

async function openProject(page) {
  await page.goto(base + '/', { waitUntil: 'load' });
  const enter = page.locator('[data-boot-enter]');
  if (await enter.count()) {
    await enter.first().click({ timeout: 5000 }).catch(() => {});
  }
  await page.waitForTimeout(1500);
}

const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => errors.push(String(e)));
await openProject(page);
await snap(page, '01-dashboard-a-2x');
const panel = page.getByText('校验之径').first();
await panel.click({ timeout: 8000 }).catch(() => {});
await page.waitForTimeout(800);
await snap(page, '02-teaching-panel-a-2x');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

await page.goto(base + '/?mission=r1&quality=3', { waitUntil: 'load' });
await page.getByText('晴光街').first().waitFor({ timeout: 30000 });
await page.waitForTimeout(1400);
await snap(page, '03-r1-brief-a-2x');
await page.getByRole('button', { name: /接下这份委托/ }).first().click({ timeout: 8000 }).catch(() => {});
await page.waitForTimeout(1200);
await snap(page, '04-r1-mission-a-2x');

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
mobile.on('pageerror', (e) => errors.push(String(e)));
await mobile.goto(base + '/?mission=r1&quality=3', { waitUntil: 'load' });
await mobile.getByText('晴光街').first().waitFor({ timeout: 30000 });
await mobile.waitForTimeout(1200);
await mobile.screenshot({ path: `${out}/05-r1-mobile-3x.png` });
shots.push('05-r1-mobile-3x');

await writeFile(`${out}/report.json`, JSON.stringify({ shots, errors }, null, 2));
console.log(JSON.stringify({ shots, errors }));
await browser.close();
