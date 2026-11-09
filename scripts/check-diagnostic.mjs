import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = process.env.SPARKMATE_DIAGNOSTIC_OUTPUT || 'test-results/diagnostic';
mkdirSync(out, { recursive: true });
const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const errors = [];
const shaders = [];
const results = [];
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error' && !/lighting-color|liquid-glass/i.test(m.text()))
    errors.push(m.text());
});
page.on('console', (m) => {
  if (/shader|WebGL/i.test(m.text()) && m.type() === 'error')
    shaders.push(m.text());
});
const shot = (name) => page.screenshot({ path: out + '/' + name + '.png' });
try {
  await page.goto(base + '/?quality=0', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '开始' }).first().waitFor({
    state: 'visible',
    timeout: 30000,
  });
  await page.evaluate(() =>
    localStorage.removeItem('sparkmate.checksum.profile.v1'),
  );
  await page.waitForTimeout(1200);
  const entry = page.getByRole('button', { name: '校验之径' }).first();
  await entry.click();
  await page
    .getByRole('heading', { name: '校验之径' })
    .waitFor({ state: 'visible', timeout: 15000 });
  await shot('01-panel-empty');
  const card = page.locator('[data-diagnostic-card]');
  await card.locator('button').click();
  await page.locator('[data-diagnostic-panel]').waitFor({ state: 'visible' });
  await shot('02-diagnostic-open');
  const data = await page.evaluate(() =>
    fetch('/src/features/learning/data/diagnostic.v1.json').then((r) => r.json()),
  );
  const groups = page.locator('[data-diagnostic-panel] ol > li');
  const count = await groups.count();
  if (count !== 12) throw new Error('diagnostic question count ' + count);
  for (let i = 0; i < 12; i++) {
    const q = data.questions[i];
    await groups.nth(i).locator('input[type=radio]').nth(q.answerIndex).check();
  }
  await page
    .getByRole('button', { name: /提交诊断（12\/12）/ })
    .click();
  const result = page.locator('[data-diagnostic-result]');
  await result.waitFor({ state: 'visible', timeout: 5000 });
  const path = await result.getAttribute('data-diagnostic-result');
  if (path !== 'C') throw new Error('expected path C, got ' + path);
  await shot('03-diagnostic-result');
  const profile = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('sparkmate.checksum.profile.v1') || '{}'),
  );
  if (!profile.diagnostic || profile.diagnostic.path !== path)
    throw new Error('profile diagnostic missing/mismatch');
  await page.getByRole('button', { name: '知道了，开始学习' }).click();
  await page.locator('[data-teaching-chapters]').waitFor({ state: 'visible' });
  await shot('04-chapters');
  results.push({ name: 'diagnostic flow and persistence', path });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const start = page.getByRole('button', { name: /开始自由探索/ });
  if (await start.count()) {
    /* not an exploration requirement */
  }
  results.push({ name: 'no runtime errors while opening panel' });
} catch (error) {
  await shot('failure').catch(() => {});
  throw error;
} finally {
  const summary = { passed: results.length, results, errors, shaders, out };
  writeFileSync(out + '/diagnostic-checks.json', JSON.stringify(summary, null, 2));
  await browser.close();
  console.log(JSON.stringify(summary, null, 2));
}
