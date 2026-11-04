import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.env.SPARKMATE_FOCUS_URL || 'http://127.0.0.1:5232';
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  args: ['--enable-unsafe-swiftshader'],
});
const report = {};
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    reducedMotion: 'no-preference',
  });
  await context.addInitScript(() => {
    window.storageWrites = 0;
    window.notes = [];
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (...args) {
      window.storageWrites++;
      return original.apply(this, args);
    };
    window.AudioContext = class {
      state = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          frequency: {
            setValueAtTime(hz) {
              window.notes.push(hz);
            },
          },
          connect() {},
          disconnect() {},
          start() {},
          stop() {
            queueMicrotask(() => this.onended?.());
          },
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime() {},
            linearRampToValueAtTime() {},
            exponentialRampToValueAtTime() {},
            cancelScheduledValues() {},
          },
          connect() {},
          disconnect() {},
        };
      }
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  const focus = page.getByTestId('deskpet-focus-button');
  const close = page.getByRole('button', { name: '关闭桌宠聚焦', exact: true });
  const hearts = page.getByTestId('pet-affection');
  async function visual() {
    return page.evaluate(async () => {
      const resource = performance
        .getEntriesByType('resource')
        .find((e) => e.name.includes('/@react-three_fiber.js'));
      if (!resource) return null;
      const { _roots } = await import(resource.name);
      const canvas = document.querySelector('canvas');
      const state = _roots.get(canvas)?.store.getState();
      const head = state?.scene.getObjectByName('command-head');
      if (!head) return null;
      const point = head.localToWorld(head.position.clone().set(0, 0.65, 0)).project(state.camera);
      const rect = canvas.getBoundingClientRect();
      return {
        roots: _roots.size,
        sameCanvas: !window.focusCanvas || canvas === window.focusCanvas,
        camera: state.camera.position.toArray(),
        dpr: state.viewport.dpr,
        frames: state.gl.info.render.frame,
        nod: head.rotation.x,
        y: state.scene.getObjectByName('command-pet').position.y,
        point: {
          x: rect.left + ((point.x + 1) * rect.width) / 2,
          y: rect.top + ((1 - point.y) * rect.height) / 2,
        },
        width: rect.width,
      };
    });
  }
  const business = () =>
    page.evaluate(async () => ({
      state: JSON.stringify(
        (await import('/src/stores/useLearningStore.js')).useLearningStore.getState(),
      ),
      save: localStorage.getItem('sparkmate.routes.v2'),
      writes: window.storageWrites,
    }));
  await expect.poll(visual).not.toBeNull();
  await page.evaluate(() => {
    window.focusCanvas = document.querySelector('canvas');
  });
  const before = await business();
  const camera = (await visual()).camera;
  await focus.click();
  await expect(close).toBeFocused();
  await expect(page.locator('.app-shell')).toHaveAttribute('inert', '');
  await expect.poll(async () => (await visual()).width).toBeGreaterThan(700);
  expect((await visual()).roots).toBe(1);
  expect((await visual()).sameCanvas).toBe(true);
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: '重置视角', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  const point = (await visual()).point;
  await page.mouse.click(point.x, point.y);
  await expect(hearts).toBeVisible();
  await expect.poll(async () => Math.abs((await visual()).nod)).toBeGreaterThan(0.003);
  expect(await page.evaluate(() => window.notes.filter((hz) => hz === 880 || hz === 1320))).toEqual(
    [880, 1320],
  );
  await mkdir('test-results', { recursive: true });
  await expect
    .poll(async () =>
      Number(
        await hearts
          .locator('span')
          .first()
          .evaluate((node) => getComputedStyle(node).opacity),
      ),
    )
    .toBeGreaterThan(0.5);
  await page.screenshot({ path: 'test-results/pet-focus-affection.png' });
  await expect(hearts).toHaveCount(0);
  await expect.poll(async () => Math.abs((await visual()).nod)).toBeLessThan(0.0002);
  report.headRaycast =
    'PASS: real mouse click at projected head mesh; nod, hearts, shared success sound';
  // Drag must rotate rather than count as a stroke; zoom and reset remain usable.
  const dragStart = (await visual()).point;
  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragStart.x + 150, dragStart.y + 30, { steps: 12 });
  await page.mouse.up();
  await expect(hearts).toHaveCount(0);
  expect((await visual()).camera).not.toEqual(camera);
  const rotated = (await visual()).camera;
  await page.mouse.wheel(0, -250);
  await expect
    .poll(async () => JSON.stringify((await visual()).camera))
    .not.toBe(JSON.stringify(rotated));
  await page.getByRole('button', { name: '重置视角', exact: true }).click();
  await expect.poll(async () => (await visual()).camera).toEqual(camera);
  report.controls = 'PASS: rotation, zoom, reset, drag does not pet';
  // Existing darkness/sleep priority, transient effects cancel while paused.
  await page.evaluate(async () =>
    (await import('/src/features/interaction/usePetActions.js')).usePetActions
      .getState()
      .setLight(50),
  );
  await page.getByRole('button', { name: '摸摸头', exact: true }).click();
  await expect(hearts).toHaveCount(0);
  await page.evaluate(async () =>
    (await import('/src/features/interaction/usePetActions.js')).usePetActions
      .getState()
      .setLight(null),
  );
  await page.getByRole('button', { name: '摸摸头', exact: true }).click();
  await expect(hearts).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByTestId('deskpet3d-scene')).toHaveAttribute('data-paused', 'true');
  await expect(hearts).toHaveCount(0);
  const paused = (await visual()).frames;
  await page.waitForTimeout(200);
  expect((await visual()).frames).toBe(paused);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByTestId('deskpet3d-scene')).toHaveAttribute('data-paused', 'false');
  await close.click();
  await expect(focus).toBeFocused();
  await expect(page.locator('.app-shell')).not.toHaveAttribute('inert');
  await expect.poll(async () => (await visual()).camera).toEqual(camera);
  await expect.poll(async () => (await visual()).width).toBe(138);
  for (let i = 0; i < 3; i++) {
    await focus.click();
    await page.keyboard.press('Escape');
  }
  expect((await visual()).roots).toBe(1);
  expect((await visual()).sameCanvas).toBe(true);
  await expect.poll(async () => Math.abs((await visual()).nod)).toBeLessThan(0.0002);
  await page.waitForTimeout(400);
  const settled = (await visual()).frames;
  await page.waitForTimeout(250);
  expect((await visual()).frames).toBe(settled);
  expect(await business()).toEqual(before);
  report.lifecycle =
    'PASS: same Canvas, idle demand rendering, close/escape/focus restore, background pause, no learning/storage writes';
  for (const size of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await focus.click();
    await expect.poll(async () => (await visual()).width).toBeGreaterThan(size.width - 100);
    await expect(close).toBeInViewport();
    await expect(page.getByRole('button', { name: '摸摸头', exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/pet-focus-${size.width}.png` });
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole('button', { name: '静音音效', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect.poll(visual).not.toBeNull();
  const mutedBefore = await business();
  await focus.click();
  const notes = await page.evaluate(() => window.notes.length);
  await page.getByRole('button', { name: '摸摸头', exact: true }).click();
  await expect(hearts).toBeVisible();
  expect(await page.evaluate(() => window.notes.length)).toBe(notes);
  expect((await visual()).nod).toBe(0);
  await page.keyboard.press('Escape');
  expect(await business()).toEqual(mutedBefore);
  report.reducedAndMuted = 'PASS: static fade without nod, no audio, no persistence changes';
  // Loss of WebGL during focus must release the modal/inert and restore the original 2D companion.
  await focus.click();
  await page.evaluate(async () => {
    const resource = performance
      .getEntriesByType('resource')
      .find((e) => e.name.includes('/@react-three_fiber.js'));
    const { _roots } = await import(resource.name);
    _roots
      .get(document.querySelector('canvas'))
      .store.getState()
      .gl.getContext()
      .getExtension('WEBGL_lose_context')
      .loseContext();
  });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.app-shell')).not.toHaveAttribute('inert');
  await expect(page.locator('.companion .companion-body')).toBeVisible();
  expect(errors).toEqual([]);
  report.contextLoss = 'PASS: focus teardown, 2D fallback, no page errors';
  await writeFile('test-results/pet-focus-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
