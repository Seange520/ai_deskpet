import { chromium, expect } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const out = process.env.SPARKMATE_ENV_OUTPUT || 'test-results/envstory-m5';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [],
  shaders = [],
  checks = [],
  bridge = [];
page.setDefaultTimeout(20000);
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && /shader|WebGLProgram|GL_INVALID/i.test(m.text()))
    shaders.push(m.text());
});
await page.addInitScript(() => {
  performance.setResourceTimingBufferSize(10000);
  window.envEvents = [];
  window.addEventListener('sparkmate:sync-event', (e) => window.envEvents.push(e.detail));
});
const panel = page.locator('[data-env-panel]');
const shot = (name) => page.screenshot({ path: out + '/' + name + '.png' });
const keys = [
  'sparkmate.routes.v2',
  ...['street', 'kickback', 'resonance', 'assembly', 'trust'].map(
    (k) => 'sparkmate.seventh-checksum.' + k + '.v1',
  ),
  'sparkmate.seventh-checksum.trust.prisms',
];
const snapshot = () =>
  page.evaluate((keys) => Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])), keys);
const saved = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('sparkmate.seventh-checksum.envstory.v1')));
async function scene() {
  return page.evaluate(async () => {
    const entry = performance
      .getEntriesByType('resource')
      .find((e) => e.name.includes('/@react-three_fiber.js'));
    if (!entry) return {};
    const { _roots } = await import(entry.name),
      root = _roots.get(document.querySelector('.scene-stage canvas'));
    if (!root) return {};
    const live = root.store.getState();
    return {
      ...live.camera.userData,
      envRemembered: Array.from(
        { length: 7 },
        (_, i) => live.scene.getObjectByName('p10-env-L' + (i + 2))?.children[4]?.visible,
      ).filter(Boolean).length,
    };
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
  await walk('KeyW', (s) => s.player.x > 7.2);
  await expect(page.locator('[data-env-notebook]')).toBeVisible();
  await page.keyboard.press('KeyN');
  await expect(panel).toBeVisible();
}
const click = (selector) => panel.locator(selector).click();
const mode = (value) => panel.locator('[data-env-mode]').selectOption(value);
let before, after, archive;
try {
  await page.goto('http://127.0.0.1:15262/?quality=3&world=p9');
  await enter();
  await page.waitForTimeout(400);
  before = await snapshot();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await shot('01-street-notebook');
  await page.keyboard.press('KeyN');
  await expect(panel).toBeVisible();
  await click('[data-env-close-case]');
  await expect(panel.locator('[data-env-status]')).toContainText('证据还不足以结案');
  await shot('02-insufficient-evidence');
  let pinIndex = 0;
  for (const id of [
    'clue_lamp_flicker',
    'clue_pump_dip',
    'clue_cat_alley',
    'clue_clock_drift',
    'clue_flower_half',
  ]) {
    await click('[data-env-measure-clue="' + id + '"]');
    await click('[data-env-pin="' + id + '"]');
    await panel.locator('[data-env-map]').click({
      position: { x: 65 + pinIndex++ * 100, y: 75 + (pinIndex % 2) * 45 },
    });
  }
  for (const h of ['h1', 'h2']) await click('[data-env-hypothesis="' + h + '"]');
  await click('[data-env-npc="hefi"]');
  await click('[data-env-npc="vendor"]');
  await click('[data-env-npc="inspector"]');
  await shot('03-five-measured-clues');
  await click('[data-env-socket="L8"]');
  await click('[data-env-wire]');
  await expect(panel.locator('[data-env-status]')).toContainText('联锁');
  await click('[data-env-isolate]');
  await mode('continuity');
  for (let i = 2; i <= 8; i++) await click('[data-env-ground="L' + i + '"]');
  await mode('resistance');
  await click('[data-env-chain="L2"]');
  await click('[data-env-chain="L8"]');
  await click('[data-env-inspect]');
  await click('[data-env-validate]');
  await expect(panel.locator('[data-env-missing]')).toHaveText('证据类别已齐全');
  await click('[data-env-eye]');
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect.poll(async () => (await scene()).envRemembered).toBe(7);
  await page.keyboard.press('KeyN');
  await expect(panel).toBeVisible();
  await shot('04-four-evidence-categories');
  await click('[data-env-wire]');
  await click('[data-env-power]');
  await expect(panel.locator('[data-env-status]')).toContainText('离线通断复核');
  await mode('continuity');
  await click('[data-env-ground="L8"]');
  await shot('05-independent-ground-recheck');
  await click('[data-env-power]');
  await mode('voltage');
  for (let i = 2; i <= 8; i++) await click('[data-env-socket="L' + i + '"]');
  const started = Date.now();
  await shot('06-loaded-observation');
  await expect(panel.locator('[data-env-seconds]')).toHaveText('10.0 / 10秒', { timeout: 20000 });
  expect(Date.now() - started).toBeGreaterThan(9000);
  await click('[data-env-close-case]');
  await expect(panel.locator('[data-env-closed]')).toContainText('我就说嘛，灯不会杀人，人会。');
  await panel.locator('[data-env-closed]').scrollIntoViewIfNeeded();
  await shot('07-case-closed');
  await page.waitForTimeout(300);
  archive = await saved();
  after = await snapshot();
  expect(after).toEqual(before);
  expect(archive.rewards).toEqual({ xp: 100, prisms: 1, granted: true });
  expect(Object.keys(archive.clues)).toHaveLength(5);
  expect(archive.case.evidence).toHaveLength(4);
  expect(archive.board.pins).toHaveLength(5);
  bridge.push(...(await page.evaluate(() => window.envEvents)));
  expect(bridge.some((e) => e.kind === 'correctRepair')).toBe(true);
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await page.reload();
  expect(await saved()).toEqual(archive);
  await enter();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await panel.locator('[data-env-closed]').scrollIntoViewIfNeeded();
  await shot('08-restored-390px');
  await click('[data-env-close-case]');
  await page.waitForTimeout(200);
  expect((await saved()).rewards).toEqual(archive.rewards);
  checks.push(
    '真实键鼠到街区与N开板',
    '五条现象测量与SVG pin、两条假设',
    '缺证结案失败',
    '逐盏通断、链阻、负载压降、断电拆检',
    '带电接线和未复核送电联锁',
    '七灯≤0.3V与真实10秒',
    '刷新幂等、七旧键字节不变与只读bridge',
    '390px无横溢',
  );
  for (const tier of [0, 1]) {
    await page.goto('http://127.0.0.1:15262/?quality=' + tier + '&world=p9');
    await page.waitForTimeout(1500);
    expect(await page.locator('[data-env-panel],[data-env-notebook]').count()).toBe(0);
    expect(
      await page.evaluate(() =>
        performance.getEntriesByType('resource').some((e) => /\/features\/env\//.test(e.name)),
      ),
    ).toBe(false);
  }
  checks.push('Tier0/1不加载envstory');
  expect(errors).toEqual([]);
  expect(shaders).toEqual([]);
  const paths = [
    ...readdirSync(out)
      .filter((f) => f.endsWith('.png'))
      .map((f) => out + '/' + f),
    ...readdirSync('src/features/env').map((f) => 'src/features/env/' + f),
    'scripts/check-envstory.mjs',
    'tests/envstory.unit.mjs',
  ];
  const sha256 = Object.fromEntries(
    paths.map((p) => [p, createHash('sha256').update(readFileSync(p)).digest('hex')]),
  );
  writeFileSync(
    out + '/envstory-checks.json',
    JSON.stringify(
      { passed: true, checks, before, after, archive, bridge, errors, shaders, sha256 },
      null,
      2,
    ),
    'utf8',
  );
  console.log(JSON.stringify({ passed: true, checks, errors, shaders }));
} catch (e) {
  await shot('failure');
  writeFileSync(
    out + '/envstory-checks.json',
    JSON.stringify(
      { passed: false, error: String(e), checks, before, after, errors, shaders },
      null,
      2,
    ),
    'utf8',
  );
  throw e;
} finally {
  await browser.close();
}
