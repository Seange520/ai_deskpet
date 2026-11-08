import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.env.SPARKMATE_M3_OUTPUT || 'test-results/world-m3';
await mkdir(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [],
  results = [],
  samples = [];
async function open(tier = '3', motion = 'no-preference') {
  const p = await b.newPage({
    viewport: { width: 1728, height: 1080 },
    deviceScaleFactor: 1,
    reducedMotion: motion,
  });
  p.seenRequests = [];
  p.on('request', (r) => p.seenRequests.push(r.url()));
  p.on('pageerror', (e) => {
    errors.push(e.message);
    console.log(e.message);
  });
  await p.addInitScript(() => performance.setResourceTimingBufferSize(5000));
  await p.goto('http://127.0.0.1:15262/?quality=' + tier + '&world=p9');
  return p;
}
async function state(p) {
  return p.evaluate(async () => {
    const e = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    if (!e) return {};
    const { _roots } = await import(e.name);
    const root = _roots.get(document.querySelector('.scene-stage canvas'));
    if (!root) return {};
    const r = root.store.getState();
    return {
      ...r.camera.userData,
      camera: r.camera.position.toArray(),
      fov: r.camera.fov,
      particleCount: r.scene.getObjectByName('p7-jump-shell')?.geometry.attributes.position.count,
      particleVisible: r.scene.getObjectByName('p7-jump-shell')?.visible,
      canvases: document.querySelectorAll('canvas[data-engine]').length,
    };
  });
}
let p;
try {
  p = await open();
  await p.getByRole('button', { name: '开始自由探索', exact: true }).click({ timeout: 60000 });
  await expect
    .poll(async () => (await state(p)).cameraOwner, { timeout: 60000 })
    .toBe('p9-character');
  const beforeSave = await p.evaluate(() => localStorage.getItem('sparkmate.routes.v2'));
  const canvas = await p.locator('.scene-stage canvas').elementHandle();
  await p.locator('#exploration-input').focus();
  await p.keyboard.press('KeyM');
  await expect(p.getByRole('dialog', { name: '群岛大地图' })).toBeVisible();
  await p.screenshot({ path: out + '/m3-world-map.png' });
  const freezeA = await state(p);
  await p.waitForTimeout(200);
  const freezeB = await state(p);
  expect(freezeB.player).toEqual(freezeA.player);
  await p.getByRole('button', { name: '传送至学习观测站', exact: true }).click();
  await expect.poll(async () => (await state(p)).teleport?.phase, { intervals: [10] }).toBe('dash');
  await p.waitForTimeout(180);
  const mid = await state(p);
  samples.push(mid);
  expect(mid.cameraOwner).toBe('p9-teleport');
  expect(mid.particleCount).toBe(960);
  expect(mid.particleVisible).toBe(true);
  await p.screenshot({ path: out + '/m3-flight-mid.png' });
  await expect
    .poll(async () => (await state(p)).cameraOwner, { timeout: 15000 })
    .toBe('p9-character');
  await p.waitForTimeout(400);
  const land = await state(p);
  samples.push(land);
  expect(land.player.z).toBeCloseTo(13.4, 1);
  expect(land.player.y).toBeGreaterThan(0.6);
  expect(land.player.grounded).toBe(true);
  expect(await canvas.evaluate((c) => c === document.querySelector('.scene-stage canvas'))).toBe(
    true,
  );
  expect(land.canvases).toBeLessThanOrEqual(2);
  await p.screenshot({ path: out + '/m3-minimap-ui.png' });
  results.push({
    name: 'M opens map / freezes player / TPS three-stage flight / 960 particles / correct landing / same renderer',
    mid,
    land,
  });
  await p.locator('#exploration-input').focus();
  await p.keyboard.press('KeyV');
  await p.waitForTimeout(700);
  expect((await state(p)).fpsBlend).toBeGreaterThan(0.99);
  await p.keyboard.press('KeyM');
  await p.getByRole('button', { name: '传送至硬件台地', exact: true }).click();
  await expect
    .poll(async () => (await state(p)).cameraOwner, { timeout: 15000 })
    .toBe('p9-character');
  await p.waitForTimeout(300);
  const fpsLand = await state(p);
  expect(fpsLand.player.x).toBeCloseTo(16, 1);
  expect(fpsLand.player.z).toBeCloseTo(-2.6, 1);
  expect(fpsLand.fpsBlend).toBeGreaterThan(0.99);
  results.push({ name: 'FPS flight retains mode and correct hardware landing', fpsLand });
  const marker = p.locator('.world-minimap [data-player-marker]');
  expect(await marker.getAttribute('transform')).toContain('translate(16');
  for (const [name, x, z] of [
    ['数据瀑布', 0, -18.6],
    ['中央枢纽', 0, 1.6],
  ]) {
    await p.keyboard.press('KeyM');
    const anchor = p.getByRole('button', { name: '传送至' + name, exact: true });
    await anchor.focus();
    await anchor.press('Enter');
    await expect
      .poll(async () => (await state(p)).teleport?.phase, { intervals: [10] })
      .toBe('charge');
    await expect
      .poll(async () => (await state(p)).cameraOwner, { timeout: 15000 })
      .toBe('p9-character');
    expect((await state(p)).player.x).toBeCloseTo(x, 1);
    expect((await state(p)).player.z).toBeCloseTo(z, 1);
  }
  results.push({ name: 'Keyboard Enter anchors and repeat flights to code and hub' });

  await p.keyboard.press('KeyM');
  await p.keyboard.press('Escape');
  await expect(p.getByRole('dialog', { name: '群岛大地图' })).toHaveCount(0);
  await expect(p.locator('.render-shell')).toHaveAttribute('data-world-preview', 'true');
  await p.keyboard.press('Escape');
  await expect(p.locator('.render-shell')).toHaveAttribute('data-world-preview', 'false');
  expect(await p.evaluate(() => localStorage.getItem('sparkmate.routes.v2'))).toBe(beforeSave);
  results.push({
    name: 'Minimap coordinate / Escape closes map first / teaching restores / save unchanged',
  });
  await p.close();
  for (const tier of ['1', '2', 'dom']) {
    const low = await open(tier, 'reduce');
    const req = [];
    low.on('request', (r) => req.push(r.url()));
    await low.getByRole('button', { name: '大地图 M', exact: true }).click();
    await low.getByRole('button', { name: '传送至数据瀑布', exact: true }).click();
    await expect(low.getByLabel('桌宠伪代码', { exact: true })).toBeVisible({ timeout: 15000 });
    expect([...req, ...low.seenRequests].some((u) => /rapier|ecctrl|assets\/models/.test(u))).toBe(
      false,
    );
    if (tier === 'dom') await expect(low.locator('canvas')).toHaveCount(0);
    await low.getByLabel('桌宠伪代码', { exact: true }).fill('M');
    await expect(low.getByRole('dialog', { name: '群岛大地图' })).toHaveCount(0);
    await low.close();
  }
  results.push({
    name: 'Tier 1/2/0 map native route fallback, no physics/models, form M isolated',
  });
  const reduced = await open('3', 'reduce');
  await reduced.getByRole('button', { name: '开始自由探索', exact: true }).click();
  await expect
    .poll(async () => (await state(reduced)).cameraOwner, { timeout: 60000 })
    .toBe('p9-character');
  await reduced.locator('#exploration-input').focus();
  await reduced.keyboard.press('KeyM');
  await reduced.getByRole('button', { name: '传送至排位尖塔', exact: true }).click();
  await expect.poll(async () => (await state(reduced)).player?.x).toBeCloseTo(-16, 1);
  await expect.poll(async () => (await state(reduced)).cameraOwner).toBe('p9-character');
  await reduced.close();
  results.push({ name: 'Reduced motion arrives directly without flight' });
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ passed: results.length, results, errors }, null, 2));
} finally {
  await writeFile(out + '/m3-checks.json', JSON.stringify({ results, samples, errors }, null, 2));
  await b.close();
}
