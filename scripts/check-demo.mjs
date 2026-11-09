import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = process.env.SPARKMATE_AD_OUTPUT || '../work/acceptance/demo-mode';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const text = m.text();
  if (/Invalid DOM property|lighting-color/.test(text)) return;
  errors.push(text);
});
const results = [];
const pass = (name) => results.push({ name, passed: true });
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });

async function openPanel() {
  await page.getByTestId('teaching-entry').waitFor({ state: 'visible', timeout: 45000 });
  await page.getByTestId('teaching-entry').click();
  await page.locator('[data-teaching-panel]').waitFor({ state: 'visible', timeout: 15000 });
}

async function seed(ids) {
  await page.evaluate(async (list) => {
    const learning = await import('/src/features/learning/learning.mjs');
    const graph = (await import('/src/features/learning/data/knowledge-graph.v1.json')).default;
    let p = learning.freshProfile(graph);
    for (const id of list) {
      p = learning.beginLesson(graph, p, id);
      p = learning.completeLesson(graph, p, id, {
        runId: 'seed-' + id,
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
  await page.goto(base + '/?quality=0&world=p9&demo=1', { waitUntil: 'domcontentloaded' });
  await seed(['AD-01']);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPanel();
  await shot('01-demo-panel');

  if ((await page.locator('[data-demo-banner]').count()) !== 1) throw new Error('Demo 横幅缺失');
  pass('demo=1 打开教学面板时显示 Demo 横幅');

  const cards = page.locator('.teaching-lessons article');
  if ((await cards.count()) !== 5) throw new Error('Demo 课节数量应为 5，实际 ' + (await cards.count()));
  for (const id of ['AD-01', 'AD-02', 'K1-01', 'K1-04', 'K1-06']) {
    const card = page.locator('.teaching-lessons article', { hasText: id });
    if ((await card.count()) === 0) throw new Error('Demo 课节缺失: ' + id);
  }
  if ((await page.locator('[data-start-lesson-v2="AD-06"]').count()) !== 0) {
    throw new Error('Demo 不应出现 AD-06');
  }
  if ((await page.locator('[data-start-lesson-v2="AD-18"]').count()) !== 0) {
    throw new Error('Demo 不应出现 AD-18');
  }
  pass('Demo 模式只展示 AD-01/AD-02/K1-01/K1-04/K1-06 五节');

  const chapters = page.locator('[data-teaching-chapters] article');
  if ((await chapters.count()) !== 2) throw new Error('Demo 章节卡应为 2 章，实际 ' + (await chapters.count()));
  const ch0 = page.locator('[data-teaching-chapters] article', { hasText: '第零章' });
  if (!(await ch0.innerText()).includes('1/2 节已完成')) throw new Error('Demo 未继承演示档案的 AD-01 进度');
  if ((await page.locator('[data-teaching-chapters] article', { hasText: '第二章' }).count()) !== 0) {
    throw new Error('Demo 不应出现第二章');
  }
  pass('Demo 章节卡仅保留有内容的两章，并继承 AD-01 已掌握进度');
  await shot('02-demo-chapters');

  await ch0.getByRole('button', { name: /继续/ }).click();
  await page.locator('[data-lesson-v2]').waitFor({ state: 'visible', timeout: 15000 });
  if ((await page.locator('[data-lesson-v2="AD-02"]').count()) !== 1) {
    throw new Error('Demo 继续按钮未进入 AD-02');
  }
  pass('Demo 内可进入白名单课节 AD-02（任务制）');
  await shot('03-demo-lesson');
  await page.getByRole('button', { name: '返回课节列表' }).click();

  // 关闭 Demo：清标志后按正式版打开，验证存档继承与完整课表恢复
  await page.evaluate(() => localStorage.removeItem('sparkmate.checksum.demo.v1'));
  await page.goto(base + '/?quality=0&world=p9', { waitUntil: 'domcontentloaded' });
  await openPanel();
  if ((await page.locator('[data-demo-banner]').count()) !== 0) throw new Error('正式版不应显示 Demo 横幅');
  if ((await page.locator('.teaching-lessons article').count()) !== 59) {
    throw new Error('正式版课节数量应为 59，实际 ' + (await page.locator('.teaching-lessons article').count()));
  }
  if ((await page.locator('[data-start-lesson-v2="AD-18"]').count()) !== 1) throw new Error('正式版缺少 AD-18 入口');
  if ((await page.locator('[data-start-lesson-v2="AD-06"]').count()) !== 1) throw new Error('正式版缺少 AD-06 入口');
  if ((await page.locator('[data-teaching-chapters] article').count()) !== 4) {
    throw new Error('正式版章节卡应为 4 章');
  }
  const ch0Full = page.locator('[data-teaching-chapters] article', { hasText: '第零章' });
  if (!(await ch0Full.innerText()).includes('1/18 节已完成')) {
    throw new Error('正式版未继承 Demo 存档进度');
  }
  pass('同一档案切回正式版：完整课表恢复，Demo 进度保留（存档继承）');
  await shot('04-full-after-demo');

  if (errors.length) throw new Error('页面错误: ' + errors.join(' | '));
  writeFileSync(`${out}/demo-checks.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ passed: results.length, failed: 0, errors }));
} catch (error) {
  await shot('failure');
  writeFileSync(`${out}/demo-checks.json`, JSON.stringify({ results, errors, error: String(error) }, null, 2));
  console.error(JSON.stringify({ passed: results.length, failed: 1, error: String(error), errors }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
