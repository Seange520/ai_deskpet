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
      lod: Object.fromEntries(
        ['dashboard', 'hardware', 'code', 'ranking'].map((id) => {
          const group = root.scene.getObjectByName('space-island-' + id);
          return [
            id,
            {
              level: group?.userData.lod,
              visible: group?.visible,
              detail: Boolean(group?.getObjectByName('space-island-detail')),
              placeholder: Boolean(group?.getObjectByName('space-island-placeholder')),
            },
          ];
        }),
      ),
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
  await expect(shell(page)).toHaveAttribute('data-space-phase', 'idle');
  await expect(page.locator('.space-dock')).toHaveAttribute('data-positioned', 'true');
  const initial = await readWorld(page);
  expect(initial.islands).toHaveLength(4);
  expect(Object.values(initial.lod).every(({ visible }) => visible)).toBe(true);
  expect(initial.fog).toBe(true);
  expect(initial.size).toEqual([1728, 1080]);
  const canvas = await page.locator('.scene-stage canvas').elementHandle();
  const saved = await page.evaluate(() => JSON.stringify(localStorage));
  await page.evaluate(async () => {
    const { useSpaceStore } = await import('/src/features/space/spaceStore.js');
    window.spacePhases = [];
    window.hudFrames = [];
    const sample = () => {
      const panel = document.querySelector('.space-hud-panel');
      const phase = panel?.dataset.hudPhase;
      if (phase === 'leaving' || phase === 'detail') {
        const { opacity, transform } = getComputedStyle(panel);
        window.hudFrames.push({
          phase,
          opacity: Number(opacity),
          y: transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42,
          overflow: document.documentElement.scrollWidth - innerWidth,
        });
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    useSpaceStore.subscribe((next, previous) => {
      if (next.phase !== previous.phase)
        window.spacePhases.push({ phase: next.phase, at: performance.now() });
    });
  });

  const dashboardButton = nav(page, '校验册');
  const hardwareButton = nav(page, '街坊工坊');
  const codeButton = nav(page, '誊写房');
  await dashboardButton.focus();
  await expect(dashboardButton).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(hardwareButton).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(codeButton).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(hardwareButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(shell(page)).toHaveAttribute('data-space-phase', 'entering');
  await expect(page.locator('.space-hud-panel')).toHaveCount(0);
  await expect(hardwareButton).toHaveAttribute('data-pending', '');
  await expect(dashboardButton).not.toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Tab');
  await expect(codeButton).toBeFocused();
  await page.waitForTimeout(930);
  const airborne = await readWorld(page);
  expect(airborne.lod.hardware).toMatchObject({
    level: 'detail',
    visible: true,
    detail: true,
    placeholder: false,
  });
  expect(airborne.lod.dashboard.visible).toBe(true);
  expect([airborne.lod.code, airborne.lod.ranking].some(({ detail }) => !detail)).toBe(true);
  expect(airborne.position[1]).toBeGreaterThan(ISLANDS.hardware.detailPose.position[1] + 1.5);
  expect(distance(initial.position, airborne.position)).toBeGreaterThan(2);
  expect(distance(initial.quaternion, airborne.quaternion)).toBeGreaterThan(0.03);
  await page.screenshot({ path: join(output, 'traveling.png') });
  await expect(shell(page)).toHaveAttribute('data-space-phase', 'entering');
  await page.waitForFunction(() => performance.now() - window.spacePhases[0].at > 1750);
  await page.screenshot({ path: join(output, 'approaching-hardware.png') });
  await expect(shell(page)).toHaveAttribute('data-space-focus', 'hardware');
  await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
  await expect(shell(page)).toHaveAttribute('data-space-phase', 'detail');
  await expect(hardwareButton).toHaveAttribute('aria-current', 'page');
  await expect(codeButton).toBeFocused();
  await page.waitForTimeout(300);
  const landed = await readWorld(page);
  expect(landed.lod.hardware).toMatchObject({
    level: 'detail',
    visible: true,
    detail: true,
    placeholder: false,
  });
  expect(landed.lod.ranking.detail).toBe(false);
  expect(distance(landed.position, ISLANDS.hardware.detailPose.position)).toBeLessThan(0.2);
  expect(landed.dof).toEqual(ISLANDS.hardware.detailPose.focus);
  expect(landed.fov).toBe(ISLANDS.hardware.detailPose.fov);
  const phases = await page.evaluate(() => window.spacePhases);
  expect(phases.map(({ phase }) => phase)).toEqual(['entering', 'detail']);
  const hudFrames = await page.evaluate(() => window.hudFrames);
  expect(
    hudFrames.some(
      (frame) => frame.phase === 'detail' && frame.opacity > 0 && frame.opacity < 1 && frame.y > 0,
    ),
  ).toBe(true);
  const duration = phases[1].at - phases[0].at;
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

  await nav(page, '誊写房').click();
  await expect(shell(page)).toHaveAttribute('data-space-phase', 'entering');
  await page.waitForTimeout(530);
  const beforeTurn = await readWorld(page);
  await nav(page, '委托板').click();
  const afterTurn = await readWorld(page);
  expect(distance(beforeTurn.position, afterTurn.position)).toBeLessThan(5);
  await expect(shell(page)).toHaveAttribute('data-space-focus', 'ranking');
  await expect(shell(page)).toHaveAttribute('data-space-phase', 'detail');
  expect((await readWorld(page)).dof).toEqual(ISLANDS.ranking.detailPose.focus);
  await page.getByRole('button', { name: '返回大世界' }).click();
  await expect(shell(page)).toHaveAttribute('data-space-phase', 'leaving');
  await expect(page.locator('.space-hud-panel')).toHaveAttribute('inert', '');
  await expect(page.locator('.space-hud-panel')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.space-hud-panel')).toHaveCSS('pointer-events', 'none');
  await expect(shell(page)).toHaveAttribute('data-space-phase', 'idle');
  const returnFrames = (await page.evaluate(() => window.hudFrames)).slice(hudFrames.length);
  expect(
    returnFrames.some((frame) => frame.phase === 'leaving' && frame.y > 0 && frame.opacity < 1),
  ).toBe(true);
  expect(returnFrames.every((frame) => frame.overflow <= 0)).toBe(true);
  expect(
    await page
      .locator('.scene-stage canvas')
      .evaluate((node, original) => node === original, canvas),
  ).toBe(true);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(saved);
  results.push({ name: 'Mid-flight retarget, Canvas identity, and storage isolation' });
  await nav(page, '校验册').click();
  await expect(shell(page)).toHaveAttribute('data-space-phase', 'entering');
  await page
    .locator('.scene-stage canvas')
    .evaluate((node) => node.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await expect(page.locator('.render-shell')).toHaveAttribute('data-quality-tier', '0');
  await expect(shell(page)).toHaveAttribute('data-space-focus', 'dashboard');
  await expect(shell(page)).toHaveAttribute('data-space-phase', 'detail');
  await expect(page.locator('canvas')).toHaveCount(0);
  results.push({ name: 'Mid-flight context loss resolves to the destination HUD' });
  await page.close();

  for (const [tier, reduced] of [
    [3, 'reduce'],
    [1, 'no-preference'],
    [0, 'reduce'],
  ]) {
    const fallback = await open(tier, reduced);
    await fallback.evaluate(async () => {
      const { useSpaceStore } = await import('/src/features/space/spaceStore.js');
      window.usedNativeTransition = false;
      window.flightStarted = false;
      const original = document.startViewTransition.bind(document);
      document.startViewTransition = (update) => {
        window.usedNativeTransition = true;
        return original(update);
      };
      useSpaceStore.subscribe((state) => {
        if (state.phase === 'entering' || state.phase === 'leaving') window.flightStarted = true;
      });
    });
    await nav(fallback, '街坊工坊').click();
    await expect(fallback.getByRole('heading', { name: /认识它/ })).toBeVisible();
    await expect(shell(fallback)).toHaveAttribute('data-space-phase', 'detail');
    expect(await fallback.evaluate(() => window.flightStarted)).toBe(false);
    expect(await fallback.evaluate(() => window.usedNativeTransition)).toBe(false);
    if (reduced === 'reduce') {
      await expect(fallback.locator('.page-transition')).toHaveCSS('animation-name', 'none');
    }
    if (tier === 0) await expect(fallback.locator('canvas')).toHaveCount(0);
    else
      await expect
        .poll(() =>
          readWorld(fallback).then((world) =>
            distance(world.position, ISLANDS.hardware.detailPose.position),
          ),
        )
        .toBeLessThan(0.001);
    if (tier === 3) {
      await fallback.emulateMedia({ reducedMotion: 'no-preference' });
      await expect(fallback.locator('.space-hud-panel')).toBeAttached();
      await nav(fallback, '誊写房').click();
      await expect(shell(fallback)).toHaveAttribute('data-space-phase', 'entering');
      await fallback.emulateMedia({ reducedMotion: 'reduce' });
      await expect(shell(fallback)).toHaveAttribute('data-space-phase', 'detail');
      await expect(shell(fallback)).toHaveAttribute('data-space-focus', 'code');
      await expect(fallback.locator('.page-transition')).toHaveCSS('animation-name', 'none');
    }
    if (tier === 1) {
      await expect(fallback.locator('.page-transition')).toBeVisible();
      await expect(fallback.locator('.scene-stage')).toHaveAttribute('data-effects', 'none');
      await expect(fallback.locator('html')).not.toHaveAttribute('data-vt-direction', /.+/);
      await fallback.screenshot({ path: join(output, 'tier1-dom-navigation.png') });
    }
    results.push({ name: 'Jump navigation', tier, reduced });
    await fallback.close();
  }

  expect(errors).toEqual([]);
  await writeFile(join(output, 'report.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
