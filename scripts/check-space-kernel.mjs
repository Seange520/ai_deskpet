import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { ISLANDS, TRAVEL_SECONDS } from '../src/features/space/world.js';

const baseURL = process.env.SPARKMATE_SPACE_URL;
if (!baseURL) throw new Error('Set SPARKMATE_SPACE_URL to the normal development server');
const output = process.env.SPARKMATE_SPACE_OUTPUT || 'test-results/space-kernel';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const results = [];

async function open(tier, reducedMotion = 'no-preference') {
  const page = await browser.newPage({ viewport: { width: 1728, height: 1080 }, reducedMotion });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    const value = message.text();
    if (
      message.type() === 'error' &&
      !(
        value.startsWith('Warning: Invalid DOM property') &&
        value.includes('lighting-color lightingColor') &&
        value.includes('@khvicha_react-liquid-glass')
      )
    )
      errors.push(value);
  });
  await page.goto(baseURL + '/?quality=' + tier);
  if (tier > 0) {
    await expect(page.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
    await expect
      .poll(() => readWorld(page).then((world) => world?.triangles || 0))
      .toBeGreaterThan(0);
  }
  return page;
}

async function readWorld(page) {
  return page.evaluate(async () => {
    const entry = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    if (!entry) return null;
    const { _roots } = await import(entry.name);
    const root = _roots.get(document.querySelector('.scene-stage canvas'))?.store.getState();
    if (!root) return null;
    let dof;
    root.scene.traverse((node) => {
      dof ||= node.__r3f?.objects?.find((effect) => effect.name === 'DepthOfFieldEffect');
    });
    const camera = root.camera;
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
      dof: dof?.target?.toArray(),
      fog: root.scene.fog?.isFogExp2,
      islands: root.scene.children
        .filter((item) => item.name.startsWith('space-island-'))
        .map((item) => item.name),
      triangles: root.gl.info.render.triangles,
      size: [root.size.width, root.size.height],
    };
  });
}

const shell = (page) => page.locator('.app-shell');
const nav = (page, name) =>
  page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name, exact: true });
const distance = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));

try {
  const page = await open(3);
  await expect(page.locator('.render-shell')).toHaveAttribute('data-quality-tier', '3');
  const initial = await readWorld(page);
  expect(initial.islands).toHaveLength(4);
  expect(initial.fog).toBe(true);
  expect(initial.size).toEqual([1728, 1080]);
  const canvas = await page.locator('.scene-stage canvas').elementHandle();
  const saved = await page.evaluate(() => JSON.stringify(localStorage));
  await page.evaluate(async () => {
    const { useSpaceStore } = await import('/src/features/space/spaceStore.js');
    window.spacePhases = [];
    useSpaceStore.subscribe((next, previous) => {
      if (next.phase !== previous.phase)
        window.spacePhases.push({ phase: next.phase, at: performance.now() });
    });
  });

  await nav(page, '硬件实验室').click();
  await expect(shell(page)).toHaveAttribute('data-space-phase', 'traveling');
  await expect(page.locator('.space-hud-panel')).toHaveAttribute('inert', '');
  await page.waitForTimeout(930);
  const airborne = await readWorld(page);
  expect(airborne.position[1]).toBeGreaterThan(ISLANDS.hardware.camera.position[1] + 1.5);
  expect(distance(initial.position, airborne.position)).toBeGreaterThan(2);
  expect(distance(initial.quaternion, airborne.quaternion)).toBeGreaterThan(0.03);
  await page.screenshot({ path: join(output, 'traveling.png') });
  await expect(shell(page)).toHaveAttribute('data-space-phase', 'traveling');
  await expect(shell(page)).toHaveAttribute('data-space-focus', 'hardware');
  await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
  await expect(shell(page)).toHaveAttribute('data-space-phase', 'idle');
  await page.waitForTimeout(300);
  const landed = await readWorld(page);
  expect(distance(landed.position, ISLANDS.hardware.camera.position)).toBeLessThan(0.2);
  expect(landed.dof).toEqual(ISLANDS.hardware.camera.focus);
  expect(landed.fov).toBe(ISLANDS.hardware.camera.fov);
  const phases = await page.evaluate(() => window.spacePhases);
  expect(phases.map(({ phase }) => phase)).toEqual(['departing', 'traveling', 'arriving', 'idle']);
  const duration = phases[2].at - phases[1].at;
  expect(duration).toBeGreaterThanOrEqual(TRAVEL_SECONDS * 1000 - 40);
  expect(duration).toBeLessThan(TRAVEL_SECONDS * 1000 + 500);
  await page.screenshot({ path: join(output, 'arrived-hardware.png') });
  results.push({
    name: 'Tier 3 flight, HUD, focus and full viewport',
    duration,
    initial,
    airborne,
    landed,
  });

  await nav(page, '代码魔改工坊').click();
  await expect(shell(page)).toHaveAttribute('data-space-phase', 'traveling');
  await page.waitForTimeout(530);
  const beforeTurn = await readWorld(page);
  await nav(page, '创客排位').click();
  const afterTurn = await readWorld(page);
  expect(distance(beforeTurn.position, afterTurn.position)).toBeLessThan(5);
  await expect(shell(page)).toHaveAttribute('data-space-focus', 'ranking');
  await expect(shell(page)).toHaveAttribute('data-space-phase', 'idle');
  expect((await readWorld(page)).dof).toEqual(ISLANDS.ranking.camera.focus);
  expect(
    await page
      .locator('.scene-stage canvas')
      .evaluate((node, original) => node === original, canvas),
  ).toBe(true);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(saved);
  await expect(page.getByRole('button', { name: '创客排位', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  results.push({ name: 'Mid-flight retarget, Canvas identity, and storage isolation' });
  await nav(page, '学习仪表盘').click();
  await expect(shell(page)).toHaveAttribute('data-space-phase', 'traveling');
  await page
    .locator('.scene-stage canvas')
    .evaluate((node) => node.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await expect(page.locator('.render-shell')).toHaveAttribute('data-quality-tier', '0');
  await expect(shell(page)).toHaveAttribute('data-space-focus', 'dashboard');
  await expect(shell(page)).toHaveAttribute('data-space-phase', 'idle');
  await expect(page.locator('canvas')).toHaveCount(0);
  results.push({ name: 'Mid-flight context loss resolves to the destination HUD' });
  await page.close();

  for (const [tier, reduced] of [
    [3, 'reduce'],
    [1, 'no-preference'],
    [0, 'reduce'],
  ]) {
    const fallback = await open(tier, reduced);
    await nav(fallback, '硬件实验室').click();
    await expect(fallback.getByRole('heading', { name: /认识它/ })).toBeVisible();
    await expect(shell(fallback)).toHaveAttribute('data-space-phase', 'idle');
    if (tier === 0) await expect(fallback.locator('canvas')).toHaveCount(0);
    else
      await expect
        .poll(() =>
          readWorld(fallback).then((world) =>
            distance(world.position, ISLANDS.hardware.camera.position),
          ),
        )
        .toBeLessThan(0.001);
    results.push({ name: 'Jump navigation', tier, reduced });
    await fallback.close();
  }

  expect(errors).toEqual([]);
  await writeFile(join(output, 'report.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
