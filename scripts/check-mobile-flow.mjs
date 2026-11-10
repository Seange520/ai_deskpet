import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.R1_BASE_URL || 'http://127.0.0.1:5173';
const out = process.env.MOBILE_OUTPUT || 'work/acceptance/mobile-flow';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const errors = [];
const passes = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`);
});

const hud = () => page.locator('[data-mission-step]');
const action = (type) => page.getByTestId('action-' + type);
async function step(expected) {
  await expect(hud()).toHaveAttribute('data-mission-step', expected);
}
async function go(point) {
  await page.getByTestId('point-' + point).click();
  await expect(page.locator('.mission-kit')).toHaveAttribute('data-selected-point', point);
}
async function overflowFree(label) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  assert.ok(overflow <= 1, `${label} horizontal overflow ${overflow}px`);
  passes.push(`${label}: no horizontal overflow`);
}
async function shot(name) {
  await page.screenshot({ path: `${out}/${name}.png` });
}

try {
  await page.goto(base + '/?quality=2&boot=0', { waitUntil: 'networkidle' });
  const entry = page.getByRole('link', { name: /校验委托/ });
  await expect(entry).toBeVisible();
  await overflowFree('dashboard');
  await shot('01-dashboard');

  await entry.click();
  await expect(hud()).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
  await expect(hud()).toHaveAttribute('data-order', 'A');
  await page.getByRole('button', { name: '校验轨', exact: false }).click();
  await action('accept').click();
  await action('begin').click();
  await step('powered');
  await go('switch');
  await action('isolate').click();
  await step('isolated');
  await go('meter');
  await action('inspect').click();
  await step('located');
  await action('repair').click();
  await action('measure').click();
  await action('record').click();
  await action('repair').click();
  await step('repaired');
  await action('verify').click();
  await action('measure').click();
  await action('record').click();
  await action('verify').click();
  await step('verified');
  await go('switch');
  await action('energize').click();
  await step('scored');
  await expect(page.getByTestId('mission-score')).toHaveText(/^\d{2,3}$/);
  await page.waitForTimeout(700);
  await overflowFree('mission score');
  await shot('02-score');
  passes.push('mobile R1 A: full repair loop (check track) and score');

  await page.getByText('返回学习枢纽', { exact: true }).click();
  await expect(page.getByRole('link', { name: /校验委托/ })).toContainText('1/3');
  await overflowFree('hub after mission');
  await shot('03-hub-after');

  await page.getByRole('button', { name: /校验之径/ }).first().click();
  await expect(page.locator('.teaching-panel')).toBeVisible();
  await overflowFree('teaching panel');
  await page.getByRole('tab', { name: '课节' }).click();
  await page.screenshot({ path: `${out}/04-teaching.png` });
  await page.getByRole('button', { name: /开始课节/ }).first().click();
  await expect(page.locator('.teaching-run')).toBeVisible({ timeout: 15000 });
  await overflowFree('lesson v2');
  await shot('05-lesson');
  passes.push('teaching panel and lesson open on 390px');

  console.log(JSON.stringify({ passed: errors.length === 0, passes, errors }));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png` });
  console.log(JSON.stringify({ passed: false, passes, errors: [...errors, String(error)] }));
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
