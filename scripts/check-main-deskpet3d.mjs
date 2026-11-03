import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readCompanionScene } from '../tests/deskpet3d-helpers.js';

const url = process.env.SPARKMATE_MAIN_URL || 'http://127.0.0.1:5232';
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  args: ['--enable-unsafe-swiftshader'],
});
const report = {};
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    hasTouch: true,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const errors = [],
    requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => requests.push(request.url()));
  await page.addInitScript(() => {
    window.storageWrites = 0;
    const save = Storage.prototype.setItem;
    Storage.prototype.setItem = function (...args) {
      window.storageWrites++;
      return save.apply(this, args);
    };
  });
  const scene = page.locator('.companion').getByTestId('deskpet3d-scene');
  const visual = () => readCompanionScene(page);
  const business = () =>
    page.evaluate(async () => {
      const { useLearningStore } = await import('/src/stores/useLearningStore.js');
      return {
        state: JSON.stringify(useLearningStore.getState()),
        save: localStorage.getItem('sparkmate.routes.v2'),
        writes: window.storageWrites,
      };
    });
  async function resources() {
    return page.evaluate(async () => {
      const url = performance
        .getEntriesByType('resource')
        .find((entry) => entry.name.includes('/@react-three_fiber.js')).name;
      const { _roots } = await import(url);
      const canvas = document.querySelector('.companion canvas');
      const state = _roots.get(canvas)?.store.getState();
      return {
        roots: _roots.size,
        sameCanvas: window.initialCanvas === canvas,
        geometries: state?.gl.info.memory.geometries,
        textures: state?.gl.info.memory.textures,
        dpr: state?.viewport.dpr,
      };
    });
  }
  async function run(source) {
    await page.getByLabel('桌宠伪代码', { exact: true }).fill(source);
    await page.getByRole('button', { name: '运行代码', exact: true }).click();
  }
  await page.goto(url);
  await expect.poll(visual).not.toBeNull();
  await page.evaluate(() => {
    window.initialCanvas = document.querySelector('.companion canvas');
  });
  await mkdir('test-results', { recursive: true });
  await expect(page.getByRole('heading', { name: /每个伟大的创造/ })).toBeVisible();
  await expect(page.locator('.page-transition')).toHaveCSS('opacity', '1');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: 'test-results/main-deskpet3d-home.png' });
  await page.locator('.companion').screenshot({ path: 'test-results/main-deskpet3d-closeup.png' });
  report.initial = await resources();
  expect(report.initial.roots).toBe(1);
  expect(report.initial.dpr).toBe(1);
  const idle = await visual();
  await page.waitForTimeout(300);
  expect((await visual()).frames).toBe(idle.frames);
  await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
  await run('move("forward"); light("on"); play("success");');
  await expect.poll(async () => (await visual())?.z).toBeGreaterThan(0.37);
  await expect.poll(async () => (await visual())?.eyes[0]).toBeGreaterThan(2.19);
  const moving = await visual();
  await expect.poll(async () => Math.abs((await visual()).y - moving.y)).toBeGreaterThan(0.005);
  await expect(page.locator('.experience-text')).toContainText('0 / 2200 XP');
  const state = await page.evaluate(async () =>
    (await import('/src/stores/useLearningStore.js')).useLearningStore.getState(),
  );
  expect(state.unlockedLevels).toEqual(['L1', 'L2']);
  expect(state.completedLevels).toEqual(['L1']);
  const before = await business();
  await page.waitForTimeout(400);
  expect(await business()).toEqual(before);
  report.runtimeBinding = {
    z: (await visual()).z,
    eyes: (await visual()).eyes,
    xp: 0,
    completedLevels: state.completedLevels,
    unlockedLevels: state.unlockedLevels,
    noAnimationWrites: true,
  };
  const intervals = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const values = [];
        let previous;
        const tick = (now) => {
          if (previous !== undefined) values.push(now - previous);
          previous = now;
          if (values.length < 90) requestAnimationFrame(tick);
          else resolve(values);
        };
        requestAnimationFrame(tick);
      }),
  );
  intervals.sort((a, b) => a - b);
  report.frameSampling = {
    medianMs: intervals[45],
    p95Ms: intervals[85],
    note: 'Local headless Chrome sample; not a guarantee for all devices.',
  };
  for (let i = 0; i < 8; i++) {
    await page.getByRole('button', { name: '学习仪表盘', exact: true }).click();
    await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
  }
  report.afterNavigation = await resources();
  expect(report.afterNavigation).toEqual(report.initial);
  expect(await business()).toEqual(before);
  await page.getByRole('button', { name: '收起桌宠伙伴', exact: true }).click();
  await expect(page.getByRole('button', { name: '展开桌宠伙伴', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '展开桌宠伙伴', exact: true }).press('Enter');
  expect((await resources()).sameCanvas).toBe(true);
  await page.getByRole('button', { name: '重置学习进度', exact: true }).click();
  await expect(scene).toHaveAttribute('data-paused', 'true');
  const modalFrame = (await visual()).frames;
  await page.waitForTimeout(300);
  expect((await visual()).frames).toBe(modalFrame);
  await page.getByRole('button', { name: '保留进度', exact: true }).click();
  await expect(scene).toHaveAttribute('data-paused', 'false');
  await expect.poll(async () => (await visual()).frames).toBeGreaterThan(modalFrame);
  await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
  await page.getByRole('button', { name: '麦克风 VCC 引脚', exact: true }).press('Enter');
  await page.getByRole('button', { name: '主板 GND 引脚', exact: true }).press('Enter');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(scene).toHaveAttribute('data-paused', 'true');
  await expect(page.locator('.app-shell')).toHaveAttribute('inert', '');
  const burnFrame = (await visual()).frames;
  await page.waitForTimeout(300);
  expect((await visual()).frames).toBe(burnFrame);
  await page.getByRole('button', { name: '重置模拟开发板', exact: true }).press('Enter');
  await expect(scene).toHaveAttribute('data-paused', 'false');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1080 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.locator('.companion canvas')).toBeVisible();
  }
  await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
  await run('move("stop"); light("off");');
  await expect.poll(async () => (await visual()).z).toBe(0);
  await expect.poll(async () => (await visual()).eyes).toEqual([0.15, 0.15]);
  report.pauseAndResume = 'PASS: modal, burnout inert, collapse/expand; same Canvas';
  await page.getByRole('button', { name: '学习仪表盘', exact: true }).click();
  await expect(page.getByRole('heading', { name: /每个伟大的创造/ })).toBeVisible();
  await expect(page.locator('.page-transition')).toHaveCSS('opacity', '1');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: 'test-results/main-deskpet3d-home.png' });
  await page.locator('.companion').screenshot({ path: 'test-results/main-deskpet3d-closeup.png' });
  expect(
    requests.filter((request) => /DemoCodeRunner|useDemoRuntime|DeskPet3DDemo/.test(request)),
  ).toEqual([]);
  expect(errors).toEqual([]);
  // Exercise a real browser context loss and wait for R3F's deferred disposal.
  const beforeLoss = await business();
  await page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .find((entry) => entry.name.includes('/@react-three_fiber.js')).name;
    const { _roots } = await import(url);
    const gl = _roots.get(document.querySelector('.companion canvas')).store.getState().gl;
    gl.getContext().getExtension('WEBGL_lose_context').loseContext();
  });
  await expect(page.locator('.companion .companion-body')).toBeVisible();
  await expect(page.locator('.companion canvas')).toHaveCount(0);
  await expect.poll(async () => (await resources()).roots).toBe(0);
  expect(await business()).toEqual(beforeLoss);
  await page.getByRole('button', { name: '收起桌宠伙伴', exact: true }).click();
  await expect(page.getByRole('button', { name: '展开桌宠伙伴', exact: true })).toBeVisible();
  report.contextLoss = 'PASS: original 2D fallback, Canvas disposed, business state unchanged';
  await context.close();
  const blockedContext = await browser.newContext({ reducedMotion: 'reduce' });
  const blocked = await blockedContext.newPage();
  await blocked.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null;
      return original.call(this, type, ...args);
    };
  });
  await blocked.goto(url);
  await expect(blocked.locator('.companion .companion-body')).toBeVisible();
  await expect(blocked.getByRole('button', { name: '代码魔改工坊', exact: true })).toBeVisible();
  await blocked.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
  await blocked.getByLabel('桌宠伪代码', { exact: true }).fill('move("backward"); light("on");');
  await blocked.getByRole('button', { name: '运行代码', exact: true }).click();
  await expect(blocked.locator('.companion .command-led')).toHaveClass(/is-lit/);
  await expect(blocked.locator('.companion .pet-command-backward')).toHaveCount(1);
  report.noWebGL = 'PASS: original 2D fallback and real sandbox remain usable';
  await blockedContext.close();
  report.status = 'PASS';
  await writeFile('test-results/main-deskpet3d-check.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
