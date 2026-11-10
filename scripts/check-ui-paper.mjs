import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = 'D:/deepseek_file/work/acceptance/ui-paper';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

try {
  await page.goto(base + '/?quality=3', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    const learning = await import('/src/features/learning/learning.mjs');
    const graph = (await import('/src/features/learning/data/knowledge-graph.v1.json')).default;
    let p = learning.freshProfile(graph);
    for (const id of ['K0-01', 'K0-02', 'K1-01', 'AD-01']) {
      p = learning.beginLesson(graph, p, id);
      p = learning.completeLesson(graph, p, id, {
        runId: 'paper-' + id,
        checkScore: 1,
        transferScore: 1,
        evidence: [{ type: 'quiz', score: 1, context: {} }],
      });
    }
    localStorage.setItem(learning.PROFILE_KEY, JSON.stringify(p));
    localStorage.setItem('sparkmate.ui.theme.v1', 'light');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByTestId('boot-screen').waitFor({ state: 'hidden', timeout: 120000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: out + '/00-world-paper.png' });
  const dash = page.getByRole('button', { name: '校验册' });
  if (await dash.count()) {
    await dash.first().click();
    await page.waitForTimeout(4200);
  }
  await page.screenshot({ path: out + '/01-hub-paper.png' });

  await page.getByTestId('teaching-entry').click();
  await page.locator('[data-teaching-panel]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: out + '/02-panel-paper.png' });

  await page.locator('[data-start-lesson-v2="AD-01"]').click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: out + '/03-lesson-mission-paper.png' });
  const next = page.getByRole('button', { name: '下一段' });
  if (await next.count()) {
    await next.first().click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: out + '/04-lesson-observe-paper.png' });
  }

  const metrics = await page.evaluate(() => {
    const panel = document.querySelector('[data-teaching-panel]');
    const h2 = panel?.querySelector('h2');
    const p = panel?.querySelector('p');
    const cs = (el) => (el ? getComputedStyle(el) : null);
    return {
      theme: document.documentElement.dataset.theme || 'deep',
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      h2Font: h2 ? cs(h2).fontFamily : null,
      h2Color: h2 ? cs(h2).color : null,
      panelBg: panel ? cs(panel).backgroundImage.slice(0, 80) : null,
      bodyText: p ? cs(p).color : null,
    };
  });
  console.log(JSON.stringify({ ok: errors.length === 0, metrics, errors }));
} catch (error) {
  console.log(JSON.stringify({ ok: false, error: String(error), errors }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
