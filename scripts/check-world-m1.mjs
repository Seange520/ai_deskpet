import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.env.SPARKMATE_M1_OUTPUT || 'test-results/world-m1';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [],
  results = [],
  samples = [];
const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
async function open(touch = false) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    hasTouch: touch,
    isMobile: touch,
  });
  await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
  page.on('pageerror', (e) => {
    errors.push(e.message);
    console.log('PAGE ERROR', e.message);
  });
  await page.goto(base + '/?quality=3&world=p9');
  await page.getByRole('button', { name: '开始自由探索', exact: true }).click({ timeout: 60000 });
  await expect
    .poll(async () => (await state(page)).cameraOwner, { timeout: 60000 })
    .toBe('p9-character');
  await page.locator('#exploration-input').focus();
  await page.waitForTimeout(600);
  return page;
}
async function scene(page, fn) {
  return page.evaluate(async (source) => {
    const entry = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    const { _roots } = await import(
      entry?.name || '/node_modules/.vite/deps/@react-three_fiber.js'
    );
    const r = _roots.get(document.querySelector('.scene-stage canvas')).store.getState();
    return new Function('r', 'return (' + source + ')(r)')(r);
  }, fn.toString());
}
const state = (p) =>
  scene(p, (r) => ({
    ...r.camera.userData,
    camera: r.camera.position.toArray(),
    fov: r.camera.fov,
    canvases: document.querySelectorAll('canvas[data-engine]').length,
  }));
