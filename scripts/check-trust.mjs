import { chromium, expect } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const out = process.env.SPARKMATE_TRUST_OUTPUT || 'test-results/trust-m4';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }),
  checks = [],
  errors = [],
  shaders = [];
page.setDefaultTimeout(20000);
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && /shader|WebGLProgram|GL_INVALID/i.test(m.text()))
    shaders.push(m.text());
});
const shot = (n) => {
    console.log(n);
    return page.screenshot({ path: out + '/' + n + '.png' });
  },
  panel = page.locator('[data-trust-panel]');
const keys = [
  'sparkmate.routes.v2',
  ...['street', 'kickback', 'assembly'].map((s) => 'sparkmate.seventh-checksum.' + s + '.v1'),
];
const snapshot = () =>
  page.evaluate((keys) => Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])), keys);
const saved = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('sparkmate.seventh-checksum.trust.v1')));
const resonance = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('sparkmate.seventh-checksum.resonance.v1')));
async function scene() {
  return page.evaluate(async () => {
    const entry = performance
      .getEntriesByType('resource')
      .find((e) => e.name.includes('/@react-three_fiber.js'));
    if (!entry) return {};
    const { _roots } = await import(entry.name),
      root = _roots.get(document.querySelector('.scene-stage canvas'));
    return root ? { ...root.store.getState().camera.userData } : {};
  });
}
async function walk(key, predicate) {
  await page.locator('#exploration-input').focus();
  await page.keyboard.down(key);
  try {
    await expect
      .poll(async () => predicate(await scene()), { timeout: 25000, intervals: [100] })
      .toBe(true);
  } finally {
    await page.keyboard.up(key);
  }
}
async function enter() {
  await page.getByRole('button', { name: '开始自由探索', exact: true }).click({ timeout: 60000 });
  await expect
    .poll(async () => (await scene()).cameraOwner, { timeout: 60000 })
    .toBe('p9-character');
  await walk('KeyS', (s) => s.player.z < 0.15);
  await page.mouse.move(1300, 650);
  await page.mouse.down();
  await page.mouse.move(776.4, 650, { steps: 18 });
  await page.mouse.up();
  await walk('KeyW', (s) => s.player.x > 10.3);
  if (await page.getByTestId('kickback-lesson').isVisible()) {
    await page.getByTestId('kickback-lesson-answer').selectOption('release');
    await expect(page.getByTestId('kickback-lesson-submit')).toBeEnabled({ timeout: 45000 });
    await page.getByTestId('kickback-lesson-submit').click();
    await page.getByTestId('kickback-close').click();
  }
  await walk('KeyW', (s) => s.player.x > 11);
  await expect(page.locator('[data-hefi-talk]')).toBeVisible();
  await page.locator('[data-hefi-talk]').click();
  await expect(panel).toBeVisible();
}
const click = (name) => panel.getByRole('button', { name, exact: true }).click();
const act = (i) => panel.locator('[data-trust-act="' + i + '"]').click();
const finish = () => panel.locator('[data-trust-complete]').click();
let before, after, archive, resBefore, resAfter;
try {
  await page.goto('http://127.0.0.1:15262/?quality=3&world=p9');
  await enter();
  await page.waitForTimeout(300);
  before = await snapshot();
  resBefore = await resonance();
  await shot('01-hefi-greet');
  const pos = (await scene()).player;
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyW');
  const pos2 = (await scene()).player;
  expect(Math.hypot(pos.x - pos2.x, pos.z - pos2.z)).toBeLessThan(0.02);
  await click('交谈');
  await panel.locator('[data-trust-debug]').click();
  await panel.locator('[data-trust-debug]').click();
  await act(1);
  await click('通断 / 电阻测量');
  await expect(panel.locator('[data-forge-meter]')).toContainText('仍有电压');
  await click('断电');
  await click('通断 / 电阻测量');
  await expect(panel.locator('[data-forge-meter]')).toContainText('∞Ω');
  await shot('02-furnace-measure');
  await click('检查端子');
  await click('替换端子');
  const started = Date.now();
  await click('通电观察');
  await expect(panel.getByRole('button', { name: '先修端子', exact: true })).toBeEnabled({
    timeout: 15000,
  });
  expect(Date.now() - started).toBeGreaterThanOrEqual(6900);
  await click('先修端子');
  await finish();
  await shot('03-furnace-pass');
  await page.waitForTimeout(300);
  expect((await saved()).invites.act1_repair_furnace.result.inBand).toBeGreaterThanOrEqual(3);
  checks.push('第一幕断电测量、诊断修复、真实7秒与带内3秒');
  archive = await saved();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await page.reload();
  expect(await saved()).toEqual(archive);
  await enter();
  await expect(panel.locator('[data-trust-quote]')).toContainText('先修端子');
  await shot('04-restored-choice');
  checks.push('刷新恢复、选择原话引用、Esc与模态冻结输入');
  await act(2);
  await click('铜屑堆 · 通断测量');
  await click('取回这组线与焊枪');
  await expect(panel.locator('[data-trust-complete]')).toBeDisabled();
  await click('铁框堆 · 通断测量');
  await panel.getByRole('button', { name: '取回这组线与焊枪', exact: true }).nth(1).click();
  await click('把焊枪还给你');
  await finish();
  await shot('05-scrap-torch');
  checks.push('第二幕线长与电阻筛选、错误可重试');
  // Development-only real button reaches the next level; no store injection.
  if ((await saved()).trustPoints < 8) await panel.locator('[data-trust-debug]').click();
  await act(3);
  await click('连接灯座');
  await expect(panel.getByRole('button', { name: '点亮', exact: true })).toBeDisabled();
  await click('断开24V支路');
  await panel.getByLabel('支路电压', { exact: true }).selectOption('48');
  await click('连接灯座');
  await expect(panel.getByRole('button', { name: '点亮', exact: true })).toBeDisabled();
  await panel.getByLabel('支路电压', { exact: true }).selectOption('24');
  await click('连接灯座');
  await shot('06-grave-safe-branch');
  await click('点亮');
  await finish();
  await expect(panel.locator('[data-trust-chip]')).toContainText('微光');
  await shot('07-chip-unlocked');
  await page.waitForTimeout(300);
  archive = await saved();
  expect(archive.chipUnlocked).toBe(true);
  expect(archive.version).toBe(1);
  expect(archive.trustPoints).toBe(8);
  expect(archive.choices).toHaveLength(3);
  expect(
    await page.evaluate(() => localStorage.getItem('sparkmate.seventh-checksum.trust.prisms')),
  ).toBe('3');
  checks.push('第三幕断电与24V联锁、三幕独立棱镜与芯片解锁');
  after = await snapshot();
  expect(after).toEqual(before);
  resAfter = await resonance();
  expect(resAfter.version).toBe(resBefore.version);
  expect(resAfter.schemaVersion).toBe(resBefore.schemaVersion);
  expect(
    resAfter.sync !== resBefore.sync ||
      JSON.stringify(resAfter.syncLog) !== JSON.stringify(resBefore.syncLog),
  ).toBe(true);
  expect(resAfter.syncLog.some((e) => JSON.stringify(e).includes('trust:'))).toBe(true);
  checks.push('四键字节不变、XP不增、共鸣仅bridge事件联动');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.keyboard.press('Escape');
  await page.reload();
  expect(await saved()).toEqual(archive);
  checks.push('390px无横溢、最终刷新不重奖');
  for (const tier of [0, 1]) {
    await page.goto('http://127.0.0.1:15262/?quality=' + tier + '&world=p9');
    await page.waitForTimeout(1000);
    expect(await page.locator('[data-hefi-talk],[data-trust-panel]').count()).toBe(0);
    expect(
      await page.evaluate(() =>
        performance.getEntriesByType('resource').some((e) => /\/features\/trust\//.test(e.name)),
      ),
    ).toBe(false);
  }
  checks.push('Tier0/1不加载信任模块与入口');
  expect(errors).toEqual([]);
  expect(shaders).toEqual([]);
  writeFileSync(
    out + '/trust-checks.json',
    JSON.stringify(
      { passed: true, checks, before, after, resBefore, resAfter, archive, errors, shaders },
      null,
      2,
    ),
    'utf8',
  );
} catch (e) {
  await shot('failure');
  writeFileSync(
    out + '/trust-checks.json',
    JSON.stringify(
      { passed: false, checks, error: String(e), before, after, errors, shaders },
      null,
      2,
    ),
    'utf8',
  );
  throw e;
} finally {
  await browser.close();
  const paths = [
    ...readdirSync(out)
      .filter((f) => f !== 'validation-summary.json')
      .map((f) => out + '/' + f),
    ...readdirSync('src/features/trust').map((f) => 'src/features/trust/' + f),
    'tests/trust.unit.mjs',
    'scripts/check-trust.mjs',
  ];
  writeFileSync(
    out + '/validation-summary.json',
    JSON.stringify(
      {
        checks,
        errors,
        shaders,
        sha256: Object.fromEntries(
          paths.map((p) => [p, createHash('sha256').update(readFileSync(p)).digest('hex')]),
        ),
      },
      null,
      2,
    ),
    'utf8',
  );
}
console.log(JSON.stringify({ passed: true, checks, errors, shaders }));
