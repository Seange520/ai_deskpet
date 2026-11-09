import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = process.env.SPARKMATE_AD_OUTPUT || 'test-results/deskpet-a3a4';
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
  await seed(['AD-01', 'AD-02']);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPanel();
  await shot('01-chapter-ch0');

  const ch0 = page
    .locator('[data-teaching-chapters] article')
    .filter({ hasText: '第零章' });
  if ((await ch0.count()) === 0) throw new Error('ch0 章节卡缺失');
  const ch0Text = await ch0.first().innerText();
  for (const t of ['第零章', '造物时刻']) {
    if (!ch0Text.includes(t)) throw new Error('ch0 文案缺失: ' + t);
  }
  for (const id of ['AD-01', 'AD-02', 'AD-03', 'AD-04']) {
    if ((await page.locator(`[data-start-lesson-v2="${id}"]`).count()) === 0) {
      throw new Error('课节入口缺失: ' + id);
    }
  }
  pass('第零章章节卡展示 AD-01…AD-04 四个任务制入口');

  const ad03 = page.locator('[data-start-lesson-v2="AD-03"]');
  const ad04 = page.locator('[data-start-lesson-v2="AD-04"]');
  if (await ad03.isDisabled()) throw new Error('AD-03 应已解锁但被禁用');
  if (!(await ad04.isDisabled())) throw new Error('AD-04 应在 AD-03 掌握前保持锁定');
  pass('解锁链：AD-02 掌握后 AD-03 可开始，AD-04 仍锁定');

  await ad03.click();
  await page.locator('[data-lesson-v2="AD-03"]').waitFor({ timeout: 15000 });
  const ad03Text = await page.locator('[data-lesson-v2="AD-03"]').innerText();
  if (!ad03Text.includes('舵机') && !ad03Text.includes('观察')) {
    throw new Error('AD-03 内容未渲染');
  }
  await shot('02-ad03-mission');
  pass('AD-03 任务制课节可进入并渲染');

  const next = () => page.locator('[data-v2-next]').click();
  const chooseRadio = (name) =>
    page.getByRole('radio', { name, exact: true }).check();

  await next();
  await chooseRadio('PWM 方波');
  await shot('03-ad03-observe');
  await next();

  await chooseRadio('2.0 毫秒');
  await next();

  for (const [ch, v] of [
    ['A', '25'],
    ['B', '50'],
    ['C', '75'],
    ['D', '10'],
  ]) {
    await page.getByLabel(`${ch} 占空比`, { exact: true }).fill(v);
  }
  await page.getByRole('button', { name: '校验 PWM', exact: true }).click();
  await page
    .getByRole('status')
    .filter({ hasText: '全部通过' })
    .first()
    .waitFor({ timeout: 10000 });
  await shot('04-ad03-do');
  await next();

  await page.locator('[data-reading="servo-period"]').fill('20');
  await page.locator('[data-reading="servo-pulse"]').fill('1.5');
  await page.locator('[data-prove-submit]').click();
  await next();

  await chooseRadio('电流上升与发热');
  await next();

  await page.locator('[data-v2-submit]').click();
  await page.locator('[data-v2-complete="true"]').waitFor({ timeout: 15000 });
  await shot('05-ad03-complete');
  pass('AD-03 七段流程真实走通并提交');

  const ad03Profile = await page.evaluate(async () => {
    const learning = await import('/src/features/learning/learning.mjs');
    const p = JSON.parse(localStorage.getItem(learning.PROFILE_KEY));
    return { status: p.kps['AD-03'].status, evidence: p.kps['AD-03'].evidence.length };
  });
  if (ad03Profile.status !== 'mastered') {
    throw new Error('AD-03 未掌握: ' + ad03Profile.status);
  }
  if (ad03Profile.evidence < 3) {
    throw new Error('AD-03 证据不足: ' + ad03Profile.evidence);
  }
  pass('AD-03 操作写入档案：mastered 且证据 ≥3');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPanel();
  const ad04b = page.locator('[data-start-lesson-v2="AD-04"]');
  if (await ad04b.isDisabled()) throw new Error('AD-03 掌握后 AD-04 仍锁定');
  await ad04b.click();
  await page.locator('[data-lesson-v2="AD-04"]').waitFor({ timeout: 15000 });
  const ad04Text = await page.locator('[data-lesson-v2="AD-04"]').innerText();
  if (!ad04Text.includes('总线') && !ad04Text.includes('地址')) {
    throw new Error('AD-04 内容未渲染');
  }
  await shot('03-ad04-mission');
  pass('AD-04 解锁后可进入并渲染');

  const ad03b = page.locator('[data-lesson-v2="AD-03"]');
  if ((await ad03b.count()) > 0) throw new Error('同一时刻不应同时打开两节课');
  pass('单课节容器互斥正常');

  const pending = results.filter((r) => !r.passed).length;
  writeFileSync(
    `${out}/deskpet-a3a4-checks.json`,
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: results.length - pending, failed: pending, errors }));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  await shot('failure').catch(() => {});
  writeFileSync(
    `${out}/deskpet-a3a4-checks.json`,
    JSON.stringify({ results, errors, error: String(error) }, null, 2),
  );
  console.error(String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
}
