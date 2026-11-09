import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = process.env.SPARKMATE_AD_OUTPUT || 'test-results/deskpet-a5';
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
  await seed(['AD-01', 'AD-02', 'AD-03', 'AD-04']);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPanel();
  await shot('01-chapter-ch0');

  const ch0 = page.locator('[data-teaching-chapters] article').filter({ hasText: '第零章' });
  if ((await ch0.count()) === 0) throw new Error('ch0 章节卡缺失');
  for (const id of ['AD-01', 'AD-02', 'AD-03', 'AD-04', 'AD-05']) {
    if ((await page.locator(`[data-start-lesson-v2="${id}"]`).count()) === 0) {
      throw new Error('课节入口缺失: ' + id);
    }
  }
  pass('第零章章节卡展示 AD-01…AD-05 五个任务制入口');

  const ad05 = page.locator('[data-start-lesson-v2="AD-05"]');
  if (await ad05.isDisabled()) throw new Error('AD-05 应已解锁但被禁用');
  pass('解锁链：AD-04 掌握后 AD-05 可开始');

  await ad05.click();
  await page.locator('[data-lesson-v2="AD-05"]').waitFor({ timeout: 15000 });
  const ad05Text = await page.locator('[data-lesson-v2="AD-05"]').innerText();
  if (!ad05Text.includes('组装') && !ad05Text.includes('预检')) {
    throw new Error('AD-05 内容未渲染');
  }
  await shot('02-ad05-mission');
  pass('AD-05 任务制课节可进入并渲染');

  const next = () => page.locator('[data-v2-next]').click();
  const chooseRadio = (name) => page.getByRole('radio', { name, exact: true }).check();

  await next();
  await chooseRadio('断电挂牌');
  await shot('03-ad05-observe');
  await next();

  await chooseRadio('过流时切断电路');
  await next();

  await page.getByLabel('通断档读数', { exact: true }).selectOption('ol');
  await page.getByRole('button', { name: '验证联锁', exact: true }).click();
  await page
    .getByRole('status')
    .filter({ hasText: '预检未完成' })
    .first()
    .waitFor({ timeout: 10000 });
  await shot('04-ad05-blocked');
  pass('预检未完成时联锁拒绝放行（不跳步、不提前上电）');

  for (const name of ['断电挂牌', '核对极性', '确认共地', '绝缘检查', '保险匹配']) {
    await page.getByRole('button', { name: `确认 ${name}`, exact: true }).click();
  }
  await page.getByRole('button', { name: '验证联锁', exact: true }).click();
  await page
    .getByRole('status')
    .filter({ hasText: '联锁放行' })
    .first()
    .waitFor({ timeout: 10000 });
  await shot('05-ad05-interlock');
  await next();

  await page.locator('[data-reading="fuse-rating"]').fill('500');
  await page.locator('[data-reading="insulation-resistance"]').fill('20');
  await page.locator('[data-prove-submit]').click();
  await next();

  await chooseRadio('立即断电，再查极性与绝缘');
  await next();

  await page.locator('[data-v2-submit]').click();
  await page.locator('[data-v2-complete="true"]').waitFor({ timeout: 15000 });
  await shot('06-ad05-complete');
  pass('AD-05 七段流程真实走通并提交');

  const profile = await page.evaluate(async () => {
    const learning = await import('/src/features/learning/learning.mjs');
    const p = JSON.parse(localStorage.getItem(learning.PROFILE_KEY));
    return { status: p.kps['AD-05'].status, evidence: p.kps['AD-05'].evidence.length };
  });
  if (profile.status !== 'mastered') throw new Error('AD-05 未掌握: ' + profile.status);
  if (profile.evidence < 3) throw new Error('AD-05 证据不足: ' + profile.evidence);
  pass('AD-05 操作写入档案：mastered 且证据 ≥3');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPanel();
  const ad05b = page.locator('[data-start-lesson-v2="AD-05"]');
  if ((await ad05b.count()) === 0) throw new Error('刷新后 AD-05 入口丢失');
  const persisted = await page.evaluate(async () => {
    const learning = await import('/src/features/learning/learning.mjs');
    const p = JSON.parse(localStorage.getItem(learning.PROFILE_KEY));
    return { status: p.kps['AD-05'].status, evidence: p.kps['AD-05'].evidence.length };
  });
  if (persisted.status !== 'mastered') throw new Error('刷新后 AD-05 进度丢失');
  if (persisted.evidence < 3) throw new Error('刷新后 AD-05 证据丢失');
  if ((await page.locator('[data-lesson-v2]').count()) !== 0) {
    throw new Error('刷新后不应自动打开课节容器');
  }
  pass('刷新后进度保留：AD-05 仍 mastered、证据 ≥3，章节卡五课入口齐全');

  const pending = results.filter((r) => !r.passed).length;
  writeFileSync(`${out}/deskpet-a5-checks.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ passed: results.length - pending, failed: pending, errors }));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  await shot('failure').catch(() => {});
  writeFileSync(
    `${out}/deskpet-a5-checks.json`,
    JSON.stringify({ results, errors, error: String(error) }, null, 2),
  );
  console.error(String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
}
