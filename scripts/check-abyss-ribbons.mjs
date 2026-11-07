import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.env.SPARKMATE_M2_OUTPUT || 'test-results/toon-m2';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const p = await browser.newPage({
  viewport: { width: 1728, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
const errors = [],
  results = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('lighting-color lightingColor'))
    errors.push(m.text());
});
async function scene(fn, arg) {
  return p.evaluate(
    async ({ source, arg }) => {
      const e = performance
        .getEntriesByType('resource')
        .find((r) => r.name.includes('/@react-three_fiber.js'));
      const { _roots } = await import(e.name);
      const r = _roots.get(document.querySelector('.scene-stage canvas')).store.getState();
      return new Function('r', 'arg', `return (${source})(r,arg)`)(r, arg);
    },
    { source: fn.toString(), arg },
  );
}
const state = () =>
  scene((r) => {
    const g = r.scene.getObjectByName('npr-abyss-ribbons');
    return {
      bands: g?.children.length || 0,
      times: g?.children.map((m) => m.material.uniforms.time.value) || [],
      transparent: g?.children.every((m) => m.material.transparent && !m.material.depthWrite),
      canvas: document.querySelectorAll('canvas').length,
      camera: r.camera.position.toArray(),
      fov: r.camera.fov,
    };
  });
try {
  await p.goto((process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262') + '/?quality=3');
  await expect(p.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
  await p.evaluate(async () => {
    const { useEnvironmentStore } =
      await import('/src/features/environment/useEnvironmentStore.js');
    useEnvironmentStore.getState().setMode('day');
  });
  await p.getByRole('button', { name: '返回大世界', exact: true }).click();
  await expect(p.locator('.app-shell')).toHaveAttribute('data-space-phase', 'idle');
  await p.waitForTimeout(1000);
  const initial = await state();
  expect(initial.bands).toBe(3);
  expect(initial.transparent).toBe(true);
  expect(initial.canvas).toBeLessThanOrEqual(2);
  expect(initial.camera).toEqual([23, 21, 29]);
  expect(initial.fov).toBe(56);
  await p.screenshot({ path: out + '/beta-world-ui.png' });
  const style = await p.addStyleTag({
    content:
      '.app-shell,.companion-container,.space-dock,.deskpet3d-shell {visibility:hidden!important}',
  });
  const on = await p.screenshot({ path: out + '/beta-world.png' });
  await scene((r) => {
    r.scene.getObjectByName('npr-abyss-ribbons').visible = false;
    r.invalidate();
  });
  await p.waitForTimeout(200);
  const off = await p.screenshot({ path: out + '/beta-world-no-ribbons.png' });
  const diff = await p.evaluate(
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
      let d = 0;
      for (let i = 0; i < x.length; i++) if (i % 4 !== 3) d += Math.abs(x[i] - y[i]);
      return d / (x.length * 0.75);
    },
    [
      'data:image/png;base64,' + on.toString('base64'),
      'data:image/png;base64,' + off.toString('base64'),
    ],
  );
  expect(diff).toBeGreaterThan(0.1);
  await scene((r) => {
    r.scene.getObjectByName('npr-abyss-ribbons').visible = true;
    r.invalidate();
  });
  await style.evaluate((e) => e.remove());
  results.push({
    name: 'Three translucent bands visibly fill actual HUB pixels with same camera',
    initial,
    meanAbsoluteRgbDifference: diff,
  });
  await p.emulateMedia({ reducedMotion: 'no-preference' });
  await p.waitForTimeout(300);
  const a = await state();
  await p.waitForTimeout(250);
  expect((await state()).times[0]).toBeGreaterThan(a.times[0]);
  await p.evaluate(() => {
    const el = document.createElement('div');
    el.className = 'modal-backdrop';
    el.id = 'abyss-modal';
    document.body.append(el);
  });
  await expect(p.locator('.scene-stage')).toHaveAttribute('data-paused', 'true');
  const frozen = await state();
  await p.waitForTimeout(250);
  expect((await state()).times).toEqual(frozen.times);
  await p.evaluate(() => document.querySelector('#abyss-modal').remove());
  await expect(p.locator('.scene-stage')).toHaveAttribute('data-paused', 'false');
  await p.waitForTimeout(250);
  expect((await state()).times[0]).toBeGreaterThan(frozen.times[0]);
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.waitForTimeout(200);
  const reduced = await state();
  await p.waitForTimeout(250);
  expect((await state()).times).toEqual(reduced.times);
  results.push({ name: 'Slow flow, modal pause/resume and reduced-motion freeze' });
  for (const tier of [2, 1, 3, 1]) {
    await p.evaluate((t) => {
      history.replaceState(null, '', '/?quality=' + t);
      dispatchEvent(new PopStateEvent('popstate'));
    }, tier);
    await expect(p.locator('.render-shell')).toHaveAttribute('data-quality-tier', String(tier));
    await expect.poll(() => state().then((s) => s.bands)).toBe(tier >= 2 ? 3 : 0);
  }
  results.push({ name: 'Live 3/2/1 tier changes remove and restore all three bands' });
  await p.goto((process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262') + '/?quality=dom');
  await expect(p.locator('canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
  results.push({ name: 'Tier 0 zero Canvas and no new browser errors' });
  console.log(JSON.stringify({ passed: results.length, results, errors }, null, 2));
} finally {
  await writeFile(out + '/abyss-checks.json', JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
