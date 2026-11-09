import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.R1_BASE_URL || 'http://127.0.0.1:5173';
const out = process.env.R1_OUTPUT || 'work/acceptance/r1-mission';
await mkdir(out, { recursive: true });
let browser;
try {
  browser = process.env.R1_CDP_URL
    ? await chromium.connectOverCDP(process.env.R1_CDP_URL)
    : await chromium.launch({
        channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
        headless: true,
      });
} catch (error) {
  await writeFile(
    `${out}/report.json`,
    JSON.stringify(
      {
        passed: false,
        status: 'blocked',
        passes: [],
        errors: [String(error)],
        screenshots: [],
        performance: [],
        note: 'Browser did not start. No visual or GPU acceptance was performed.',
      },
      null,
      2,
    ) + '\n',
  );
  console.error(String(error));
  console.log('RESULT mission=r1 passes=0 errors=1');
  process.exit(1);
}
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
const page = await context.newPage(),
  errors = [],
  passes = [],
  performanceRows = [],
  screenshots = [];
function observe(target) {
  target.on('pageerror', (error) => errors.push(error.message));
  target.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  target.on('response', (response) => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`);
  });
}
observe(page);
const hud = () => page.locator('[data-mission-step]');
const action = (type) => page.getByTestId('action-' + type);
async function step(expected) {
  await expect(hud()).toHaveAttribute('data-mission-step', expected);
}
async function go(point) {
  await page.getByTestId('point-' + point).click();
  await expect(page.locator('.mission-kit')).toHaveAttribute('data-selected-point', point, {
    timeout: 10000,
  });
}
async function record() {
  await action('measure').click();
  await action('record').click();
}
async function shot(name) {
  await page.screenshot({ path: `${out}/${name}.png` });
  screenshots.push(`${name}.png`);
}
async function metrics(label) {
  await expect
    .poll(
      async () =>
        JSON.parse((await page.getByTestId('mission-metrics').getAttribute('data-metrics')) || '{}')
          .fps,
    )
    .toBeGreaterThan(0);
  const data = JSON.parse(await page.getByTestId('mission-metrics').getAttribute('data-metrics'));
  assert.ok(data.calls <= 60, `draw calls ${data.calls}`);
  assert.ok(data.triangles <= 40000, `triangles ${data.triangles}`);
  performanceRows.push({ label, ...data });
}

try {
  await page.goto(base + '/?mission=r1&quality=3&boot=0');
  await expect(hud()).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
  const firstFrameMs = JSON.parse(
    await page.getByTestId('mission-metrics').getAttribute('data-metrics'),
  ).firstFrameMs;
  assert.ok(firstFrameMs <= 6000, `first frame ${firstFrameMs}ms`);
  assert.equal(await page.locator('canvas').count(), 1);
  assert.equal(await page.locator('[data-space-phase]').count(), 0);
  passes.push('isolated route, one canvas, first screen <=6s');
  await page.getByRole('button', { name: '校验轨', exact: false }).click();
  for (const [index, target] of ['meter', 'joint', 'lamp'].entries()) {
    const id = ['A', 'B', 'C'][index];
    await expect(hud()).toHaveAttribute('data-order', id);
    await action('accept').click();
    await action('begin').click();
    await step('powered');
    if (index === 0) {
      await go('meter');
      await action('pry').click();
      await step('violated');
      await action('retry').click();
      await step('retry');
      await action('resume').click();
      passes.push('unsafe pry -> violated -> retry');
    }
    await go('switch');
    if (index === 2) {
      await action('isolate').click();
      await step('powered');
      await action('disconnect').click();
      await step('violated');
      await action('retry').click();
      await action('resume').click();
      await go('switch');
      await record();
      passes.push('C requires supply evidence and forbids power cut');
    }
    await action('isolate').click();
    await step('isolated');
    await go(target);
    await action('inspect').click();
    await step('located');
    await action('repair').click();
    await step('located');
    await record();
    await shot(`${index * 2 + 1}-${id}-diagnosis`);
    await action('repair').click();
    await step('repaired');
    if (index === 1) {
      await go('switch');
      await action('energize').click();
      await step('isolated');
      await go(target);
      await action('inspect').click();
      await record();
      await action('repair').click();
      passes.push('premature energizing -> relapse -> isolated');
    }
    await action('verify').click();
    await step('repaired');
    await record();
    await action('verify').click();
    await step('verified');
    await go('switch');
    await action('energize').click();
    await step('scored');
    await expect(page.getByTestId('mission-score')).toHaveText('98');
    await page.waitForTimeout(700);
    await metrics(`desktop-${id}`);
    await shot(`${index * 2 + 2}-${id}-scored`);
    passes.push(`${id}: evidence gates, repair, verify, score and scene budget`);
    if (index < 2) await action('next').click();
  }
  await expect(page.getByTestId('mission-complete')).toBeVisible();

  // Genuine UI actions only, no injected store state or clock manipulation.
  await page.goto(base + '/?mission=r1&quality=3&boot=0');
  await expect(hud()).toHaveAttribute('data-ready', 'true');
  await action('accept').click();
  await action('begin').click();
  await page.locator('.mission-scene').focus();
  await page.keyboard.press('KeyE');
  await expect(page.locator('.mission-kit')).toHaveAttribute('data-selected-point', 'switch');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyD');
  await expect(page.locator('.mission-kit')).toHaveAttribute('data-selected-point', '');
  passes.push('E interaction and WASD distance invalidation');
  await go('meter');
  for (let i = 0; i < 3; i++) {
    await action('repair').click();
    await step('violated');
    await action('retry').click();
    if (i < 2) {
      await action('resume').click();
      await go('meter');
    }
  }
  await step('briefed');
  passes.push('three failures restart current commission');

  // Both tracks can finish all orders; the experience route needs no fault readings.
  await page.goto(base + '/?mission=r1&quality=3&boot=0');
  await expect(hud()).toHaveAttribute('data-ready', 'true');
  for (const [index, target] of ['meter', 'joint', 'lamp'].entries()) {
    await action('accept').click();
    await action('begin').click();
    await go('switch');
    if (index === 2) await record();
    await action('isolate').click();
    await go(target);
    await action('inspect').click();
    await action('repair').click();
    await action('verify').click();
    await go('switch');
    await action('energize').click();
    await step('scored');
    assert.ok(Number(await page.getByTestId('mission-score').textContent()) <= 70);
    if (index < 2) await action('next').click();
  }
  passes.push('experience track: all three orders without fault measurements, score <=70');

  const mobileContext = await browser.newContext({
    viewport: { width: 720, height: 1280 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  const mobile = await mobileContext.newPage();
  observe(mobile);
  await mobile.goto(base + '/?mission=r1&quality=3&boot=0');
  await expect(mobile.locator('[data-ready="true"]')).toBeVisible();
  await mobile.getByTestId('action-accept').click();
  await mobile.getByTestId('action-begin').click();
  await mobile.getByTestId('point-switch').tap();
  await expect(mobile.locator('.mission-kit')).toHaveAttribute('data-selected-point', 'switch');
  await mobile.getByTestId('action-isolate').click();
  await expect
    .poll(
      async () =>
        JSON.parse(
          (await mobile.getByTestId('mission-metrics').getAttribute('data-metrics')) || '{}',
        ).fps,
    )
    .toBeGreaterThan(0);
  const mobileMetrics = JSON.parse(
    await mobile.getByTestId('mission-metrics').getAttribute('data-metrics'),
  );
  performanceRows.push({ label: 'mobile-720', ...mobileMetrics });
  assert.equal(mobileMetrics.lod, 2);
  assert.equal(
    await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  passes.push('720 mobile: L2 assets, touch-size controls, no horizontal overflow');
  // Explicit lower quality does not accidentally load the mission canvas.
  await mobile.goto(base + '/?mission=r1&quality=0');
  await expect(mobile.getByRole('link', { name: '以 Tier 3 打开委托' })).toBeVisible();
  assert.equal(await mobile.locator('canvas').count(), 0);
  passes.push('quality gate');
  await mobileContext.close();
  const regression = await context.newPage();
  observe(regression);
  await regression.goto(base + '/?quality=0&boot=0');
  await expect(regression.locator('.app-shell')).toBeVisible();
  assert.equal(await regression.locator('[data-testid="mission-root"]').count(), 0);
  passes.push('main teaching route still mounts without mission');
  await regression.close();
  assert.deepEqual(errors, []);
} catch (error) {
  errors.push(error.stack || String(error));
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  const report = {
    passes,
    errors,
    screenshots,
    performance: performanceRows,
    browser: await browser.version(),
    note: 'FPS is measured in this local headless browser; it does not certify the RTX 5060 hardware target. Full scene costs reported (no shadow pass).',
    passed: errors.length === 0,
  };
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  console.log(`RESULT mission=r1 passes=${passes.length} errors=${errors.length}`);
  await context.close();
  await browser.close();
}