let p;
try {
  p = await open();
  const initial = await state(p);
  expect(initial.player.grounded).toBe(true);
  expect(initial.player.y).toBeCloseTo(0.665, 1);
  const save = await p.evaluate(() => localStorage.getItem('sparkmate.routes.v2'));
  const identity = await p.locator('.scene-stage canvas').elementHandle();
  // Actual stage Canvas MediaRecorder. No reconstructed scene or test camera.
  await p.evaluate(() => {
    const stream = document.querySelector('.scene-stage canvas').captureStream(30);
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    window.__m1Recording = { recorder, chunks, stream };
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.start();
  });
  const started = Date.now();
  await p.keyboard.down('KeyW');
  await p.keyboard.down('ShiftLeft');
  for (let i = 0; i <= 40; i++) {
    const target = started + i * 250;
    await p.waitForTimeout(Math.max(0, target - Date.now()));
    if (i === 2) await p.keyboard.up('ShiftLeft');
    if (i === 18) await p.keyboard.up('KeyW');
    if (i === 24) await p.keyboard.press('KeyV');
    if (i === 32) await p.keyboard.press('Space');
    samples.push({ elapsedMs: Date.now() - started, ...(await state(p)) });
    await p.screenshot({ path: out + '/frame-' + String(i).padStart(3, '0') + '.png' });
  }
  const captureDurationMs = Date.now() - started;
  const bytes = await p.evaluate(async () => {
    const { recorder, chunks, stream } = window.__m1Recording;
    await new Promise((resolve) => {
      recorder.onstop = resolve;
      recorder.stop();
    });
    stream.getTracks().forEach((t) => t.stop());
    return Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()));
  });
  await writeFile(out + '/m1-exploration-10s.webm', Buffer.from(bytes));
  const slope = samples.filter((s) => s.player.z > 3.7 && s.player.z < 5.3);
  expect(slope.some((s) => s.player.y > 1.3 && s.player.y < 2.6)).toBe(true);
  expect(
    samples.some(
      (s) => s.player.z > 7.7 && s.player.z < 9.3 && s.player.y > 3.1 && s.player.grounded,
    ),
  ).toBe(true);
  results.push({
    name: 'Real keyboard run / 45° climb / 0.5 m autostep without jump',
    slope,
    step: samples.filter((s) => s.player.z > 7.7 && s.player.z < 9.3),
  });
  expect(samples.some((s) => s.fpsBlend > 0 && s.fpsBlend < 0.95)).toBe(true);
  expect(samples.at(-1).fpsBlend).toBeGreaterThan(0.99);
  expect(samples.some((s) => s.elapsedMs > 8000 && !s.player.grounded && s.player.y > 1)).toBe(
    true,
  );
  results.push({
    name: 'V continuous fpsBlend / FOV and actual space jump',
    durationMs: captureDurationMs,
  });
  await p.keyboard.press('KeyV');
  await p.waitForTimeout(80);
  const middle = await state(p);
  expect(middle.fpsBlend).toBeGreaterThan(0);
  expect(middle.fpsBlend).toBeLessThan(1);
  await p.waitForTimeout(700);
  expect((await state(p)).fpsBlend).toBeLessThan(0.01);
  results.push({ name: 'FPS to TPS interpolation also remains continuous', middle });
  // Mouse movement and camera aim are real DOM pointer gestures.
  const beforeYaw = await p.evaluate(
    async () =>
      (
        await import(
          performance
            .getEntriesByType('resource')
            .find((r) => r.name.includes('/world/explorationState.js')).name
        )
      ).look.yaw,
  );
  const beforeLook = await state(p);
  await p.mouse.move(900, 500);
  await p.mouse.down();
  await p.mouse.move(1000, 520, { steps: 8 });
  await p.mouse.up();
  await p.waitForTimeout(200);
  const afterLook = await state(p);
  expect(afterLook.camera).not.toEqual(beforeLook.camera);
  expect(
    Math.abs(
      (await p.evaluate(
        async () =>
          (
            await import(
              performance
                .getEntriesByType('resource')
                .find((r) => r.name.includes('/world/explorationState.js')).name
            )
          ).look.yaw,
      )) - beforeYaw,
    ),
  ).toBeGreaterThan(0.1);
  results.push({ name: 'Mouse drag changes camera aim' });
  const freeze = await state(p);
  await p.evaluate(() => {
    const d = document.createElement('div');
    d.className = 'modal-backdrop';
    document.body.append(d);
  });
  await p.waitForTimeout(300);
  const a = await state(p);
  await p.waitForTimeout(350);
  const b = await state(p);
  expect(b.player.physicsSteps).toBe(a.player.physicsSteps);
  await p.evaluate(() => document.querySelector('.modal-backdrop').remove());
  await p.waitForTimeout(300);
  expect((await state(p)).player.physicsSteps).toBeGreaterThan(b.player.physicsSteps);
  results.push({ name: 'Modal freezes fixed physics steps and resumes without catch-up' });
  // Focus isolation: holding W then focusing the HUD must clear it.
  await p.locator('#exploration-input').focus();
  await p.keyboard.down('KeyW');
  await p.getByRole('button', { name: '切换视角 V', exact: true }).focus();
  await p.keyboard.up('KeyW');
  await p.locator('#exploration-input').focus();
  const held = await state(p);
  await p.waitForTimeout(250);
  expect(Math.abs((await state(p)).player.z - held.player.z)).toBeLessThan(0.1);
  await p.keyboard.press('Escape');
  await expect(p.locator('.render-shell')).toHaveAttribute('data-world-preview', 'false');
  expect(await identity.evaluate((c) => c === document.querySelector('.scene-stage canvas'))).toBe(
    true,
  );
  expect(await scene(p, (r) => r.camera.userData.cameraOwner || null)).toBe(null);
  await p
    .getByRole('navigation', { name: '主导航' })
    .getByRole('button', { name: '代码魔改工坊', exact: true })
    .click();
  await expect(p.getByLabel('桌宠伪代码', { exact: true })).toBeVisible({ timeout: 15000 });
  expect(await p.evaluate(() => localStorage.getItem('sparkmate.routes.v2'))).toBe(save);
  results.push({
    name: 'Focus clears held keys / Esc restores same Canvas / teaching / unchanged save',
  });
  await p.close();
  const mobile = await open(true);
  const cdp = await mobile.context().newCDPSession(mobile);
  await expect(mobile.locator('#ecctrl-joystick canvas')).toBeVisible();
  expect(await mobile.locator('canvas[data-engine]').count()).toBeLessThanOrEqual(2);
  const box = await mobile.locator('#ecctrl-joystick').boundingBox();
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const start = await state(mobile);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ id: 1, x, y }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ id: 1, x, y: y - 45 }],
  });
  await mobile.waitForTimeout(500);
  const moved = await state(mobile);
  expect(moved.player.z - start.player.z).toBeGreaterThan(0.2);
  // Keep joystick down while a second finger drags the right view surface.
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { id: 1, x, y: y - 45 },
      { id: 2, x: 1000, y: 450 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { id: 1, x, y: y - 45 },
      { id: 2, x: 1080, y: 470 },
    ],
  });
  await mobile.waitForTimeout(250);
  const looked = await state(mobile);
  const touchYaw = await mobile.evaluate(
    async () =>
      (
        await import(
          performance
            .getEntriesByType('resource')
            .find((r) => r.name.includes('/world/explorationState.js')).name
        )
      ).look.yaw,
  );
  expect(Math.abs(touchYaw)).toBeGreaterThan(0.1);
  expect(looked.camera).not.toEqual(moved.camera);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mobile.waitForTimeout(200);
  await mobile.screenshot({ path: out + '/m1-mobile.png' });
  await mobile.getByRole('button', { name: '返回教学 Esc', exact: true }).click();
  await expect(mobile.locator('#ecctrl-joystick')).toHaveCount(0);
  results.push({
    name: 'Emulated mobile real EcctrlJoystick touch movement + simultaneous right drag / ≤2 renderers / cleanup',
    start,
    moved,
    looked,
  });
  await mobile.close();

  const low = await browser.newPage();
  const requested = [];
  low.on('request', (r) => requested.push(r.url()));
  await low.goto(base + '/?quality=1&world=p9');
  await expect(low.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
  expect(
    requested.some(
      (u) => u.includes('/world/Exploration') || u.includes('rapier') || u.includes('ecctrl'),
    ),
  ).toBe(false);
  await low.close();
  const failed = await browser.newPage();
  await failed.route('**/src/features/world/Exploration.jsx*', (route) => route.abort());
  await failed.goto(base + '/?quality=3&world=p9');
  await failed.getByRole('button', { name: '开始自由探索', exact: true }).click();
  await expect(failed.locator('.render-shell')).toHaveAttribute('data-quality-tier', '0');
  await expect(failed.locator('canvas')).toHaveCount(0);
  await expect(failed.getByRole('navigation', { name: '主导航' })).toBeVisible();
  await failed.close();
  results.push({
    name: 'Tier 1 never requests physics; exploration module failure restores zero Canvas teaching',
  });
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ passed: results.length, results, errors }, null, 2));
} finally {
  await writeFile(out + '/m1-checks.json', JSON.stringify({ results, samples, errors }, null, 2));
  await browser.close();
}
