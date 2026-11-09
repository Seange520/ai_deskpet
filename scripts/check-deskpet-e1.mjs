import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = process.env.SPARKMATE_AD_OUTPUT || '../work/acceptance/deskpet-e1';
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
  await seed(['AD-01', 'AD-02', 'AD-03', 'AD-04', 'AD-05']);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPanel();
  await shot('01-chapter-ch0');

  if ((await page.locator('[data-teaching-chapters] article').count()) === 0) {
    throw new Error('章节卡缺失');
  }
  for (const id of ['AD-01', 'AD-02', 'AD-03', 'AD-04', 'AD-05', 'AD-06']) {
    if ((await page.locator(`[data-start-lesson-v2="${id}"]`).count()) === 0) {
      throw new Error('课节入口缺失: ' + id);
    }
  }
  pass('第零章章节卡展示 AD-01…AD-06 六个任务制入口');

  const ad06 = page.locator('[data-start-lesson-v2="AD-06"]');
  if (await ad06.isDisabled()) throw new Error('AD-06 应已解锁但被禁用');
  pass('解锁链：AD-05 掌握后 AD-06 可开始');

  await ad06.click();
  await page.locator('[data-lesson-v2="AD-06"]').waitFor({ timeout: 15000 });
  const text = await page.locator('[data-lesson-v2="AD-06"]').innerText();
  if (!text.includes('屏幕') && !text.includes('表情')) throw new Error('AD-06 内容未渲染');
  await shot('02-ad06-mission');
  pass('AD-06 任务制课节可进入并渲染');

  const next = () => page.locator('[data-v2-next]').click();
  const chooseRadio = (name) => page.getByRole('radio', { name, exact: true }).check();

  await next();
  await chooseRadio('8 行');
  await shot('03-ad06-observe');
  await next();

  await chooseRadio('连续改写几帧的眼睛字节');
  await next();

  await page.getByLabel('显存字节数', { exact: true }).fill('1024');
  await page.getByLabel('表情页', { exact: true }).selectOption('page-5');
  await page.getByLabel('每行字节数', { exact: true }).fill('16');
  await page.getByRole('button', { name: '校验帧缓冲', exact: true }).click();
  await page
    .getByRole('status')
    .filter({ hasText: '帧缓冲对上了' })
    .first()
    .waitFor({ timeout: 10000 });
  await shot('04-ad06-sim');
  pass('帧缓冲仿真：1024 B、第 5 页、16 B/行 全部对上');

  await page.getByLabel('显存字节数', { exact: true }).fill('2048');
  await page.getByRole('button', { name: '校验帧缓冲', exact: true }).click();
  await page
    .getByRole('status')
    .filter({ hasText: '显存不对' })
    .first()
    .waitFor({ timeout: 10000 });
  pass('错误显存被拒并给出计算提示（不误判通过）');
  await page.getByLabel('显存字节数', { exact: true }).fill('1024');
  await page.getByRole('button', { name: '校验帧缓冲', exact: true }).click();
  await page
    .getByRole('status')
    .filter({ hasText: '帧缓冲对上了' })
    .first()
    .waitFor({ timeout: 10000 });
  await next();

  await page.locator('[data-reading="frame-buffer"]').fill('1024');
  await page.locator('[data-reading="row-bytes"]').fill('16');
  await page.locator('[data-prove-submit]').click();
  await next();

  await chooseRadio('排线方向与帧缓冲写入范围');
  await next();

  await page.locator('[data-v2-submit]').click();
  await page.locator('[data-v2-complete="true"]').waitFor({ timeout: 15000 });
  await shot('05-ad06-complete');
  pass('AD-06 七段流程真实走通并提交');

  const profile = await page.evaluate(async () => {
    const learning = await import('/src/features/learning/learning.mjs');
    const p = JSON.parse(localStorage.getItem(learning.PROFILE_KEY));
    return { status: p.kps['AD-06'].status, evidence: p.kps['AD-06'].evidence.length };
  });
  if (profile.status !== 'mastered') throw new Error('AD-06 未掌握: ' + profile.status);
  if (profile.evidence < 3) throw new Error('AD-06 证据不足: ' + profile.evidence);
  pass('AD-06 操作写入档案：mastered 且证据 ≥3');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPanel();
  if ((await page.locator('[data-start-lesson-v2="AD-06"]').count()) === 0) {
    throw new Error('刷新后 AD-06 入口丢失');
  }
  const persisted = await page.evaluate(async () => {
    const learning = await import('/src/features/learning/learning.mjs');
    const p = JSON.parse(localStorage.getItem(learning.PROFILE_KEY));
    return { status: p.kps['AD-06'].status, evidence: p.kps['AD-06'].evidence.length };
  });
  if (persisted.status !== 'mastered') throw new Error('刷新后 AD-06 进度丢失');
  if ((await page.locator('[data-lesson-v2]').count()) !== 0) {
    throw new Error('刷新后不应自动打开课节容器');
  }
  pass('刷新后进度保留：AD-06 仍 mastered、六课入口齐全');

  const pending = results.filter((r) => !r.passed).length;
  writeFileSync(`${out}/deskpet-e1-checks.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ passed: results.length - pending, failed: pending, errors }));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  await shot('failure').catch(() => {});
  writeFileSync(
    `${out}/deskpet-e1-checks.json`,
    JSON.stringify({ results, errors, error: String(error) }, null, 2),
  );
  console.error(String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
}
