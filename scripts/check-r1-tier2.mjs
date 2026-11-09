import { chromium } from 'playwright';

const base = process.env.R1_BASE_URL || 'http://127.0.0.1:15262';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(base + '/?mission=r1&quality=2', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
const gate = await page.locator('.mission-gate').count();
const overlay = await page.locator('.mission-overlay').count();
const step = await page.locator('.mission-heading h1').first().textContent().catch(() => null);
await page.screenshot({ path: 'work/acceptance/r1-mission/7-tier2-mobile.png' });
console.log(JSON.stringify({ gate, overlay, step, errors }, null, 2));
await browser.close();
