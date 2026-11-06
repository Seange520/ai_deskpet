import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { LANDMARKS } from '../src/features/space/world.js';

const url = process.env.SPARKMATE_SPACE_URL;
if (!url) throw new Error('Set SPARKMATE_SPACE_URL to the normal development server');
const out = process.env.SPARKMATE_SPACE_OUTPUT || 'test-results/space-p4';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
const shell = (page) => page.locator('.app-shell');
const stage = (page) => page.locator('.scene-stage');
const hub = (page) => page.getByRole('button', { name: '返回大世界', exact: true });
const dashboard = (page) => page.getByRole('button', { name: '学习仪表盘', exact: true });

async function read(page, trackDepth = false) {
  return page.evaluate(async (trackDepth) => {
    const entry = performance
      .getEntriesByType('resource')
      .find((resource) => resource.name.includes('/@react-three_fiber.js'));
    if (!entry) return null;
    const { _roots } = await import(entry.name);
    const state = _roots.get(document.querySelector('.scene-stage canvas'))?.store.getState();
    if (!state) return null;
    const { scene, camera, gl } = state;
    const pet = scene.getObjectByName('space-travel-pet');
    const hubRing = scene.getObjectByName('hub-outline');
    const rail = scene.getObjectByName('rail-tube');
    const beads = scene.getObjectByName('rail-beads');
    const fog = scene.getObjectByName('space-travel-mist');
    const dial = scene.getObjectByName('hub-dial');
    const depth = fog?.children[0]?.material.uniforms.sceneDepth.value;
    if (trackDepth) window.flightDepth = depth;
    const labels = [];
    scene.traverse((node) => {
      if (node.name === 'space-world-label')
        labels.push(node.isSprite && node.material.map.isCanvasTexture);
    });
    const petPosition = pet?.getWorldPosition(camera.position.clone());
    return {
      ring: hubRing?.material.type,
      ringGeometry: hubRing?.geometry.type,
      dial: dial?.material.uniforms.ticks.value.isCanvasTexture,
      rotation: dial?.rotation.z,
      rail: rail?.material.type,
      closed: rail?.geometry.parameters.closed,
      beads: beads?.count || 0,
      beadPosition: beads ? Array.from(beads.instanceMatrix.array.slice(12, 15)) : null,
      fog: fog?.children.length || 0,
      fogAlpha: fog?.children[0]?.material.uniforms.travelAlpha.value || 0,
      depthAllocated: Boolean(depth && gl.properties.has(depth)),
      retiredDepthAllocated: Boolean(window.flightDepth && gl.properties.has(window.flightDepth)),
      pet: pet && {
        uuid: pet.getObjectByName('command-pet')?.uuid,
        motion: pet.userData.motion,
        position: petPosition.toArray(),
        cameraLocal: camera.worldToLocal(petPosition.clone()).toArray(),
      },
      camera: camera.position.toArray(),
      labels,
    };
  }, trackDepth);
}

async function check(name, run, motion = 'reduce') {
  const page = await browser.newPage({
    viewport: { width: 1728, height: 1080 },
    reducedMotion: motion,
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /WebGLProgram|WebGLRenderer|context lost/i.test(message.text())
    )
      errors.push(message.text());
  });
  try {
    results.push({ name, ...(await run(page)) });
    expect(errors).toEqual([]);
    console.log('PASS', name);
  } finally {
    await page.close();
  }
}

