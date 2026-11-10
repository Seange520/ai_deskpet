import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.R1_BASE_URL || 'http://127.0.0.1:15262';
const out = 'work/acceptance/r1-flow';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [], passes = [], shots = [];
const hud = () => page.locator('[data-mission-step]');
const action = (t) => page.getByTestId('action-' + t);
const go = async (p) => { await page.getByTestId('point-' + p).click(); await expect(page.locator('.mission-kit')).toHaveAttribute('data-selected-point', p, { timeout: 10000 }); };
const record = async () => { await action('measure').click(); await action('record').click(); };
const shot = async (n) => { await page.screenshot({ path: `${out}/${n}.png` }); shots.push(n + '.png'); };
page.on('pageerror', (e) => errors.push(e.message));
try {
  // 1. 主界面 -> 校验委托入口
  await page.goto(base + '/?quality=3&boot=0', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.app-shell')).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(1200);
  await shot('01-hub');
  const entry = page.locator('a[href*="mission=r1"]').first();
  await expect(entry).toBeVisible({ timeout: 15000 });
  await entry.click();
  await expect(hud()).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
  await shot('02-mission-from-entry');
  passes.push('dashboard entry opens mission route');
  // 2. A 单完整（校验轨）
  await page.getByRole('button', { name: '校验轨', exact: false }).click();
  await action('accept').click();
  await action('begin').click();
  await expect(hud()).toHaveAttribute('data-mission-step', 'powered');
  await go('meter');
  await action('pry').click();
  await expect(hud()).toHaveAttribute('data-mission-step', 'violated');
  await action('retry').click();
  await expect(hud()).toHaveAttribute('data-mission-step', 'retry');
  await action('resume').click();
  await go('switch');
  await action('isolate').click();
  await expect(hud()).toHaveAttribute('data-mission-step', 'isolated');
  await go('meter');
  await action('inspect').click();
  await record();
  await action('repair').click();
  await expect(hud()).toHaveAttribute('data-mission-step', 'repaired');
  await record();
  await action('verify').click();
  await expect(hud()).toHaveAttribute('data-mission-step', 'verified');
  await go('switch');
  await action('energize').click();
  await expect(hud()).toHaveAttribute('data-mission-step', 'scored');
  await expect(page.getByTestId('mission-score')).toHaveText('98');
  await shot('03-A-scored');
  passes.push('A finished via safe repair path, score 98');
  // 3. B/C 体验轨速通 + 完成页
  for (const i of [1, 2]) {
    await action('next').click();
    const exp = page.getByRole('button', { name: '体验轨', exact: false });
    if (await exp.first().isVisible().catch(() => false)) await exp.first().click();
    await action('accept').click();
    await action('begin').click();
    await go('switch');
    if (i === 2) await record();
    await action('isolate').click();
    const target = ['meter', 'joint', 'lamp'][i];
    await go(target);
    await action('inspect').click();
    await action('repair').click();
    await action('verify').click();
    await go('switch');
    await action('energize').click();
    await expect(hud()).toHaveAttribute('data-mission-step', 'scored');
  }
  await page.waitForTimeout(900);
  await shot('04-all-complete');
  await expect(page.getByTestId('mission-complete')).toBeVisible();
  passes.push('B/C finished, all-complete panel visible');
  // 4. 回主界面
  await page.getByRole('link', { name: '返回学习枢纽' }).click();
  await expect(page.locator('.app-shell')).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(800);
  await shot('05-back-hub');
  assert.equal(await page.locator('[data-testid="mission-root"]').count(), 0);
  passes.push('return to hub unmounts mission');
  // 5. 委托板显示每单最佳成绩
  await page.getByRole('button', { name: '委托板' }).first().click();
  await expect(page.locator('.commission-list')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(600);
  const scoreText = await page.locator('.commission-list').innerText();
  assert.match(scoreText, /已修 · \d+ 分/, '委托板显示已修成绩');
  await shot('06-commission-scores');
  passes.push('commission board shows best scores');
} catch (e) {
  errors.push(e.stack || String(e));
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  const report = { passes, errors, shots, passed: errors.length === 0 };
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(`RESULT passes=${passes.length} errors=${errors.length}`);
  console.log(JSON.stringify(report, null, 2));
  await context.close(); await browser.close();
}
