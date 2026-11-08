import { chromium, expect } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const out = process.env.SPARKMATE_TEACHING_OUTPUT || 'test-results/teaching',
  url = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'reduce',
});
const errors = [],
  shaders = [],
  checks = [],
  isolation = [];
const oldKeys = [
  'sparkmate.routes.v2',
  ...[
    'street',
    'kickback',
    'resonance',
    'assembly',
    'trust',
    'envstory',
    'raid',
  ].map((n) => 'sparkmate.seventh-checksum.' + n + '.v1'),
];
const key = 'sparkmate.checksum.profile.v1';
function watch(p) {
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => {
    if (
      m.type() === 'error' &&
      /shader|WebGLProgram|GL_INVALID/i.test(m.text())
    )
      shaders.push(m.text());
  });
}
watch(page);
await page.addInitScript(() => {
  window.__teachingGL = 0;
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    if (/webgl/i.test(type)) window.__teachingGL++;
    return original.call(this, type, ...args);
  };
  performance.setResourceTimingBufferSize(10000);
});
const shot = (n) => page.screenshot({ path: out + '/' + n + '.png' });
const profile = () =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
const snapshot = (p) =>
  p.evaluate(
    (keys) => Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])),
    oldKeys,
  );
const pass = (name) => checks.push({ name, passed: true });
async function tab(name) {
  await page.getByRole('tab', { name, exact: true }).click();
}
async function lesson(id, shots = false) {
  const l = JSON.parse(
    readFileSync(
      new URL(
        '../src/features/learning/data/lessons/' + id + '.lesson.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  await tab('课节');
  if (
    await page
      .getByRole('button', { name: '返回课节列表', exact: true })
      .count()
  )
    await page
      .getByRole('button', { name: '返回课节列表', exact: true })
      .click();
  await page.locator('[data-start-lesson="' + id + '"]').click();
  const runner = page.locator('[data-lesson="' + id + '"]'),
    next = () => page.locator('[data-lesson-next]').click();
  await expect(runner).toHaveAttribute('data-segment', 'hook');
  await page
    .getByRole('radio', {
      name: l.segments[0].choices.find((o) => o.correct).text,
      exact: true,
    })
    .check();
  if (shots) await shot('03-k1-hook');
  await next();
  await next();
  for (let i = 0; i < l.segments[2].steps.length; i++)
    await page
      .getByLabel('实践步骤 ' + (i + 1), { exact: true })
      .selectOption(String(i));
  if (l.segments[2].code) {
    const o = l.segments[2].code.options.find((o) => o.correct);
    await page.getByRole('radio', { name: o.code, exact: true }).check();
  }
  await page.locator('[data-practice-submit]').click();
  if (shots) await shot('04-k1-practice');
  await next();
  for (const c of l.segments[3].checks) {
    if (
      typeof c.expected === 'number' ||
      (c.type === 'measurement' && typeof c.expected === 'string')
    ) {
      const mode =
        c.unit === 'Ω'
          ? 'resistance'
          : c.unit === 'V'
            ? 'voltage'
            : 'instrument';
      await page.getByLabel('万用表模式', { exact: true }).selectOption(mode);
      await page
        .getByLabel('万用表量程', { exact: true })
        .selectOption('200000');
      await page.locator('[data-probe="' + c.id + '"]').click();
      const display = await page
        .locator('[data-display="' + c.id + '"]')
        .innerText();
      expect(display).not.toContain('OL');
      await page
        .locator('[data-reading="' + c.id + '"]')
        .fill(String(c.expected));
    } else
      await page
        .getByLabel('判断 ' + c.id, { exact: true })
        .fill(
          Array.isArray(c.expected) ? c.expected.join(',') : String(c.expected),
        );
  }
  await page.locator('[data-meter-submit]').click();
  if (shots) await shot('05-k1-meter');
  await next();
  await page
    .getByRole('radio', {
      name: l.segments[4].options.find((o) => o.correct).text,
      exact: true,
    })
    .check();
  await next();
  await page
    .getByLabel('课节自评', { exact: true })
    .fill('我会先测量再判断，并在改线前断电。');
  await next();
  expect((await profile()).kps[id].status).toBe('mastered');
  pass(id + ' six segments, genuine input evidence and mastered');
}
let before, final;
try {
  await page.goto(url + '/?quality=0');
  await page.getByTestId('teaching-entry').click();
  await expect(page.locator('[data-teaching-panel]')).toBeVisible();
  before = await snapshot(page);
  await shot('01-panel');
  await tab('星图');
  await expect(page.locator('[data-star]')).toHaveCount(40);
  await shot('02-initial-stars');
  // No progress fixture: satisfy graph prerequisites through the real runner.
  await lesson('K0-01');
  await lesson('K0-02');
  await lesson('K0-04');
  await lesson('K1-01', true);
  await tab('星图');
  await expect(page.locator('[data-star="K1-01"]')).toHaveAttribute(
    'data-state',
    'mastered',
  );
  await page.locator('[data-star="K1-01"]').click();
  await shot('06-mastered-stars');
  const saved = await profile();
  await page.reload();
  await page.getByTestId('teaching-entry').click();
  expect(await profile()).toEqual(saved);
  await tab('星图');
  await page.locator('[data-star="K1-01"]').click();
  await shot('07-reload');
  await lesson('K1-04');
  await shot('08-k104');
  for (const width of [370, 390]) {
    await page.getByRole('button', { name: '关闭弹窗', exact: true }).click();
    await page.setViewportSize({ width, height: 844 });
    await page.getByTestId('teaching-entry').click();
    await tab('星图');
    await page.locator('[data-star="K1-01"]').click();
    expect(
      await page
        .locator('.teaching-modal')
        .evaluate((el) => el.getBoundingClientRect().right <= innerWidth),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('teaching-entry')).toBeFocused();
    await page.getByTestId('teaching-entry').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-teaching-panel]')).toBeVisible();
  }
  pass(
    '370/390 responsive pointer access and keyboard entry, Escape focus restore',
  );
  await tab('档案');
  await page.getByRole('button', { name: '重置本档案', exact: true }).click();
  await page.getByRole('button', { name: '保留档案', exact: true }).click();
  final = await profile();
  expect(await snapshot(page)).toEqual(before);
  pass(
    'all eight explicitly listed legacy keys byte unchanged, reset cancellation preserves profile',
  );
  expect(await page.evaluate(() => window.__teachingGL)).toBe(0);
  expect(await page.locator('canvas').count()).toBe(0);
  pass('Tier0 no Canvas or WebGL context');
  for (const tier of [1, 2]) {
    const p = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'reduce',
    });
    watch(p);
    await p.goto(url + '/?quality=' + tier);
    await p.getByTestId('teaching-entry').waitFor();
    await p.waitForTimeout(2000);
    const baseline = await p.evaluate(() => ({
      canvas: document.querySelectorAll('canvas').length,
      resources: performance.getEntriesByType('resource').map((r) => r.name),
    }));
    const old = await snapshot(p);
    await p.getByTestId('teaching-entry').click();
    await expect(p.locator('[data-teaching-panel]')).toBeVisible();
    const after = await p.evaluate(() => ({
      canvas: document.querySelectorAll('canvas').length,
      resources: performance.getEntriesByType('resource').map((r) => r.name),
    }));
    const added = after.resources.filter(
      (r) => !baseline.resources.includes(r),
    );
    expect(
      added.filter((r) =>
        /\.glb|\.gltf|\.ktx|\.hdr|\.mp4|three|rapier|postprocessing/i.test(r),
      ),
    ).toEqual([]);
    expect(after.canvas).toBe(baseline.canvas);
    expect(await snapshot(p)).toEqual(old);
    isolation.push({
      tier,
      baselineCanvas: baseline.canvas,
      afterCanvas: after.canvas,
      added,
    });
    await p.close();
  }
  pass('Tier1/2 teaching adds no renderer, assets or legacy writes');
  const world = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  watch(world);
  await world.goto(url + '/?quality=3&world=p9');
  await world
    .getByRole('button', { name: '开始自由探索', exact: true })
    .click({ timeout: 60000 });
  await world.locator('#exploration-input').waitFor();
  await world.waitForTimeout(1500);
  for (const width of [370, 390]) {
    await world.setViewportSize({ width, height: 844 });
    const rect = await world.getByTestId('teaching-entry').boundingBox();
    expect(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width).toBe(
      true,
    );
    await world.getByTestId('teaching-entry').click();
    await expect(world.locator('[data-teaching-panel]')).toBeVisible();
    await world.getByRole('tab', { name: '星图', exact: true }).click();
    await world.locator('[data-star="K0-01"]').click();
    await expect(
      world.getByRole('button', { name: '开始课节', exact: true }),
    ).toBeEnabled();
    await world.getByRole('button', { name: '关闭弹窗', exact: true }).click();
  }
  await world.close();
  pass(
    'Tier3 exploring: 370/390 Portal entry and modal clicks clear existing HUD/minimap',
  );
  expect(errors).toEqual([]);
  expect(shaders).toEqual([]);
  pass('zero page and shader errors');
} catch (e) {
  checks.push({ name: e.stack, passed: false });
  process.exitCode = 1;
} finally {
  writeFileSync(
    out + '/teaching-checks.json',
    JSON.stringify(
      {
        checks,
        errors,
        shaders,
        isolation,
        before,
        after: await snapshot(page),
        profile: final || (await profile()),
        url,
      },
      null,
      2,
    ),
    'utf8',
  );
  const artifacts = {};
  for (const name of readdirSync(out).filter(
    (n) => /\.(png|json)$/.test(n) && n !== 'sha256-manifest.json',
  ))
    artifacts[name] = createHash('sha256')
      .update(readFileSync(out + '/' + name))
      .digest('hex');
  writeFileSync(
    out + '/sha256-manifest.json',
    JSON.stringify(artifacts, null, 2),
    'utf8',
  );
  await browser.close();
  console.log(JSON.stringify({ checks, errors, shaders, out }, null, 2));
}
