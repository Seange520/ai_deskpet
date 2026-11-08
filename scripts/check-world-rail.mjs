import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.env.SPARKMATE_RAIL_OUTPUT || 'test-results/world-rail';
await mkdir(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1920, height: 1200 }, deviceScaleFactor: 1 });
const errors = [],
  shaders = [],
  samples = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => {
  if (m.type() === 'error' && /THREE.WebGLProgram|GL_INVALID|shader error/i.test(m.text()))
    shaders.push(m.text());
});
await p.addInitScript(() => performance.setResourceTimingBufferSize(5000));
async function state() {
  return p.evaluate(async () => {
    const entry = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    if (!entry) return {};
    const { _roots } = await import(entry.name),
      root = _roots.get(document.querySelector('.scene-stage canvas'));
    if (!root) return {};
    const r = root.store.getState(),
      meshes = [];
    r.scene.traverse((o) => {
      if (o.isInstancedMesh) meshes.push({ name: o.name, count: o.count });
    });
    return {
      ...r.camera.userData,
      rail: {
        oldTube: !!r.scene.getObjectByName('rail-tube'),
        coreRadius: r.scene.getObjectByName('p9-fluid-energy-rail')?.userData.coreRadius,
        flowCount: r.scene.getObjectByName('p9-flow-particles')?.geometry.attributes.position.count,
        rainCount: r.scene.getObjectByName('p9-energy-rain')?.geometry.attributes.position.count,
        windowCount: r.scene.getObjectByName('p9-window-grid')?.count,
        godrays: r.scene.getObjectByName('p9-godrays')?.children.length,
        oldTowers: !!r.scene.getObjectByName('valley-megastructures'),
        time: r.scene.getObjectByName('p9-thin-energy-filament')?.material.uniforms.time.value,
      },
      particleVisible: r.scene.getObjectByName('p7-jump-shell')?.visible,
      particleCount: r.scene.getObjectByName('p7-jump-shell')?.geometry.attributes.position.count,
      camera: r.camera.position.toArray(),
      webgl: document.querySelectorAll('canvas[data-engine]').length,
      texturedMap: !!document.querySelector('[data-textured-minimap]'),
      islands: r.scene.children.length,
      meshes,
    };
  });
}
try {
  await p.goto('http://127.0.0.1:15262/?quality=3&world=p9');
  await p.getByRole('button', { name: '开始自由探索', exact: true }).click({ timeout: 60000 });
  await expect
    .poll(async () => (await state()).cameraOwner, { timeout: 60000 })
    .toBe('p9-character');
  await p.waitForTimeout(1500);
  expect((await state()).player.grounded).toBe(true);
  // Actual keys and mouse gestures; no scene or camera overrides.
  await p.locator('#exploration-input').focus();
  await p.keyboard.down('KeyA');
  await p.waitForTimeout(850);
  await p.keyboard.up('KeyA');
  await p.keyboard.down('KeyS');
  await p.waitForTimeout(500);
  await p.keyboard.up('KeyS');
  await p.keyboard.press('KeyV');
  await p.waitForTimeout(1000);
  await p.mouse.move(1400, 600);
  await p.mouse.down();
  await p.mouse.move(1400, 550, { steps: 8 });
  await p.mouse.up();
  await p.waitForTimeout(300);
  await p.keyboard.down('KeyW');
  await p.waitForTimeout(330);
  await p.keyboard.up('KeyW');
  await p.waitForTimeout(250);
  await p.screenshot({ path: out + '/rail-fps-check.png' });
  const fps = await state();
  samples.push({ name: 'FPS tablet', state: fps });
  expect(fps.fpsBlend).toBeGreaterThan(0.99);
  await p.keyboard.press('KeyV');
  await p.waitForTimeout(750);
  await p.keyboard.press('KeyM');
  await p.getByRole('button', { name: '传送至数据瀑布', exact: true }).click();
  await expect.poll(async () => (await state()).teleport?.phase, { intervals: [10] }).toBe('dash');
  await p.waitForTimeout(150);
  const flight = await state();
  expect(flight.cameraOwner).toBe('p9-teleport');
  expect(flight.particleVisible).toBe(true);
  await p.screenshot({ path: out + '/skin-flight-mid.png' });
  samples.push({ name: 'Three-stage flight', state: flight });
  await expect
    .poll(async () => (await state()).cameraOwner, { timeout: 15000 })
    .toBe('p9-character');
  await p.waitForTimeout(500);
  expect((await state()).player.grounded).toBe(true);
  // Walk to the left island apron then orbit for a terrain and pet panorama.
  await p.locator('#exploration-input').focus();
  await p.keyboard.down('KeyA');
  await p.waitForTimeout(600);
  await p.keyboard.up('KeyA');
  await p.mouse.move(1400, 600);
  await p.mouse.down();
  await p.mouse.move(1500, 640, { steps: 12 });
  await p.mouse.up();
  await p.waitForTimeout(750);
  await p.locator('#exploration-input').focus();
  await p.keyboard.down('KeyS');
  await p.waitForTimeout(180);
  await p.screenshot({ path: out + '/rail-tps-panorama.png' });
  await p.keyboard.up('KeyS');
  const land = await state();
  samples.push({ name: 'TPS island panorama', state: land });
  expect(land.player.grounded).toBe(true);
  expect(land.rail.oldTube).toBe(false);
  expect(land.rail.oldTowers).toBe(false);
  expect(land.rail.coreRadius).toBe(0.012);
  expect(land.rail.flowCount).toBe(420);
  expect(land.rail.rainCount).toBe(96);
  expect(land.rail.windowCount).toBeGreaterThan(5000);
  expect(land.rail.godrays).toBe(4);
  expect(land.rail.time).toBeGreaterThan(1);
  expect(land.texturedMap).toBe(true);
  expect(land.webgl).toBe(2);
  expect(land.meshes.find((m) => m.name === 'p9-wind-grass-vines').count).toBeGreaterThan(1000);
  expect(errors).toEqual([]);
  expect(shaders).toEqual([]);
  console.log(JSON.stringify({ passed: 3, errors, shaders, samples }, null, 2));
} finally {
  await writeFile(out + '/rail-checks.json', JSON.stringify({ errors, shaders, samples }, null, 2));
  await b.close();
}
