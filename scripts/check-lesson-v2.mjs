import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = process.env.SPARKMATE_V2_OUTPUT || 'test-results/lesson-v2';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
const shaders = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const text = m.text();
  // 既有的 liquid-glass SVG 属性告警，与本功能无关
  if (/Invalid DOM property|lighting-color/.test(text)) return;
  errors.push(text);
});
const results = [];
const pass = (name) => results.push({ name, passed: true });
const shot = (name) =>
  page.screenshot({ path: `${out}/${name}.png`, fullPage: false });

try {
  await page.goto(base + '/?quality=0&world=p9', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('teaching-entry').waitFor({ state: 'visible', timeout: 45000 });
  await page.getByTestId('teaching-entry').click();

  // 以真实数据接口种下一份合法档案：K0-02 已掌握，解锁 K1-01
  await page.evaluate(async () => {
    const learning = await import('/src/features/learning/learning.mjs');
    const graph = (await import('/src/features/learning/data/knowledge-graph.v1.json'))
      .default;
    let p = learning.freshProfile(graph);
    for (const id of ['K0-01', 'K0-02']) {
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
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByTestId('teaching-entry').waitFor({ state: 'visible', timeout: 45000 });
  await page.getByTestId('teaching-entry').click();

  await page.locator('[data-start-lesson-v2="K1-01"]').click();
  await page.locator('[data-lesson-v2="K1-01"]').waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${out}/01-mission.png` });
  pass('V2 入口：K1-01 重制版可进入');

  const next = () => page.locator('[data-v2-next]').click();
  const chooseRadio = (name) =>
    page.getByRole('radio', { name, exact: true }).check();

  // mission -> observe
  await next();
  await page.waitForTimeout(300);
  await chooseRadio('处处相等');
  await page.screenshot({ path: `${out}/02-observe.png` });
  await next();

  // learn
  await chooseRadio('变大');
  await page.screenshot({ path: `${out}/03-learn.png` });
  await next();

  // do -> 真实接线与测量
  for (const label of ['电源', '220Ω', 'LED', '回流']) {
    await page.getByRole('button', { name: label, exact: true }).click();
  }
  await page.getByRole('button', { name: '校验接线', exact: true }).click();
  for (const point of ['resistor', 'led', 'supply', 'current']) {
    await page.getByLabel('测点', { exact: true }).selectOption(point);
    await page.getByRole('button', { name: '测量', exact: true }).click();
  }
  await page.screenshot({ path: `${out}/04-do.png` });
  await next();

  // prove
  const modeSelect = page.getByLabel('万用表模式', { exact: true });
  await modeSelect.selectOption('voltage');
  await page.getByLabel('万用表量程', { exact: true }).selectOption('200');
  for (const c of [
    { id: 'v-resistor', v: '3.1' },
    { id: 'v-led', v: '1.9' },
  ]) {
    await page.locator(`[data-probe="${c.id}"]`).click();
    await page.locator(`[data-reading="${c.id}"]`).fill(c.v);
  }
  await modeSelect.selectOption('instrument');
  await page.locator('[data-probe="i-loop"]').click();
  await page.locator('[data-reading="i-loop"]').fill('14');
  await page.locator('[data-meter-submit]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/05-prove.png` });
  await next();

  // transfer
  await chooseRadio('变小');
  await page.screenshot({ path: `${out}/06-transfer.png` });
  await next();

  // recap + submit
  await page.locator('[data-v2-submit]').click();
  await page.locator('[data-v2-complete="true"]').waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${out}/07-complete.png` });
  pass('V2 七段流程与完成页');

  const profile = await page.evaluate(async () => {
    const learning = await import('/src/features/learning/learning.mjs');
    return JSON.parse(localStorage.getItem(learning.PROFILE_KEY));
  });
  const kp = profile.kps['K1-01'];
  if (kp.status !== 'mastered') throw new Error('K1-01 not mastered: ' + kp.status);
  if (kp.evidence.length < 3) throw new Error('evidence too few: ' + kp.evidence.length);
  pass('V2 完成写入档案：mastered 且证据 ≥3 条');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByTestId('teaching-entry').waitFor({ state: 'visible', timeout: 45000 });
  await page.getByTestId('teaching-entry').click();
  const persisted = await page.evaluate(async () => {
    const learning = await import('/src/features/learning/learning.mjs');
    return JSON.parse(localStorage.getItem(learning.PROFILE_KEY)).kps['K1-01'].status;
  });
  if (persisted !== 'mastered') throw new Error('not persisted: ' + persisted);
  pass('V2 刷新后档案保留');

  const pending = results.filter((r) => !r.passed).length;
  writeFileSync(`${out}/lesson-v2-checks.json`, JSON.stringify({ results, errors, shaders }, null, 2));
  console.log(JSON.stringify({ passed: results.length - pending, failed: pending, errors, shaders }));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  await shot('failure').catch(() => {});
  writeFileSync(`${out}/lesson-v2-checks.json`, JSON.stringify({ results, errors, shaders }, null, 2));
  console.error(String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
}
