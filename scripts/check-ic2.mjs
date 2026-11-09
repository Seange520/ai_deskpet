import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = process.env.SPARKMATE_IC_OUTPUT || '../work/acceptance/ic2';
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
  await page.goto(base + '/?quality=0&world=p9', { waitUntil: 'domcontentloaded' });
  await seed(['K0-01', 'K0-02', 'K1-01', 'IC-01']);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPanel();
  await shot('01-panel');

  const entry = page.locator('[data-start-lesson-v2="IC-02"]');
  if ((await entry.count()) === 0) throw new Error('IC-02 入口缺失');
  if (await entry.isDisabled()) throw new Error('IC-02 应已解锁但被禁用');
  pass('解锁链：IC-01 掌握后 IC-02 可开始');

  await entry.click();
  await page.locator('[data-lesson-v2="IC-02"]').waitFor({ timeout: 15000 });
  const text = await page.locator('[data-lesson-v2="IC-02"]').innerText();
  if (!text.includes('MOS')) throw new Error('IC-02 内容未渲染');
  await shot('02-ic02-mission');
  pass('IC-02 任务制课节可进入并渲染');

  const next = () => page.locator('[data-v2-next]').click();
  const chooseRadio = (name) => page.getByRole('radio', { name, exact: true }).check();

  await next();
  await chooseRadio('截止，开关断开');
  await shot('03-ic02-observe');
  await next();

  await chooseRadio('几乎为零');
  await next();

  await page.getByLabel('阈值电压').fill('2');
  await page.getByRole('button', { name: '截止（开关断开）', exact: true }).first().click();
  await page.getByRole('button', { name: '导通（开关闭合）', exact: true }).nth(1).click();
  await page.getByRole('button', { name: '校验 MOS 开关', exact: true }).click();
  await page
    .getByRole('status')
    .filter({ hasText: 'MOS 判断正确' })
    .first()
    .waitFor({ timeout: 10000 });
  await shot('04-ic02-sim');
  pass('MOS 仿真：阈值 2V、Vgs=0 截止、Vgs=5V 导通');

  await next();
  await page.locator('[data-reading="threshold"]').fill('2');
  await page.locator('[data-reading="drain"]').fill('10');
  await page.locator('[data-prove-submit]').click();
  await next();

  await chooseRadio('栅极电压低于源极时');
  await next();

  await page.locator('[data-v2-submit]').click();
  await page.locator('[data-v2-complete="true"]').waitFor({ timeout: 15000 });
  await shot('05-ic02-complete');
  pass('七段任务制真实走通并提交完成');

  const profile = await page.evaluate(async () => {
    const learning = await import('/src/features/learning/learning.mjs');
    return localStorage.getItem(learning.PROFILE_KEY);
  });
  const parsed = JSON.parse(profile);
  const kp = parsed.kps['IC-02'];
  if (!kp || kp.status !== 'mastered') throw new Error('档案未记录 IC-02 mastered');
  if ((kp.evidence ?? []).length < 3) throw new Error('证据不足 3 条');
  pass('档案写入 mastered 与证据链');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPanel();
  const still = page.locator('[data-start-lesson-v2="IC-02"]');
  if ((await still.count()) === 0) throw new Error('刷新后 IC-02 入口丢失');
  pass('刷新后进度保留、入口仍在');

  console.log(JSON.stringify({ passed: results.length, failed: 0, errors }));
  await browser.close();
} catch (error) {
  await shot('failure').catch(() => {});
  await browser.close();
  console.error('FAILED:', error.message);
  console.log(JSON.stringify({ passed: results.length, errors }));
  process.exit(1);
}
