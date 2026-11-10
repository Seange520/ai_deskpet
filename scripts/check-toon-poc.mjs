import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';
const url = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = process.env.SPARKMATE_TOON_OUTPUT || 'test-results/toon-poc';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [],
  errors = [];
const nav = (p, name) =>
  p.getByRole('navigation', { name: '主导航' }).getByRole('button', { name, exact: true });
async function open(tier, motion = 'reduce') {
  const p = await browser.newPage({
    viewport: { width: 1728, height: 1080 },
    deviceScaleFactor: 1,
    reducedMotion: motion,
  });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('lighting-color lightingColor'))
      errors.push(m.text());
  });
  await p.goto(url + '/?quality=' + tier);
  if (tier !== 'dom') {
    await expect(p.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
    await expect.poll(() => read(p).then((s) => s?.pet?.length)).toBe(10);
  }
  return p;
}
async function read(p) {
  return p.evaluate(async () => {
    const entry = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    if (!entry) return null;
    const { _roots } = await import(entry.name);
    const r = _roots.get(document.querySelector('.scene-stage canvas'))?.store.getState();
    if (!r) return null;
    const effects = [];
    r.scene.traverse((n) => {
      for (const e of n.__r3f?.objects || [])
        if (e.selection && !effects.includes(e)) effects.push(e);
    });
    const pet = [];
    r.scene.getObjectByName('command-pet')?.traverse((n) => {
      if (n.isMesh)
        pet.push({
          type: n.material.type,
          name: n.material.name,
          ramp: n.material.gradientMap?.image.width,
          nearest: n.material.gradientMap?.minFilter,
          emission: n.material.emissiveIntensity,
          screen: n.material.map?.isCanvasTexture,
        });
    });
    const deck = r.scene
      .getObjectByName('space-island-dashboard')
      ?.getObjectByName('island-deck-surface');
    return {
      pet,
      deck: deck?.material.type,
      cloud: !!r.scene.getObjectByName('npr-tier3-volume-cloud'),
      plants: r.scene.getObjectByName('npr-plant-lights')?.count,
      effects: effects.map((e) => ({ name: e.name, count: e.selection.size })),
      camera: r.camera.position.toArray(),
      memory: r.gl.info.memory,
      canvases: document.querySelectorAll('canvas').length,
    };
  });
}
async function shot(p, name, scene = false) {
  let style;
  if (scene)
    style = await p.addStyleTag({
      content:
        '.app-shell,.companion-container,.space-dock,.deskpet3d-shell {visibility:hidden!important}',
    });
  await p.screenshot({ path: join(out, name + '.png') });
  await style?.evaluate((el) => el.remove());
}
const pageDelay = (p) => p.waitForTimeout(500);
async function pixelProof(page, effectName) {
  const style = await page.addStyleTag({ content: '.app-shell {visibility:hidden!important}' });
  const before = await page.screenshot();
  const found = await page.evaluate(async (effectName) => {
    const entry = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    const { _roots } = await import(entry.name);
    const root = _roots.get(document.querySelector('.scene-stage canvas')).store.getState();
    let found = false;
    root.scene.traverse((n) => {
      for (const e of n.__r3f?.objects || [])
        if (e.name === effectName) {
          e.blendMode.opacity.value = 0;
          found = true;
        }
    });
    root.invalidate();
    return found;
  }, effectName);
  expect(found).toBe(true);
  await page.waitForTimeout(200);
  const after = await page.screenshot();
  const difference = await page.evaluate(
    async ([a, b]) => {
      async function pixels(data) {
        const image = new Image();
        image.src = data;
        await image.decode();
        const c = document.createElement('canvas');
        c.width = image.width;
        c.height = image.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(image, 0, 0);
        return ctx.getImageData(0, 0, c.width, c.height).data;
      }
      const x = await pixels(a),
        y = await pixels(b);
      let total = 0;
      for (let i = 0; i < x.length; i++) if (i % 4 !== 3) total += Math.abs(x[i] - y[i]);
      return total / (x.length * 0.75);
    },
    [
      'data:image/png;base64,' + before.toString('base64'),
      'data:image/png;base64,' + after.toString('base64'),
    ],
  );
  await page.evaluate(async (effectName) => {
    const entry = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    const { _roots } = await import(entry.name);
    const root = _roots.get(document.querySelector('.scene-stage canvas')).store.getState();
    root.scene.traverse((n) => {
      for (const e of n.__r3f?.objects || [])
        if (e.name === effectName) e.blendMode.opacity.value = 1;
    });
    root.invalidate();
  }, effectName);
  await style.evaluate((el) => el.remove());
  await page.waitForTimeout(200);
  expect(difference).toBeGreaterThan(0.01);
  results.push({
    name: effectName + ' changes final pixels when enabled',
    meanAbsoluteRgbDifference: difference,
  });
}
try {
  const p = await open(3);
  await expect
    .poll(() =>
      read(p).then((s) => s.effects.some((e) => e.name === 'OutlineEffect' && e.count > 0)),
    )
    .toBe(true);
  await nav(p, '校验册').click();
  await expect(p.locator('.app-shell')).toHaveAttribute('data-space-phase', 'detail');
  let s = await read(p);
  expect(
    s.pet.every((m) => m.type === 'MeshToonMaterial' && m.ramp === 4 && m.nearest === 1003),
  ).toBe(true);
  expect(s.pet.find((m) => m.name === 'pet-screen').screen).toBe(true);
  expect(s.deck).toBe('MeshToonMaterial');
  expect(s.cloud).toBe(true);
  expect(s.plants).toBe(28);
  expect(s.canvases).toBeLessThanOrEqual(2);
  await pixelProof(p, 'NprDepthOutline');
  await shot(p, 'toon-dashboard-ui');
  await shot(p, 'toon-dashboard', true);
  results.push({
    name: 'Tier 3 Toon/ramp/CanvasTexture/Outline/volume cloud/two renderer limit',
    state: s,
  });
  const saved = await p.evaluate(() => localStorage.getItem('sparkmate.routes.v2'));
  const canvas = await p.locator('.scene-stage canvas').elementHandle();
  for (const name of ['街坊工坊', '誊写房', '委托板', '校验册']) {
    await nav(p, name).click();
    await expect(p.locator('.app-shell')).toHaveAttribute('data-space-phase', 'detail');
    expect(
      await canvas.evaluate((el) => el === document.querySelector('.scene-stage canvas')),
    ).toBe(true);
  }
  expect(await p.evaluate(() => localStorage.getItem('sparkmate.routes.v2'))).toBe(saved);
  results.push({ name: 'Four-island navigation and canvas identity; learning save unchanged' });
  await nav(p, '誊写房').click();
  await p.getByLabel('桌宠伪代码', { exact: true }).fill('move("stop"); light("on");');
  await p.getByRole('button', { name: '运行代码', exact: true }).click();
  await nav(p, '校验册').click();
  await expect
    .poll(() =>
      read(p).then((s) => s.pet.filter((m) => m.name === 'command-eye').map((m) => m.emission)),
    )
    .toEqual([2.2, 2.2]);
  await pixelProof(p, 'BloomEffect');
  await shot(p, 'toon-led-on', true);
  results.push({
    name: 'Real CodeRunner LED feeds Toon eyes and selected bloom',
    state: await read(p),
  });
  await p.getByRole('button', { name: '返回大世界', exact: true }).click();
  await expect(p.locator('.app-shell')).toHaveAttribute('data-space-phase', 'idle');
  await pageDelay(p);
  await shot(p, 'toon-world-ui');
  await shot(p, 'toon-world', true);

  await p.evaluate(() => {
    history.replaceState(null, '', '/?quality=2');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(p.locator('.render-shell')).toHaveAttribute('data-quality-tier', '2');
  await expect.poll(() => read(p).then((s) => s.cloud)).toBe(false);
  expect((await read(p)).effects.some((e) => e.name === 'OutlineEffect')).toBe(true);
  await p.evaluate(() => {
    history.replaceState(null, '', '/?quality=1');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(p.locator('.render-shell')).toHaveAttribute('data-quality-tier', '1');
  await expect.poll(() => read(p).then((s) => s.effects.length)).toBe(0);
  s = await read(p);
  expect(s.cloud).toBe(false);
  expect(s.pet.every((m) => m.ramp === 3)).toBe(true);
  expect(s.canvases).toBeLessThanOrEqual(2);
  await shot(p, 'toon-tier1');
  results.push({
    name: 'Live Tier 3 to 2 to 1: clouds/outline removed, three-band fallback',
    state: s,
  });
  await p.evaluate(() => {
    history.replaceState(null, '', '/?quality=3');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(p.locator('.render-shell')).toHaveAttribute('data-quality-tier', '3');
  await expect.poll(() => read(p).then((s) => s.cloud)).toBe(true);
  await p.evaluate(async () => {
    const e = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    const { _roots } = await import(e.name);
    _roots
      .get(document.querySelector('.scene-stage canvas'))
      .store.getState()
      .gl.getContext()
      .getExtension('WEBGL_lose_context')
      .loseContext();
  });
  await expect(p.locator('canvas')).toHaveCount(0);
  await nav(p, '街坊工坊').click();
  await expect(p.getByRole('button', { name: '拆解', exact: true })).toBeVisible();
  results.push({ name: 'Real WebGL context loss falls back to functional zero-canvas DOM' });
  await p.close();
  const dom = await open('dom');
  await expect(dom.locator('canvas')).toHaveCount(0);
  await nav(dom, '誊写房').click();
  await expect(dom.getByLabel('桌宠伪代码', { exact: true })).toBeVisible();
  await shot(dom, 'toon-dom');
  results.push({ name: 'Explicit quality=dom: zero canvas and working code workshop' });
  await dom.close();
  const flight = await open(3, 'no-preference');
  await nav(flight, '校验册').click();
  await expect(flight.locator('.app-shell')).toHaveAttribute('data-space-phase', 'detail', {
    timeout: 15000,
  });
  const start = (await read(flight)).camera;
  await flight.getByRole('button', { name: '返回大世界', exact: true }).click();
  await expect(flight.locator('.app-shell')).toHaveAttribute('data-space-phase', 'leaving');
  await flight.waitForTimeout(350);
  const middle = (await read(flight)).camera;
  expect(Math.hypot(...start.map((v, i) => v - middle[i]))).toBeGreaterThan(0.02);
  await expect(flight.locator('.app-shell')).toHaveAttribute('data-space-phase', 'idle', {
    timeout: 15000,
  });
  await nav(flight, '街坊工坊').click();
  await flight.waitForTimeout(200);
  await nav(flight, '誊写房').click();
  await expect(flight.locator('.app-shell')).toHaveAttribute('data-space-phase', 'detail', {
    timeout: 15000,
  });
  await expect(flight.getByLabel('桌宠伪代码', { exact: true })).toBeVisible();
  results.push({
    name: 'Animated camera flight and rapid redirection finish on latest destination',
  });
  await flight.close();
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ passed: results.length, results, errors }, null, 2));
} finally {
  await writeFile(join(out, 'toon-poc-results.json'), JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
