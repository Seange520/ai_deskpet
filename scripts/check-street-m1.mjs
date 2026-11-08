import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.env.SPARKMATE_M1_STREET_OUTPUT || 'test-results/street-m1';
const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
});
const errors = [],
  shaders = [],
  results = [],
  frames = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && /shader|WebGLProgram|GL_INVALID/i.test(m.text()))
    shaders.push(m.text());
});
await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
const ui = (id) => page.getByTestId('kickback-' + id);
const telemetry = () => ui('telemetry');
// evaluate is read-only observation here: no Store actions, injected progress,
// clock fast-forward, camera mutation or simulated DOM interaction.
async function scene() {
  return page.evaluate(async () => {
    const entry = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    if (!entry) return {};
    const { _roots } = await import(entry.name),
      root = _roots.get(document.querySelector('.scene-stage canvas'));
    if (!root) return {};
    const r = root.store.getState();
    return {
      ...r.camera.userData,
      canvasCount: document.querySelectorAll('.scene-stage canvas').length,
      branch: !!r.scene.getObjectByName('p10-kickback-branch'),
      feedback: {
        screen: r.scene
          .getObjectByName('kickback-controller-screen')
          ?.material.color.getHexString(),
        streetLamp: r.scene.getObjectByName('kickback-street-lamp')?.material.emissiveIntensity,
        contact: r.scene.getObjectByName('kickback-relay-contact')?.rotation.z,
      },
      requests: performance.getEntriesByType('resource').map((r) => r.name),
    };
  });
}
async function saves() {
  return page.evaluate(() => ({
    teaching: localStorage.getItem('sparkmate.routes.v2'),
    p0: localStorage.getItem('sparkmate.seventh-checksum.street.v1'),
    m1: localStorage.getItem('sparkmate.seventh-checksum.kickback.v1'),
  }));
}
async function walk(key, predicate, timeout = 25000) {
  await page.locator('#exploration-input').focus();
  await page.keyboard.down(key);
  try {
    await expect.poll(predicate, { timeout, intervals: [100] }).toBe(true);
  } finally {
    await page.keyboard.up(key);
  }
}
async function enterBranch() {
  await page.getByRole('button', { name: '开始自由探索', exact: true }).click({ timeout: 60000 });
  await expect
    .poll(async () => (await scene()).cameraOwner, { timeout: 60000 })
    .toBe('p9-character');
  await walk('KeyS', async () => (await scene()).player.z < 0.15);
  await page.mouse.move(1300, 650);
  await page.mouse.down();
  await page.mouse.move(776.4, 650, { steps: 18 });
  await page.mouse.up();
  await walk(
    'KeyW',
    async () => (await ui('lesson').isVisible()) || (await ui('panel').isVisible()),
  );
}
async function scan() {
  const pressed = await ui('scanner').getAttribute('aria-pressed');
  if (Number(await ui('focus').textContent()) < 35) {
    if (pressed === 'true') await ui('scanner').click();
    await expect
      .poll(async () => Number(await ui('focus').textContent()), { timeout: 15000 })
      .toBeGreaterThanOrEqual(90);
  }
  if ((await ui('scanner').getAttribute('aria-pressed')) !== 'true') await ui('scanner').click();
}
async function measure(id, mode, range) {
  await ui('mode-' + mode).click();
  if (range) await ui('range').selectOption(range);
  await scan();
  await ui('probe-' + id).click();
}
async function isolate() {
  await ui('isolate').click();
  await expect(page.locator('.kickback-panel footer')).toContainText('余压 0.00 V', {
    timeout: 5000,
  });
}
async function shot(name) {
  await page.screenshot({ path: out + '/' + name + '.png' });
}
try {
  await page.goto(base + '/?quality=3&world=p9');
  await enterBranch();
  const before = await saves(),
    canvas = await page.locator('.scene-stage canvas').elementHandle();
  await expect(ui('panel')).toHaveCount(0);
  await ui('lesson-answer').selectOption('release');
  await expect(ui('lesson-submit')).toBeDisabled();
  await shot('01-observation-lesson');
  const lessonStarted = Date.now();
  await expect(ui('lesson-time')).toHaveText('观察 30 / 30 秒', { timeout: 65000 });
  const lessonWaitMs = Date.now() - lessonStarted;
  await ui('lesson-answer').selectOption('vanish');
  await ui('lesson-submit').click();
  await expect(ui('lesson-status')).toContainText('磁场');
  await ui('lesson-answer').selectOption('release');
  await ui('lesson-submit').click();
  await expect(ui('panel')).toBeVisible();
  await expect(telemetry()).toHaveAttribute('data-lesson', 'true');
  await ui('hypothesis-supply').check();
  await ui('hypothesis-transient').check();
  await ui('save-hypotheses').click();
  await expect(ui('hypotheses-status')).toHaveText('已记录 2 条');
  const savedHypotheses = JSON.parse((await saves()).m1);
  expect(savedHypotheses.lessons).toContain('lesson:back-emf');
  expect(savedHypotheses.hypotheses).toEqual(['supply', 'transient']);
  results.push({
    name: 'Real thirty-second observation, single-choice gate and ungraded persisted hypotheses',
    lessonWaitMs,
  });
  await ui('close').click();
  await page.locator('#exploration-input').focus();
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(1000);
  await page.mouse.move(1300, 650);
  await page.mouse.down();
  await page.mouse.move(1057, 580, { steps: 12 });
  await page.mouse.up();
  await ui('enter').click();
  await shot('02-cold-room-normal');
  await ui('cycle').click();
  await expect
    .poll(async () => Number(await telemetry().getAttribute('data-resets')), { intervals: [20] })
    .toBe(1);
  let openingFeedback;
  await expect
    .poll(
      async () => {
        openingFeedback = (await scene()).feedback;
        return openingFeedback.screen;
      },
      { intervals: [20] },
    )
    .toBe('0c202c');
  expect(openingFeedback.streetLamp).toBe(0);
  expect(openingFeedback.contact).toBe(0.45);
  await shot('03-opening-reset');
  await measure('K1', 'voltage', '20V');
  await expect(ui('reading')).toContainText('量程溢出');
  await measure('K1', 'voltage', '600V');
  await expect(ui('reading')).toContainText('264.00 V');
  await measure('U1', 'ac', '200mV');
  await expect(ui('reading')).toContainText('量程溢出');
  await measure('U1', 'ac', '20Vac');
  await expect(ui('reading')).toContainText('2.47 V');
  await expect(ui('dialogue')).toContainText('波纹');
  await shot('04-eagle-eye-and-peak');
  await ui('dismiss-dialogue').click();
  await page.getByText('断电修复与验收', { exact: true }).click();
  await ui('install-diode').click();
  await expect(ui('status')).toContainText('带电安装被联锁拦截');
  await ui('energize').click();
  await measure('M2', 'current', '200mA');
  await expect(telemetry()).toHaveAttribute('data-meter-fuse', 'blown');
  await ui('replace-fuse').click();
  await expect(ui('status')).toContainText('禁止带电');
  await isolate();
  await ui('replace-fuse').click();
  await ui('energize').click();
  await measure('M2', 'current', '10A');
  await expect(ui('reading')).toContainText('1.000 A');
  await measure('K1', 'current', '10A');
  await expect(telemetry()).toHaveAttribute('data-meter-fuse', 'blown');
  await shot('05-instrument-fuse');
  await isolate();
  await ui('replace-fuse').click();
  await ui('energize').click();
  for (const [id, mode] of [
    ['K1', 'continuity'],
    ['M2', 'resistance'],
    ['D1', 'diode'],
  ]) {
    await measure(id, mode);
    await expect(ui('reading')).toContainText('禁止带电');
  }
  await ui('cycle').click();
  await expect(ui('cycle')).toBeEnabled({ timeout: 5000 });
  await ui('cycle').click();
  await expect(telemetry()).toHaveAttribute('data-protected', 'true', { timeout: 5000 });
  await shot('06-branch-protection');
  await isolate();
  await ui('reset-protection').click();
  await measure('K1', 'continuity', '2ohm');
  await expect(ui('reading')).toContainText('0.08 Ω');
  await measure('M2', 'resistance', '20ohm');
  await expect(ui('reading')).toContainText('量程溢出');
  await measure('M2', 'resistance', '2kohm');
  await expect(ui('reading')).toContainText('24.00 Ω');
  await measure('D1', 'diode', '2Vd');
  await expect(ui('reading')).toContainText('未导通');
  await ui('leads').selectOption('reverse');
  await scan();
  await ui('probe-D1').click();
  await expect(ui('reading')).toContainText('未导通');
  await ui('leads').selectOption('forward');
  await expect(telemetry()).toHaveAttribute('data-evidence', '6');
  await ui('diagnose').click();
  await expect(ui('status')).toContainText('证据支持');
  results.push({
    name: 'All six lenses, range overflow, live-measurement interlocks, independent meter fuse and accumulated branch protection',
    openingFeedback,
  });
  await ui('polarity').selectOption('cathode-return');
  await ui('install-diode').click();
  await expect(ui('status')).toContainText('极性联锁拦截');
  await expect(telemetry()).toHaveAttribute('data-repair', 'none');
  await ui('polarity').selectOption('cathode-positive');
  await ui('install-diode').click();
  await ui('energize').click();
  await ui('verify').click();
  await expect
    .poll(async () => Number(await telemetry().getAttribute('data-count')), {
      timeout: 18000,
      intervals: [50],
    })
    .toBeGreaterThanOrEqual(8);
  await shot('npc-frame-00-before');
  await expect(telemetry()).toHaveAttribute('data-completed', 'true', { timeout: 8000 });
  for (let i = 1; i <= 4; i++) {
    await shot(`npc-frame-0${i}-after`);
    frames.push({ frame: i, time: Date.now() });
    await page.waitForTimeout(300);
  }
  await expect(telemetry()).toHaveAttribute('data-count', '10');
  await expect(telemetry()).toHaveAttribute('data-xp', '100');
  await expect(telemetry()).toHaveAttribute('data-prisms', '1');
  await expect(ui('dialogue')).toContainText('十次开关');
  const after = await saves();
  expect(after.teaching).toBe(before.teaching);
  expect(after.p0).toBe(before.p0);
  expect((await scene()).canvasCount).toBe(1);
  expect((await scene()).feedback.streetLamp).toBe(1.8);
  expect((await scene()).feedback.screen).toBe('6ed2ca');
  const sameCanvas = await page.locator('.scene-stage canvas').elementHandle();
  expect(await canvas.evaluate((c) => c.isConnected)).toBe(true);
  await sameCanvas.dispose();
  await ui('dismiss-dialogue').click();
  await ui('talk').click();
  await expect(telemetry()).toHaveAttribute('data-xp', '100');
  await ui('dismiss-dialogue').click();
  results.push({
    name: 'Wrong polarity rejected; ten real timed openings, NPC feedback, fixed rewards, unchanged P0/teaching saves and same Stage',
  });
  await page.reload();
  await enterBranch();
  await expect(telemetry()).toHaveAttribute('data-completed', 'true');
  await expect(telemetry()).toHaveAttribute('data-xp', '100');
  await expect(ui('verify')).toBeDisabled();
  results.push({ name: 'Versioned progress restores after reload without a second award' });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const mode of ['voltage', 'continuity', 'ac', 'current', 'resistance', 'diode']) {
    await ui('mode-' + mode).click();
    await expect(ui('mode-' + mode)).toHaveAttribute('aria-pressed', 'true');
    expect(await ui('range').locator('option').count()).toBeGreaterThanOrEqual(2);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await shot('07-mobile-390-controls');
  results.push({
    name: '390px controls and all six lens/range selectors remain usable (browser layout only)',
  });
  await page.getByRole('button', { name: '返回教学 Esc', exact: true }).click();
  await expect(ui('panel')).toHaveCount(0);
  for (const tier of [0, 1, 2]) {
    const requested = [];
    const low = await browser.newPage();
    low.on('request', (r) => requested.push(r.url()));
    low.on('pageerror', (e) => errors.push(e.message));
    low.on('console', (m) => {
      if (m.type() === 'error' && /shader|WebGLProgram|GL_INVALID/i.test(m.text()))
        shaders.push(m.text());
    });
    await low.goto(base + `/?quality=${tier}&world=p9`);
    await expect(low.locator('.render-shell')).toHaveAttribute(
      'data-stage-ready',
      tier === 0 ? 'false' : 'true',
    );
    expect(requested.some((url) => /Kickback|kickback|street\/reactions/.test(url))).toBe(false);
    await low.close();
  }
  results.push({ name: 'Exit cleans M1 UI; Tier 0/1/2 never load the new branch' });
  expect(errors).toEqual([]);
  expect(shaders).toEqual([]);
  console.log(
    JSON.stringify({ passed: results.length, results, errors, shaders, frames }, null, 2),
  );
} catch (error) {
  await shot('m1-failure').catch(() => {});
  throw error;
} finally {
  await writeFile(
    out + '/m1-street-checks.json',
    JSON.stringify({ results, errors, shaders, frames }, null, 2),
  );
  await browser.close();
}
