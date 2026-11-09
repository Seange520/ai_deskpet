import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';

const baseURL = process.env.SPARKMATE_RENDER_URL || 'http://127.0.0.1:5173';
const out = resolve('work/acceptance/render-r1');
const sampleMs = 10000;
const report = {
  timestamp: new Date().toISOString(),
  baseURL,
  viewport: { width: 1920, height: 1080 },
  sampleMs,
  hardwareClass: process.env.SPARKMATE_RENDER_HARDWARE_CLASS || 'unclassified',
  status: 'running',
  checks: [],
  screenshots: [],
  performance: [],
  consoleErrors: [],
};
await mkdir(out, { recursive: true });
let browser, context;
async function check(name, fn) {
  try {
    await fn();
    report.checks.push({ name, passed: true });
    console.log('PASS', name);
  } catch (error) {
    report.checks.push({ name, passed: false, error: error.message });
    throw error;
  }
}

async function ready(page) {
  await expect(page.locator('.render-r1')).toBeVisible();
  await page.waitForFunction(() => window.__sparkmateRenderR1?.read().triangles > 0);
  const state = await page.evaluate(() => window.__sparkmateRenderR1.read());
  assert.equal(state.width, 1920);
  assert.equal(state.height, 1080);
  assert.equal(state.dpr, 1);
  assert.equal(state.landmarks.length, 5);
  assert.ok(state.drawCalls > 0);
  return state;
}

async function measure(page, name, hour, mode = 'toon', outline = true) {
  await page.goto(
    `${baseURL}/?quality=3&render=${mode}&time=${hour}&outline=${outline ? 1 : 0}&boot=0`,
  );
  await ready(page);
  await expect(page.locator('.render-r1')).toHaveAttribute('data-hour', String(hour));
  await expect(page.locator('.render-r1')).toHaveAttribute('data-render-mode', mode);
  await expect(page.locator('.render-r1')).toHaveAttribute('data-outline', String(outline));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.__sparkmateRenderR1.reset());
  await page.waitForTimeout(sampleMs);
  const state = await page.evaluate(() => window.__sparkmateRenderR1.read());
  report.performance.push({ name, hour, mode, outline, ...state });
  assert.ok(state.frames > 0, 'No rendered frames in sample');
  assert.ok(state.seconds >= 9, 'Sample window too short');
  assert.equal(state.width, 1920);
  assert.equal(state.height, 1080);
}

