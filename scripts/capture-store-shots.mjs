import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = process.env.SPARKMATE_STORE_OUTPUT || '../work/store/shots';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/Invalid DOM property|lighting-color/.test(t)) return;
  errors.push(t);
});
const taken = [];

const bootEnter = () => page.locator('[data-boot-enter]');
const startButton = () => page.getByRole('button', { name: '开始自由探索', exact: true });

async function scene() {
  return page.evaluate(async () => {
    const entry = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    if (!entry) return {};
    const { _roots } = await import(entry.name);
    const root = _roots.get(document.querySelector('.scene-stage canvas'));
    if (!root) return {};
    const s = root.store.getState();
    return { cameraOwner: s.camera.userData?.owner };
  });
}

async function waitCamera() {
  await page.locator('#exploration-input').waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForTimeout(1500);
  return true;
}

// Boot CTA (optional) → main menu → 开始自由探索 → camera attached.
async function enterExploration() {
  for (let i = 0; i < 480; i += 1) {
    if (await startButton().isVisible().catch(() => false)) break;
    if (await bootEnter().isVisible().catch(() => false)) {
      await bootEnter().click().catch(() => {});
      await page.waitForTimeout(1200);
      continue;
    }
    await page.waitForTimeout(250);
  }
  await startButton().waitFor({ state: 'visible', timeout: 30000 });
  await startButton().click();
  if (!(await waitCamera())) throw new Error('camera did not attach');
  await page.waitForTimeout(1200);
}

async function openTeaching() {
  await page.getByTestId('teaching-entry').click();
  await page.locator('[data-teaching-panel]').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(400);
}

async function shot(name) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${name}.png` });
  taken.push(name);
}

async function seed(ids) {
  await page.evaluate(async (list) => {
    const learning = await import('/src/features/learning/learning.mjs');
    const graph = (await import('/src/features/learning/data/knowledge-graph.v1.json')).default;
    let p = learning.freshProfile(graph);
    for (const id of list) {
      p = learning.beginLesson(graph, p, id);
      p = learning.completeLesson(graph, p, id, {
        runId: 'store-' + id,
        checkScore: 1,
        transferScore: 1,
        evidence: [
          { type: 'quiz', score: 1, context: { seed: 'quiz' } },
          { type: 'measurement', score: 1, context: { seed: 'measure' } },
          { type: 'sim-task', score: 1, context: { seed: 'sim' } },
        ],
      });
    }
    localStorage.setItem(learning.PROFILE_KEY, JSON.stringify(p));
  }, ids);
}

try {
  // 1. 启动读屏（点击前）
  await page.goto(base + '/?quality=3&world=p9', { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 480; i += 1) {
    if (await bootEnter().isVisible().catch(() => false)) break;
    if (await startButton().isVisible().catch(() => false)) break;
    await page.waitForTimeout(250);
  }
  if (await startButton().isVisible().catch(() => false)) await shot('01-main-menu');

  // 2. 主菜单 + 大世界
  await enterExploration();
  await page.mouse.move(1200, 620);
  await page.mouse.down();
  await page.mouse.move(1040, 640, { steps: 14 });
  await page.mouse.up();
  await shot('02-exploration-third-person');

  // 3. 教学面板与星图
  await openTeaching();
  await shot('03-path-lessons');
  await page.getByRole('tab', { name: '星图', exact: true }).click();
  await shot('04-path-starmap');

  // 4. 第零章章节卡
  await seed(['AD-01', 'AD-02', 'AD-03', 'AD-04', 'AD-05']);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await enterExploration();
  await openTeaching();
  await shot('05-chapter-zero');

  // 5. AD-06 课节（帧缓冲观察段）
  await page.locator('[data-start-lesson-v2="AD-06"]').click();
  await page.locator('[data-lesson-v2="AD-06"]').waitFor({ timeout: 15000 });
  await page.locator('[data-v2-next]').click();
  await page.waitForTimeout(700);
  await shot('06-lesson-framebuffer');

  // 6. AD-18 毕业验收课
  await seed((await page.evaluate(async () => {
    const graph = (await import('/src/features/learning/data/knowledge-graph.v1.json')).default;
    return graph.kps.filter((k) => /^AD-/.test(k.id) && k.id !== 'AD-18').map((k) => k.id);
  })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await enterExploration();
  await openTeaching();
  await page.locator('[data-start-lesson-v2="AD-18"]').click();
  await page.locator('[data-lesson-v2="AD-18"]').waitFor({ timeout: 15000 });
  await page.locator('[data-v2-next]').click();
  await page.waitForTimeout(600);
  await shot('07-lesson-graduation');

  writeFileSync(`${out}/manifest.json`, JSON.stringify({ taken, errors }, null, 2));
  console.log(JSON.stringify({ shots: taken.length, taken, errors }));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  writeFileSync(`${out}/manifest.json`, JSON.stringify({ taken, errors, error: String(error) }, null, 2));
  console.error(String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
}
