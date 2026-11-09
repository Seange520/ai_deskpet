import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = 'D:/deepseek_file/work/acceptance/ui-v2';
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
        runId: 'ui-' + id,
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
  await page.getByTestId('boot-screen').waitFor({ state: 'hidden', timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: out + '/01-hub.png' });

  await page.getByTestId('teaching-entry').click();
  await page.locator('[data-teaching-panel]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: out + '/02-teaching-panel.png' });

  const entry = page.locator('[data-start-lesson-v2="AD-01"]');
  if ((await entry.count()) > 0) {
    await entry.click();
    await page.locator('[data-lesson-v2="AD-01"]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: out + '/03-lesson-v2.png' });
    await page.locator('[data-v2-next]').click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: out + '/04-lesson-observe.png' });
  }

  await page.goto(base + '/?quality=3&world=p9', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('boot-screen').waitFor({ state: 'hidden', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(3500);
  const roam = page.getByRole('button', { name: '开始自由探索' }).first();
  if (await roam.count()) {
    await roam.click().catch(() => {});
    await page.waitForTimeout(3000);
  }
  await page.screenshot({ path: out + '/05-street.png' });

  console.log(JSON.stringify({ ok: true, errors }));
} catch (error) {
  await page.screenshot({ path: out + '/failure.png' }).catch(() => {});
  console.error('FAILED', error.message, errors);
  process.exit(1);
} finally {
  await browser.close();
}