try {
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    headless: true,
  });
  context = await browser.newContext({
    viewport: report.viewport,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error')
      report.consoleErrors.push({ url: page.url(), message: message.text() });
  });
  page.on('pageerror', (error) =>
    report.consoleErrors.push({ url: page.url(), message: error.message }),
  );
  report.host = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    logicalCores: navigator.hardwareConcurrency,
    deviceMemoryGB: navigator.deviceMemory ?? null,
  }));
  await check('Opt-in only: original DOM route has no R1 canvas', async () => {
    await page.goto(`${baseURL}/?quality=dom&boot=0`);
    await expect(page.locator('.render-shell')).toHaveAttribute('data-quality-tier', '0');
    await expect(page.locator('.render-r1')).toHaveCount(0);
  });
  await check('Tier 2 ignores render=toon and retains the existing stage', async () => {
    await page.goto(`${baseURL}/?quality=2&render=toon&boot=0`);
    await expect(page.locator('.render-shell')).toHaveAttribute('data-quality-tier', '2');
    await expect(page.locator('.render-r1')).toHaveCount(0);
  });
  let dayOn, dayOff;
  await check('Three fixed-camera 1080p captures, real geometry and outlines', async () => {
    for (const [name, hour] of [
      ['01-day.png', 10],
      ['02-dusk.png', 18],
      ['03-night.png', 23],
    ]) {
      await page.goto(`${baseURL}/?quality=3&render=toon&time=${hour}&boot=0`);
      const state = await ready(page);
      await expect(page.locator('.render-r1')).toHaveAttribute('data-hour', String(hour));
      assert.ok(state.toonMeshes > 0);
      assert.ok(state.outlineMeshes > 0);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: resolve(out, name) });
      report.screenshots.push(name);
      if (hour === 10) dayOn = await page.getByTestId('render-r1-canvas').screenshot();
    }
  });
  await check(
    'Live controls reuse canvas and camera, preserve teaching storage and restore shareable URLs',
    async () => {
      await page.goto(`${baseURL}/?quality=3&render=toon&time=10&boot=0`);
      await ready(page);
      const canvas = page.locator('.render-r1 canvas');
      const original = await canvas.elementHandle();
      const camera = await page.evaluate(() => window.__sparkmateRenderR1.read().camera);
      const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }));
      await page.getByLabel('边缘描边', { exact: true }).uncheck();
      await expect(page.locator('.render-r1')).toHaveAttribute('data-outline', 'false');
      await expect
        .poll(() => page.evaluate(() => window.__sparkmateRenderR1.read().outlineMeshes))
        .toBe(0);
      await page.waitForTimeout(200);
      dayOff = await page.getByTestId('render-r1-canvas').screenshot();
      await page.getByRole('button', { name: 'PBR · 对比', exact: true }).click();
      await expect(page.locator('.render-r1')).toHaveAttribute('data-render-mode', 'standard');
      await expect
        .poll(() => page.evaluate(() => window.__sparkmateRenderR1.read().toonMeshes))
        .toBe(0);
      await expect(page).toHaveURL(/render=standard/);
      assert.equal(await canvas.evaluate((node, previous) => node === previous, original), true);
      assert.deepEqual(await page.evaluate(() => window.__sparkmateRenderR1.read().camera), camera);
      await page.getByRole('button', { name: '黄昏', exact: true }).click();
      await expect(page.locator('.render-r1')).toHaveAttribute('data-hour', '18');
      const slider = page.getByLabel('昼夜时间', { exact: true });
      await slider.press('End');
      await slider.press('ArrowLeft');
      await expect(page.locator('.render-r1')).toHaveAttribute('data-hour', '23.75');
      await page.getByLabel('景深 DOF（可选）', { exact: true }).check();
      await expect(page).toHaveURL(/dof=1/);
      await page.waitForTimeout(500);
      await page.reload();
      await ready(page);
      await expect(page.locator('.render-r1')).toHaveAttribute('data-hour', '23.75');
      await expect(page.getByLabel('景深 DOF（可选）', { exact: true })).toBeChecked();
      assert.equal(await page.evaluate(() => JSON.stringify({ ...localStorage })), storage);
    },
  );
  await check(
    'Fourth 1080p image compares matching day-camera crops with outline on/off',
    async () => {
      assert.notDeepEqual(dayOn, dayOff);
      const compare = await context.newPage();
      try {
        await compare.setContent(
          '<canvas width="1920" height="1080" style="position:fixed;inset:0"></canvas>',
        );
        await compare.evaluate(
          async ([on, off]) => {
            const canvas = document.querySelector('canvas'),
              ctx = canvas.getContext('2d');
            for (const [i, data] of [on, off].entries()) {
              const img = new Image();
              img.src = `data:image/png;base64,${data}`;
              await img.decode();
              ctx.drawImage(img, 480, 0, 960, 1080, i * 960, 0, 960, 1080);
              ctx.fillStyle = '#f4f4e8ed';
              ctx.fillRect(i * 960 + 28, 28, 270, 48);
              ctx.fillStyle = '#233e51';
              ctx.font = '18px sans-serif';
              ctx.fillText(i ? 'OUTLINE OFF / 10:00' : 'OUTLINE ON / 10:00', i * 960 + 44, 59);
            }
            ctx.fillStyle = '#f4f4e8';
            ctx.fillRect(958, 0, 4, 1080);
          },
          [dayOn.toString('base64'), dayOff.toString('base64')],
        );
        const name = '04-outline-comparison.png';
        await compare.screenshot({ path: resolve(out, name) });
        report.screenshots.push(name);
      } finally {
        await compare.close();
        await page.bringToFront();
      }
    },
  );
  await check(
    '1080p performance samples include all render passes, with motion enabled',
    async () => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      for (const [name, hour, mode, outline] of [
        ['day', 10, 'toon', true],
        ['dusk', 18, 'toon', true],
        ['night', 23, 'toon', true],
        ['day-outline-off', 10, 'toon', false],
        ['day-standard', 10, 'standard', true],
      ])
        await measure(page, name, hour, mode, outline);
    },
  );
  await check('R1 console has zero errors', async () => assert.deepEqual(report.consoleErrors, []));
  await check('Toon average FPS is at least 55 for every captured condition', async () => {
    for (const sample of report.performance.filter((s) => s.mode === 'toon'))
      assert.ok(sample.fps >= 55, `${sample.name}: ${sample.fps.toFixed(1)} FPS < 55`);
  });
  const software = report.performance.some((s) =>
    /swiftshader|llvmpipe|software|basic render/i.test(s.renderer),
  );
  report.midrangeDesktopVerified = !software && report.hardwareClass === 'midrange-desktop';
  report.status = report.midrangeDesktopVerified
    ? 'browser-checks-passed'
    : 'browser-checks-passed-hardware-unclassified';
} catch (error) {
  report.status = 'failed-or-blocked';
  report.failure = error.stack || error.message;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (context)
    await context.close().catch((error) => {
      report.cleanupError = error.message;
    });
  if (browser)
    await browser.close().catch((error) => {
      report.cleanupError = error.message;
    });
  await writeFile(resolve(out, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  const table = [
    '| Condition | FPS | Draw calls (all passes) | Triangles (all passes) | GPU |',
    '| --- | ---: | ---: | ---: | --- |',
    ...report.performance.map(
      (s) =>
        `| ${s.name} | ${s.fps.toFixed(1)} | ${s.drawCalls.toFixed(0)} | ${s.triangles.toFixed(0)} | ${s.renderer.replaceAll('|', '/')} |`,
    ),
  ];
  await writeFile(
    resolve(out, 'performance.md'),
    `# R1 browser verification\n\nStatus: ${report.status}\n\nViewport: 1920 × 1080, DPR 1. Warm up 2 s, sample 10 s; animation enabled.\n\nHardware class: ${report.hardwareClass}. Midrange desktop verified: ${Boolean(report.midrangeDesktopVerified)}.\n\n${report.performance.length ? table.join('\n') : 'No measurements available. Browser launch or scene verification failed; see browser-report.json.'}\n\nConsole errors observed: ${report.consoleErrors.length}; zero is meaningful only after all browser checks complete.\n`,
  );
  console.log('Report:', resolve(out, 'browser-report.json'));
}