async function open(page, tier) {
  await page.goto(url + '/?quality=' + tier);
  await expect(page.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
  await expect.poll(async () => (await read(page))?.pet?.uuid).toBeTruthy();
}

try {
  await check(
    'Tier 3 hologram, moving beads, depth fog, and continuous pet escort to HUB',
    async (page) => {
      await open(page, 3);
      await dashboard(page).click();
      await expect(shell(page)).toHaveAttribute('data-space-phase', 'detail');
      await expect.poll(async () => (await read(page)).pet.motion).toBe('docked');
      const initial = await read(page);
      expect(initial).toMatchObject({
        ring: 'ShaderMaterial',
        ringGeometry: 'TorusGeometry',
        dial: true,
        rail: 'ShaderMaterial',
        closed: true,
        beads: 60,
        fog: 0,
      });
      expect(initial.labels.length).toBeGreaterThan(1);
      expect(initial.labels.every(Boolean)).toBe(true);
      const canvas = await stage(page).locator('canvas').elementHandle();
      const saved = await page.evaluate(() => JSON.stringify(localStorage));
      await hub(page).click();
      await expect(shell(page)).toHaveAttribute('data-space-phase', 'leaving');
      await expect.poll(async () => (await read(page)).fogAlpha).toBeGreaterThan(0.8);
      await page.waitForTimeout(420);
      const airborne = await read(page, true);
      expect(airborne).toMatchObject({
        fog: 3,
        depthAllocated: true,
        pet: { motion: 'escort', uuid: initial.pet.uuid },
      });
      expect(airborne.pet.cameraLocal[0]).toBeGreaterThan(0.5);
      expect(airborne.pet.cameraLocal[1]).toBeLessThan(-0.2);
      expect(airborne.pet.cameraLocal[2]).toBeLessThan(-3);
      expect(airborne.beadPosition).not.toEqual(initial.beadPosition);
      expect(airborne.rotation).not.toBe(initial.rotation);
      await page.screenshot({ path: join(out, 'tier3-fog-flight.png') });
      await expect(shell(page)).toHaveAttribute('data-space-focus', 'hub');
      await expect(page.locator('.space-dock')).toHaveAttribute('data-projected', 'true');
      await expect.poll(async () => (await read(page)).pet.motion).toBe('landing');
      const touchdown = await read(page);
      expect(touchdown.pet.position[1]).toBeGreaterThan(1.4);
      await expect.poll(async () => (await read(page)).pet.motion).toBe('docked');
      await expect.poll(async () => (await read(page)).retiredDepthAllocated).toBe(false);
      const arrived = await read(page);
      expect(arrived).toMatchObject({ fog: 0, pet: { uuid: initial.pet.uuid, motion: 'docked' } });
      expect(arrived.pet.position[1]).toBeCloseTo(1.4, 5);
      expect(Math.hypot(arrived.pet.position[0], arrived.pet.position[2])).toBeLessThan(4);
      expect(
        await stage(page)
          .locator('canvas')
          .evaluate((node, old) => node === old, canvas),
      ).toBe(true);
      expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(saved);
      await page.screenshot({ path: join(out, 'tier3-hub-arrival.png') });
      return { initial, airborne, touchdown, arrived };
    },
    'no-preference',
  );

  await check('Tier 2 has emissive rail and two flight fog cards', async (page) => {
    await open(page, 2);
    expect(await read(page)).toMatchObject({
      ring: 'MeshBasicMaterial',
      rail: 'MeshStandardMaterial',
      beads: 60,
      fog: 0,
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(shell(page)).toHaveAttribute('data-space-phase', 'idle');
    await dashboard(page).click();
    await expect(shell(page)).toHaveAttribute('data-space-phase', 'detail');
    await hub(page).click();
    await expect(shell(page)).toHaveAttribute('data-space-phase', 'leaving');
    await expect.poll(async () => (await read(page)).fog).toBe(2);
    await expect(shell(page)).toHaveAttribute('data-space-focus', 'hub');
    await expect.poll(async () => (await read(page)).fog).toBe(0);
  });

  await check(
    'Tier 1 and reduced motion use jump navigation; Tier 0 retains a DOM map',
    async (page) => {
      await open(page, 3);
      const before = await read(page);
      await hub(page).click();
      await expect(shell(page)).toHaveAttribute('data-space-focus', 'hub');
      await expect(shell(page)).toHaveAttribute('data-space-phase', 'idle');
      await expect.poll(async () => (await read(page)).pet.motion).toBe('docked');
      const reduced = await read(page);
      expect(reduced).toMatchObject({ fog: 0, pet: { uuid: before.pet.uuid } });
      expect(reduced.camera).toEqual(LANDMARKS.hub.camera.position);
      expect(reduced.beadPosition).toEqual(before.beadPosition);
      await open(page, 1);
      await hub(page).click();
      await expect(shell(page)).toHaveAttribute('data-space-focus', 'hub');
      await expect(shell(page)).toHaveAttribute('data-space-phase', 'idle');
      expect(await read(page)).toMatchObject({
        ring: 'MeshBasicMaterial',
        rail: 'MeshBasicMaterial',
        beads: 0,
        fog: 0,
      });
      await page.screenshot({ path: join(out, 'tier1-hub.png') });
      await page.goto(url + '/?quality=dom');
      await hub(page).click();
      await expect(page.getByRole('heading', { name: '中央枢纽' })).toBeVisible();
      await expect(page.locator('.hub-map')).toBeVisible();
      await expect(page.locator('canvas')).toHaveCount(0);
    },
  );

  await writeFile(join(out, 'p4-checks.json'), JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
