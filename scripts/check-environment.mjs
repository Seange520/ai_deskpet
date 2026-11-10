import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.env.SPARKMATE_ENVIRONMENT_URL || 'http://127.0.0.1:5232';
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  args: ['--enable-unsafe-swiftshader'],
});
const report = {};
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    timezoneId: 'Asia/Singapore',
    reducedMotion: 'no-preference',
    hasTouch: true,
  });
  await context.addInitScript(() => {
    window.environmentAudit = { contexts: 0, notes: [], peaks: [], writes: 0 };
    const audit = window.environmentAudit,
      save = Storage.prototype.setItem;
    Storage.prototype.setItem = function (...args) {
      audit.writes++;
      return save.apply(this, args);
    };
    window.AudioContext = class {
      state = 'running';
      currentTime = 0;
      destination = {};
      constructor() {
        audit.contexts++;
      }
      createOscillator() {
        return {
          frequency: {
            setValueAtTime(hz) {
              audit.notes.push(hz);
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
            linearRampToValueAtTime(peak) {
              audit.peaks.push(peak);
            },
            exponentialRampToValueAtTime() {},
            cancelScheduledValues() {},
          },
          connect() {},
          disconnect() {},
        };
      }
    };
  });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
    console.log('PAGE ERROR', error.message);
  });
  await page.clock.install({ time: new Date('2026-11-04T18:59:35+08:00') });
  await page.goto(url);
  const scene = page.getByTestId('deskpet3d-scene');
  const focus = page.getByTestId('deskpet-focus-button');
  async function visual(target = page) {
    return target.evaluate(async () => {
      const resource = performance
        .getEntriesByType('resource')
        .find((e) => e.name.includes('/@react-three_fiber.js'));
      if (!window.environmentFiberURL) {
        const source = await (await fetch('/src/features/deskpet3d/DeskPet3DStage.jsx')).text();
        window.environmentFiberURL =
          resource?.name || source.match(/from ["']([^"']*@react-three_fiber[^"']*)["']/)?.[1];
      }
      if (!window.environmentFiberURL) return null;
      const { _roots } = await import(window.environmentFiberURL);
      const canvas = document.querySelector('.pet-focus-stage canvas, .companion canvas');
      const state = _roots.get(canvas)?.store.getState(),
        head = state?.scene.getObjectByName('command-head');
      if (!head) return null;
      const pet = state.scene.getObjectByName('command-pet'),
        eyes = [];
      pet.traverse((mesh) => {
        if (mesh.material?.name === 'command-eye')
          eyes.push({ scale: mesh.scale.y, emissive: mesh.material.emissiveIntensity });
      });
      const point = head.localToWorld(head.position.clone().set(0, 0.65, 0)).project(state.camera);
      const rect = canvas.getBoundingClientRect();
      return {
        eyes,
        headY: head.rotation.y,
        ambient: state.scene.getObjectByName('environment-ambient').intensity,
        frames: state.gl.info.render.frame,
        sameCanvas: !window.environmentCanvas || window.environmentCanvas === canvas,
        point: {
          x: rect.left + ((point.x + 1) * rect.width) / 2,
          y: rect.top + ((1 - point.y) * rect.height) / 2,
        },
      };
    });
  }
  const learning = () =>
    page.evaluate(async () => ({
      state: JSON.stringify(
        (await import('/src/stores/useLearningStore.js')).useLearningStore.getState(),
      ),
      saved: localStorage.getItem('sparkmate.routes.v2'),
      writes: window.environmentAudit.writes,
    }));
  await expect.poll(visual, { timeout: 15000 }).not.toBeNull();
  await expect(scene).toHaveAttribute('data-environment', 'day');
  expect(await page.evaluate(() => window.environmentAudit.contexts)).toBe(0);
  await page.getByRole('button', { name: '誊写房', exact: true }).click();
  await page.getByLabel('桌宠伪代码', { exact: true }).fill('move("stop"); light("on");');
  await page.getByRole('button', { name: '运行代码', exact: true }).click();
  await expect.poll(async () => (await visual()).eyes[0].emissive).toBe(2.2);
  const before = await learning();
  await page.evaluate(() => {
    window.environmentCanvas = document.querySelector('.companion canvas');
  });
  await focus.click();
  await page.clock.fastForward(31000);
  await page.clock.resume();
  await expect(scene).toHaveAttribute('data-environment', 'night');
  await expect(scene).toHaveAttribute('data-sleeping', 'false');
  await expect.poll(async () => (await visual()).ambient).toBe(0.55);
  await expect.poll(async () => (await visual()).eyes[0].scale).toBeLessThan(0.86);
  expect((await visual()).eyes[0].emissive).toBe(2.2);
  expect((await visual()).sameCanvas).toBe(true);
  expect(await page.evaluate(() => window.environmentAudit.notes.includes(440))).toBe(true);
  report.night =
    'PASS: browser local 19:00 boundary, dim lights/half eyes, sandbox LED unchanged, same Canvas';
  await page.getByRole('button', { name: '切换为白天', exact: true }).click();
  await expect.poll(async () => (await visual()).ambient).toBe(1.3);
  await page.clock.fastForward(61000);
  await page.clock.resume();
  await expect(scene).toHaveAttribute('data-sleeping', 'true');
  await expect(scene).toHaveAttribute('data-environment', 'day');
  await expect.poll(async () => (await visual()).eyes[0].scale).toBeLessThan(0.1);
  await page.mouse.move(5, 5);
  await expect(scene).toHaveAttribute('data-sleeping', 'false');
  await expect.poll(async () => (await visual()).eyes[0].scale).toBeGreaterThan(1.59);
  await page.clock.fastForward(61000);
  await page.clock.resume();
  await expect(scene).toHaveAttribute('data-sleeping', 'true');
  await page.touchscreen.tap(10, 10);
  await expect(scene).toHaveAttribute('data-sleeping', 'false');
  await page.evaluate(async () =>
    (await import('/src/features/interaction/usePetActions.js')).usePetActions
      .getState()
      .setLight(50),
  );
  await page.mouse.move(10, 10);
  await expect(scene).toHaveAttribute('data-sleeping', 'true');
  await page.evaluate(async () => {
    const actions = (
      await import('/src/features/interaction/usePetActions.js')
    ).usePetActions.getState();
    actions.setLight(null);
    actions.trigger('sleep');
  });
  await page.mouse.move(15, 15);
  await expect(scene).toHaveAttribute('data-sleeping', 'true');
  await page.evaluate(async () =>
    (await import('/src/features/interaction/usePetActions.js')).usePetActions
      .getState()
      .trigger('wake'),
  );
  await expect(scene).toHaveAttribute('data-sleeping', 'false');
  report.idle = 'PASS: 60-second sleep, pointer wake, hardware/manual sleep still take priority';
  await page.getByRole('button', { name: '跟随本地时间', exact: true }).click();
  await expect(scene).toHaveAttribute('data-environment', 'night');
  for (let i = 0; i < 3; i++) {
    const point = (await visual()).point;
    await page.mouse.click(point.x, point.y);
    if (i < 2) {
      await expect(scene).not.toHaveAttribute('data-emotion', 'dizzy');
      await page.waitForTimeout(180);
    }
  }
  await expect(scene).toHaveAttribute('data-emotion', 'dizzy');
  await expect(page.getByTestId('pet-affection')).toHaveAttribute('data-emotion', 'dizzy');
  await expect.poll(async () => Math.abs((await visual()).headY)).toBeGreaterThan(0.01);
  // Native animation opacity is checked below with real frame timing.
  expect(
    await page.evaluate(() =>
      window.environmentAudit.notes.filter((hz) => hz === 740 || hz === 620),
    ),
  ).toEqual([740, 620]);
  expect(await page.evaluate(() => window.environmentAudit.peaks.includes(0.012))).toBe(true);
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/environment-night-dizzy.png' });
  await expect(scene).toHaveAttribute('data-emotion', 'drowsy');
  await expect.poll(async () => Math.abs((await visual()).headY)).toBeLessThan(0.001);
  expect(await learning()).toEqual(before);
  report.dizzy =
    'PASS: three real head raycast clicks, local shake/stars, quiet shared audio, cleanup, no learning/storage writes';
  await page.getByRole('button', { name: '关闭桌宠聚焦', exact: true }).click();
  await page.getByRole('button', { name: '静音音效', exact: true }).click();
  const muted = await learning();
  await focus.click();
  const noteCount = await page.evaluate(() => window.environmentAudit.notes.length);
  await page.getByTestId('environment-toggle').click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: '摸摸头', exact: true }).click();
    await page.waitForTimeout(180);
  }
  await expect(scene).toHaveAttribute('data-emotion', 'dizzy');
  expect(await page.evaluate(() => window.environmentAudit.notes.length)).toBe(noteCount);
  await page.getByRole('button', { name: '关闭桌宠聚焦', exact: true }).click();
  await expect(page.getByTestId('pet-affection')).toHaveCount(0);
  expect(await learning()).toEqual(muted);
  expect(errors).toEqual([]);
  await context.close();
  // Check native Framer/WAAPI visuals separately with only Date fixed, using real frame timing.
  const motionContext = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    timezoneId: 'Asia/Singapore',
    reducedMotion: 'no-preference',
  });
  const motionPage = await motionContext.newPage();
  await motionPage.clock.setFixedTime(new Date('2026-11-04T23:00:00+08:00'));
  await motionPage.addInitScript(() => {
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;
  });
  await motionPage.goto(url);
  await expect.poll(() => visual(motionPage)).not.toBeNull();
  await motionPage.getByTestId('deskpet-focus-button').click();
  for (let i = 0; i < 3; i++) {
    await motionPage.getByRole('button', { name: '摸摸头', exact: true }).click();
    await motionPage.waitForTimeout(160);
  }
  await expect(motionPage.getByTestId('pet-affection')).toHaveAttribute('data-emotion', 'dizzy');
  await expect
    .poll(async () =>
      Number(
        await motionPage
          .getByTestId('pet-affection')
          .locator('span')
          .first()
          .evaluate((node) => getComputedStyle(node).opacity),
      ),
    )
    .toBeGreaterThan(0.5);
  await motionPage.screenshot({ path: 'test-results/environment-night-dizzy-native.png' });
  report.nativeAnimation =
    'PASS: visible dizzy stars with native Web Animations and real frame timing';
  await motionContext.close();
  const reducedContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: 'Asia/Singapore',
    reducedMotion: 'reduce',
    hasTouch: true,
  });
  const reduced = await reducedContext.newPage();
  await reduced.clock.setFixedTime(new Date('2026-11-04T23:00:00+08:00'));
  await reduced.addInitScript(() => {
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;
  });
  await reduced.goto(url);
  await expect.poll(() => visual(reduced)).not.toBeNull();
  await reduced.getByTestId('deskpet-focus-button').click();
  await expect(reduced.getByTestId('deskpet3d-scene')).toHaveAttribute('data-environment', 'night');
  for (let i = 0; i < 3; i++) {
    await reduced.getByRole('button', { name: '摸摸头', exact: true }).click();
    await reduced.waitForTimeout(180);
  }
  await expect(reduced.getByTestId('deskpet3d-scene')).toHaveAttribute('data-emotion', 'dizzy');
  expect((await visual(reduced)).headY).toBe(0);
  await reduced.setViewportSize({ width: 320, height: 320 });
  const close = reduced.getByRole('button', { name: '关闭桌宠聚焦', exact: true });
  await close.scrollIntoViewIfNeeded();
  await expect(close).toBeInViewport();
  await close.click();
  await expect(reduced.getByRole('dialog')).toHaveCount(0);
  report.reducedAndMuted =
    'PASS: muted/no AudioContext safe, reduced motion static stars, short-screen controls and close cleanup';
  await reducedContext.close();
  await writeFile('test-results/environment-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
