import { chromium, expect } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const out =
  process.env.SPARKMATE_RAID_OUTPUT || 'D:/deepseek_file/work/codex-runs/m6b-evidence/raid';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.setDefaultTimeout(30000);
const errors = [],
  shaders = [],
  checks = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && /shader|WebGLProgram|GL_INVALID/i.test(m.text()))
    shaders.push(m.text());
});
await page.addInitScript(() => performance.setResourceTimingBufferSize(10000));
const panel = page.locator('[data-raid-panel]');
const shot = (name) => page.screenshot({ path: out + '/' + name + '.png' });
const keys = [
  'sparkmate.routes.v2',
  ...['street', 'kickback', 'resonance', 'assembly', 'trust', 'envstory'].map(
    (k) => 'sparkmate.seventh-checksum.' + k + '.v1',
  ),
];
const snapshot = () =>
  page.evaluate((keys) => Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])), keys);
const saved = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('sparkmate.seventh-checksum.raid.v1')));
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
      lesson: !!document.querySelector('[data-testid=kickback-lesson]'),
      envRemembered: Array.from(
        { length: 7 },
        (_, i) => live.scene.getObjectByName('p10-env-L' + (i + 2))?.children[4]?.visible,
      ).filter(Boolean).length,
    };
  });
}
async function walk(key, predicate) {
  await page.locator('#exploration-input').focus();
  console.log('walk', key, (await scene()).player);
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
  await walk('KeyW', (s) => s.player.x > 13 || s.lesson);
  if (await page.getByTestId('kickback-lesson').isVisible()) {
    await page.getByTestId('kickback-lesson-answer').selectOption('release');
    await expect(page.getByTestId('kickback-lesson-submit')).toBeEnabled({ timeout: 65000 });
    await page.getByTestId('kickback-lesson-submit').click();
    await page.getByTestId('kickback-close').click();
  }
  await walk('KeyW', (s) => s.player.x > 14);
  await walk('KeyA', (s) => s.player.z < -2.5);
  await walk('KeyW', (s) => s.player.x > 17.4);
  await walk('KeyD', (s) => s.player.z > -0.55);
  await walk('KeyW', (s) => s.player.x > 19.6);
  await expect(page.locator('[data-raid-enter]')).toBeVisible();
}
async function go(x, z) {
  let a = await scene();
  if (a.player.z > z + 0.15) await walk('KeyA', (s) => s.player.z <= z + 0.1);
  else if (a.player.z < z - 0.15) await walk('KeyD', (s) => s.player.z >= z - 0.1);
  a = await scene();
  if (a.player.x > x + 0.15) await walk('KeyS', (s) => s.player.x <= x + 0.1);
  else if (a.player.x < x - 0.15) await walk('KeyW', (s) => s.player.x >= x - 0.1);
}
const click = (sel) => panel.locator(sel).click();
async function room(index, mod) {
  await go(25 + 7 * index, -3);
  if (index === 2) {
    await click('[data-raid-power]');
    await panel.locator('[data-raid-mode]').selectOption('continuity');
  }
  if ((await panel.locator('[data-raid-eye]').getAttribute('aria-pressed')) !== 'true')
    await click('[data-raid-eye]');
  for (let i = 0; i < 3; i++) {
    await click('[data-raid-probe="' + i + '"]');
    let text = await panel.locator('[data-raid-reading]').textContent();
    if (
      (index < 2 && parseFloat(text) > 20) ||
      (index === 2 && text !== 'OL' && parseFloat(text) < 2)
    ) {
      await click('[data-raid-solve]');
      break;
    }
  }
  await expect(panel.locator('[data-raid-loot]')).toBeVisible();
  if (!checks.length)
    await shot(index === 0 ? '02-room1-measure' : index === 1 ? '04-room2' : '05-room3');
  await click('[data-raid-mod="' + mod + '"]');
  if (index === 0 && !checks.length) await shot('03-module-choice');
}
let before, after, archive;
try {
  await page.goto('http://127.0.0.1:15262/?quality=3&world=p9');
  await enter();
  before = await snapshot();
  await page.locator('[data-raid-enter]').click();
  await shot('01-entry');
  await go(23, 0);
  expect((await scene()).player.y).toBeGreaterThan(0.5);
  await go(23, -3);
  await page.keyboard.down('ControlLeft');
  await room(0, 'shield');
  await page.keyboard.up('ControlLeft');
  await room(1, 'fuse');
  await room(2, 'mute');
  await go(41, -1);
  await go(41, 3);
  await click('[data-raid-rebuild]');
  await click('[data-raid-rebuild]');
  await expect(panel.locator('[data-raid-rebuild]')).toBeDisabled();
  const quiz = await panel.textContent();
  const answer = quiz.includes('工作线程')
    ? 'watchdog'
    : quiz.includes('高频抖动')
      ? 'average'
      : 'backoff';
  await click('[data-raid-code="' + answer + '"]');
  await expect(panel.locator('[data-raid-code-result]')).toContainText('正确');
  await click('[data-raid-skill]');
  await expect(panel.locator('[data-raid-skill]')).toBeDisabled();
  await shot('06-checkpoint');
  await click('[data-raid-depart]');
  await go(41, -3);
  await go(23, -3);
  await go(23, 0);
  await go(20, 0);
  await expect(panel.locator('[data-raid-skill]')).toBeEnabled({ timeout: 35000 });
  await click('[data-raid-skill]');
  await expect(panel.locator('[data-raid-skill]')).toBeDisabled();
  await click('[data-raid-extract]');
  await expect(panel).toHaveAttribute('data-raid-state', 'extracted');
  await shot('07-extracted');
  archive = await saved();
  expect(archive.meta.extracted).toBe(1);
  expect(archive.history[0].measurements.length).toBeGreaterThanOrEqual(3);
  expect(archive.rewards).toEqual({ xp: 100, prisms: 1 });
  checks.push(
    'walkable seam, three measured rooms, loot, two rebuilds, code correct, skill cooldown, extraction',
  );
  await click('[data-raid-restart]');
  await page.locator('[data-raid-enter]').click();
  await go(23, 0);
  await go(23, -3);
  await room(0, 'shield');
  await go(32, -3);
  if ((await panel.locator('[data-raid-eye]').getAttribute('aria-pressed')) !== 'true')
    await click('[data-raid-eye]');
  let wrong = 0;
  await click('[data-raid-probe="0"]');
  if (parseFloat(await panel.locator('[data-raid-reading]').textContent()) > 20) wrong = 1;
  for (let i = 0; i < 10 && (await panel.getAttribute('data-raid-state')) !== 'failed'; i++) {
    if (Number(await panel.locator('[data-raid-focus]').textContent()) < 12) {
      await click('[data-raid-eye]');
      await expect
        .poll(async () => Number(await panel.locator('[data-raid-focus]').textContent()), {
          timeout: 15000,
        })
        .toBeGreaterThanOrEqual(24);
      await click('[data-raid-eye]');
    }
    await click('[data-raid-probe="' + wrong + '"]');
    await click('[data-raid-solve]');
  }
  await expect(panel).toHaveAttribute('data-raid-state', 'failed', { timeout: 30000 });
  await shot('08-alarm-failed');
  archive = await saved();
  expect(archive.history[1].reason).toBe('alarm');
  expect(archive.history[1].kept).toBe(3);
  checks.push('alarm100 failure retains floor(10*0.3)');
  await page.setViewportSize({ width: 390, height: 844 });
  await shot('09-390px');
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await expect(panel.locator('[data-raid-close]')).toBeInViewport();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.reload();
  await enter();
  await page.locator('[data-raid-enter]').click();
  await go(23,0);await go(24,6);await go(30,6);
  await expect.poll(async()=>Number((await panel.locator('.raid-bars label').first().textContent()).replace(/[^0-9.]/g,'')),{timeout:15000,intervals:[100]}).toBeGreaterThan(0);
  checks.push('physical patrol exposure observed before refresh');
  await page.reload();
  archive = await saved();
  expect(archive.history[2].reason).toBe('abandoned');
  expect(archive.meta.runs).toBe(3);
  expect(archive.rewards).toEqual({ xp: 100, prisms: 1 });
  await shot('10-refresh-abandoned');
  after = await snapshot();
  expect(after).toEqual(before);
  checks.push('refresh abandon no duplicate reward; seven legacy keys byte identical; 390px');
  for (const tier of [0, 1, 2]) {
    await page.goto('http://127.0.0.1:15262/?quality=' + tier + '&world=p9');
    await page.waitForTimeout(1500);
    expect(await page.locator('[data-raid-enter],[data-raid-panel]').count()).toBe(0);
    expect(
      await page.evaluate(() =>
        performance.getEntriesByType('resource').some((e) => /\/features\/raid\//.test(e.name)),
      ),
    ).toBe(false);
  }
  checks.push('Tier0/1/2 raid resources absent');
  expect(errors).toEqual([]);
  expect(shaders).toEqual([]);
  const paths = [
    ...readdirSync(out)
      .filter((f) => f.endsWith('.png'))
      .map((f) => out + '/' + f),
    ...readdirSync('src/features/raid').map((f) => 'src/features/raid/' + f),
    'scripts/check-raid.mjs',
  ];
  const sha256 = Object.fromEntries(
    paths.map((p) => [p, createHash('sha256').update(readFileSync(p)).digest('hex')]),
  );
  writeFileSync(
    out + '/raid-checks.json',
    JSON.stringify({ passed: true, checks, archive, errors, shaders, sha256 }, null, 2),
    'utf8',
  );
  writeFileSync(
    out + '/legacy-keys.json',
    JSON.stringify({ before, after, unchanged: true }, null, 2),
    'utf8',
  );
  console.log(JSON.stringify({ passed: true, checks, screenshots: 10, errors, shaders }));
} catch (e) {
  console.log('FAILED SCENE', await scene());
  await shot('failure');
  writeFileSync(
    out + '/raid-checks.json',
    JSON.stringify({ passed: false, error: String(e), checks, errors, shaders }, null, 2),
    'utf8',
  );
  throw e;
} finally {
  await browser.close();
}
