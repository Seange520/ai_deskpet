import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = 'D:/deepseek_file/work/acceptance/ui-themes';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

async function seed() {
  await page.evaluate(async () => {
    const learning = await import('/src/features/learning/learning.mjs');
    const graph = (await import('/src/features/learning/data/knowledge-graph.v1.json')).default;
    let p = learning.freshProfile(graph);
    for (const id of ['K0-01', 'K0-02', 'K1-01', 'AD-01']) {
      p = learning.beginLesson(graph, p, id);
      p = learning.completeLesson(graph, p, id, {
        runId: 'theme-' + id,
        checkScore: 1,
        transferScore: 1,
        evidence: [{ type: 'quiz', score: 1, context: {} }],
      });
    }
    localStorage.setItem(learning.PROFILE_KEY, JSON.stringify(p));
  });
}

try {
  await page.goto(base + '/?quality=3', { waitUntil: 'domcontentloaded' });
  await seed();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByTestId('boot-screen').waitFor({ state: 'hidden', timeout: 120000 });
  await page.waitForTimeout(1000);

  for (const id of ['deep', 'light', 'anime']) {
    await page.evaluate((theme) => localStorage.setItem('sparkmate.ui.theme.v1', theme), id);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByTestId('boot-screen').waitFor({ state: 'hidden', timeout: 120000 });
    await page.waitForTimeout(900);
    await page.getByTestId('teaching-entry').click();
    await page.locator('[data-teaching-panel]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(700);
    const applied = await page.evaluate(() => document.documentElement.dataset.theme || 'deep');
    if (applied !== id) errors.push(`theme:${id}->${applied}`);
    await page.screenshot({ path: `${out}/${id}-panel.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // 通过设置面板切换并验证持久化
  await page.evaluate(() => localStorage.setItem('sparkmate.ui.theme.v1', 'deep'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByTestId('boot-screen').waitFor({ state: 'hidden', timeout: 120000 });
  await page.waitForTimeout(800);
  await page.locator('.quality-settings summary').click();
  await page.getByLabel('浅色纸张').click().catch(async () => {
    await page.getByText('浅色纸张').click();
  });
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  const stored = await page.evaluate(() => localStorage.getItem('sparkmate.ui.theme.v1'));
  await page.screenshot({ path: out + '/switch-light.png' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByTestId('boot-screen').waitFor({ state: 'hidden', timeout: 120000 });
  const persisted = await page.evaluate(() => document.documentElement.dataset.theme);

  console.log(JSON.stringify({ ok: errors.length === 0, after, stored, persisted, errors }));
} catch (error) {
  await page.screenshot({ path: out + '/failure.png' }).catch(() => {});
  console.error('FAILED', error.message, errors);
  process.exit(1);
} finally {
  await browser.close();
}
