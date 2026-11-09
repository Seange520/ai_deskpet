import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = process.env.SPARKMATE_AD_OUTPUT || '../work/acceptance/deskpet-p3';
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
  await seed(['AD-01', 'AD-02', 'AD-03', 'AD-04', 'AD-05', 'AD-06', 'AD-07', 'AD-08', 'AD-09', 'AD-10', 'AD-11', 'AD-12', 'AD-13', 'AD-14', 'AD-15', 'AD-16', 'AD-17']);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPanel();
  await shot('01-chapter-ch0');

  if ((await page.locator('[data-teaching-chapters] article').count()) === 0) {
    throw new Error('章节卡缺失');
  }
  const lessons = ['AD-01', 'AD-02', 'AD-03', 'AD-04', 'AD-05', 'AD-06', 'AD-07', 'AD-08', 'AD-09', 'AD-10', 'AD-11', 'AD-12', 'AD-13', 'AD-14', 'AD-15', 'AD-16', 'AD-17', 'AD-18'];
  for (const id of lessons) {
    if ((await page.locator(`[data-start-lesson-v2="${id}"]`).count()) === 0) {
      throw new Error('课节入口缺失: ' + id);
    }
  }
  pass('第零章章节卡展示 AD-01…AD-18 十八个任务制入口');

  const ad18 = page.locator('[data-start-lesson-v2="AD-18"]');
  if (await ad18.isDisabled()) throw new Error('AD-18 应已解锁但被禁用');
  pass('解锁链：AD-17 掌握后 AD-18 可开始（且经三柱 gate）');

  await ad18.click();
  await page.locator('[data-lesson-v2="AD-18"]').waitFor({ timeout: 15000 });
  const text = await page.locator('[data-lesson-v2="AD-18"]').innerText();
  if (!text.includes('毕业') && !text.includes('验收')) throw new Error('AD-18 内容未渲染');
  await shot('02-ad18-mission');
  pass('AD-18 任务制课节可进入并渲染');

  const next = () => page.locator('[data-v2-next]').click();
  const chooseRadio = (name) => page.getByRole('radio', { name, exact: true }).check();

  await next();
  await chooseRadio('可复核的证据链');
  await shot('03-ad18-observe');
  await next();

  await chooseRadio('功能实测、物料与接线、版本与变更记录');
  await next();

  await page.getByRole('button', { name: '感觉没问题，直接发布', exact: true }).click();
  await page.getByRole('button', { name: '校验毕业清单', exact: true }).click();
  await page
    .getByRole('status')
    .filter({ hasText: '还差一项' })
    .first()
    .waitFor({ timeout: 10000 });
  pass('缺项负例被拒绝并提示（不误判通过）');

  await page.getByRole('button', { name: '按验收清单逐项复核并留证据', exact: true }).click();
  await page.getByRole('button', { name: '物料清单、接线图与版本号', exact: true }).click();
  await page.getByRole('button', { name: '可复现的证据与排障方法', exact: true }).click();
  await page.getByRole('button', { name: '校验毕业清单', exact: true }).click();
  await page
    .getByRole('status')
    .filter({ hasText: '毕业验收通过' })
    .first()
    .waitFor({ timeout: 10000 });
  await shot('04-ad18-sim');
  pass('毕业仿真：清单复核、可复现物料、证据与方法');

  await next();
  await page.locator('[data-reading="checked-items"]').fill('12');
  await page.locator('[data-reading="missing-items"]').fill('0');
  await page.locator('[data-prove-submit]').click();
  await next();

  await chooseRadio('缺项的复核证据与复现步骤');
  await next();

  await page.locator('[data-v2-submit]').click();
  await page.locator('[data-v2-complete="true"]').waitFor({ timeout: 15000 });
  await shot('05-ad18-complete');
  pass('AD-18 七段流程真实走通并提交');

  const profile = await page.evaluate(async () => {
    const learning = await import('/src/features/learning/learning.mjs');
    const p = JSON.parse(localStorage.getItem(learning.PROFILE_KEY));
    return { status: p.kps['AD-18'].status, evidence: p.kps['AD-18'].evidence.length };
  });
  if (profile.status !== 'mastered') throw new Error('AD-18 未掌握: ' + profile.status);
  if (profile.evidence < 3) throw new Error('AD-18 证据不足: ' + profile.evidence);
  pass('AD-18 操作写入档案：mastered 且证据 ≥3');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPanel();
  for (const id of ['AD-17', 'AD-18']) {
    if ((await page.locator(`[data-start-lesson-v2="${id}"]`).count()) === 0) {
      throw new Error('刷新后入口丢失: ' + id);
    }
  }
  const persisted = await page.evaluate(async () => {
    const learning = await import('/src/features/learning/learning.mjs');
    const p = JSON.parse(localStorage.getItem(learning.PROFILE_KEY));
    return { status: p.kps['AD-18'].status };
  });
  if (persisted.status !== 'mastered') throw new Error('刷新后 AD-18 进度丢失');
  pass('刷新后进度保留：AD-18 仍 mastered、十八课入口齐全');

  const pending = results.filter((r) => !r.passed).length;
  writeFileSync(`${out}/deskpet-p3-checks.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ passed: results.length - pending, failed: pending, errors }));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  await shot('failure').catch(() => {});
  writeFileSync(
    `${out}/deskpet-p3-checks.json`,
    JSON.stringify({ results, errors, error: String(error) }, null, 2),
  );
  console.error(String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
}
