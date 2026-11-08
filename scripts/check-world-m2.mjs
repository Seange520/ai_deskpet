import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.env.SPARKMATE_M2_OUTPUT || 'test-results/world-m2';
await mkdir(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({
  viewport: { width: 1728, height: 1080 },
  deviceScaleFactor: 1,
  hasTouch: false,
});
const errors = [],
  results = [];
const requested = [];
p.on('request', (r) => requested.push(r.url()));
p.on('pageerror', (e) => errors.push(e.message));
await p.addInitScript(() => performance.setResourceTimingBufferSize(5000));
async function scene(fn) {
  return p.evaluate(async (s) => {
    const e = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    if(!e)return {};
    const { _roots } = await import(e.name);
    if(!_roots.get(document.querySelector('.scene-stage canvas'))) return {};
    const r = _roots.get(document.querySelector('.scene-stage canvas')).store.getState();
    return new Function('r', 'return (' + s + ')(r)')(r);
  }, fn.toString());
}
const state = () =>
  scene((r) => ({
    player: r.camera.userData.player,
    blend: r.camera.userData.fpsBlend,
    owner: r.camera.userData.cameraOwner,
    canvas: document.querySelectorAll('canvas[data-engine]').length,
    assets: r.scene.getObjectByName('p9-blender-assets')?.children.map((g) => ({
      name: g.name,
      count: g.userData.count,
      draws: g.children.filter((c) => c.isInstancedMesh).length,
    })),
    draws: r.gl.info.render.calls,
  }));
try {
  await p.goto('http://127.0.0.1:15262/?quality=3&world=p9');
  await expect.poll(async () => (await state()).assets?.length, { timeout: 60000 }).toBe(3);
  expect(requested.some((u) => /rapier|ecctrl|world\/Exploration/.test(u))).toBe(false);
  await p.getByRole('button', { name: '开始自由探索', exact: true }).click({ timeout: 60000 });
  await expect.poll(async () => (await state()).owner, { timeout: 60000 }).toBe('p9-character');
  await p.waitForTimeout(1500);
  const start = await state();
  console.log('START', start);
  expect(start.assets).toHaveLength(3);
  expect(start.player.grounded).toBe(true);
  expect(start.player.y).toBeGreaterThan(0.6);
  expect(start.player.y).toBeLessThan(0.8);
  expect(start.canvas).toBeLessThanOrEqual(2);
  const save = await p.evaluate(() => localStorage.getItem('sparkmate.routes.v2'));
  await p.screenshot({ path: out + '/m2-tps.png' });
  results.push({ name: 'Blender GLB batches, landing and TPS', state: start });
  // Real keyboard side-step on the hub to face the tablet, then V into FPS.
  await p.locator('#exploration-input').focus();
  await p.keyboard.down('KeyA');
  await p.waitForTimeout(850);
  await p.keyboard.up('KeyA');
  await p.keyboard.down('KeyS');
  await p.waitForTimeout(500);
  await p.keyboard.up('KeyS');
  await p.keyboard.press('KeyV');
  await p.waitForTimeout(1000);
  expect((await state()).player.x).toBeGreaterThan(1.8);
  await p.mouse.move(1300, 540);
  await p.mouse.down();
  await p.mouse.move(1300, 490, { steps: 8 });
  await p.mouse.up();
  await p.waitForTimeout(200);
  await p.screenshot({ path: out + '/m2-fps-tablet.png' });
  const fps = await state();
  console.log('FPS', fps);
  expect(fps.blend).toBeGreaterThan(0.99);
  // Walking into tablet's simplified box must stop at its near face.
  await p.keyboard.down('KeyW');
  await p.waitForTimeout(1000);
  await p.keyboard.up('KeyW');
  const blocked = await state();
  expect(blocked.player.z).toBeLessThan(2.3);
  results.push({ name: 'FPS and model-bound collider stops character', fps, blocked });
  await p.keyboard.press('Escape');
  await expect(p.locator('.render-shell')).toHaveAttribute('data-world-preview', 'false');
  expect(await p.evaluate(() => localStorage.getItem('sparkmate.routes.v2'))).toBe(save);
  await p.getByRole('button', { name: '预览 P9 世界骨架', exact: true }).click();
  await p.getByRole('button', { name: '学习岛全貌', exact: true }).click();
  await p.waitForTimeout(1200);
  await p.screenshot({ path: out + '/m2-island.png' });
  results.push({ name: 'Actual island view and original teaching/save restored' });
  const low = await b.newPage();
  const requests = [];
  low.on('request', (r) => requests.push(r.url()));
  await low.goto('http://127.0.0.1:15262/?quality=1&world=p9');
  await expect(low.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
  expect(requests.some((u) => /rapier|ecctrl|assets\/models|world\/Exploration/.test(u))).toBe(
    false,
  );
  await low
    .getByRole('navigation', { name: '主导航' })
    .getByRole('button', { name: '代码魔改工坊', exact: true })
    .click();
  await expect(low.getByLabel('桌宠伪代码', { exact: true })).toBeVisible();
  await low.close();
  results.push({ name: 'Tier 1 no physics or GLB requests; original workshop works' });
  const failed = await b.newPage();
  await failed.route('**/assets/models/stone_tablet.glb', (r) => r.abort());
  await failed.goto('http://127.0.0.1:15262/?quality=3&world=p9');
  await expect(failed.locator('.render-shell')).toHaveAttribute('data-quality-tier', '0');
  await expect(failed.locator('canvas')).toHaveCount(0);
  await expect(failed.getByRole('navigation', { name: '主导航' })).toBeVisible();
  await failed.close();
  results.push({ name: 'GLB failure restores zero Canvas teaching; survey loads no physics' });
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ passed: results.length, errors, results }, null, 2));
} finally {
  await writeFile(out + '/m2-checks.json', JSON.stringify({ results, errors }, null, 2));
  await b.close();
}
