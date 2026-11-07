import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.env.SPARKMATE_M1_OUTPUT || 'test-results/toon-m1';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [],
  errors = [];
async function state(page) {
  return page.evaluate(async () => {
    const e = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    const { _roots } = await import(e.name);
    const r = _roots.get(document.querySelector('.scene-stage canvas')).store.getState();
    const crystal = r.scene.getObjectByName('npr-crystal-shells'),
      core = r.scene.getObjectByName('npr-plant-lights');
    const shell = r.scene.getObjectByName('command-pet')?.getObjectByProperty('type', 'Mesh');
    let ramp;
    r.scene.getObjectByName('command-pet')?.traverse((n) => {
      if (n.material?.name === 'pet-shell') ramp = n.material.gradientMap;
    });
    const colors = ramp
      ? Array.from(ramp.image.getContext('2d').getImageData(0, 0, ramp.image.width, 1).data)
      : [];
    const fragments = r.gl.info.programs
      .map((p) => r.gl.getContext().getShaderSource(p.fragmentShader) || '')
      .join('\n');
    return {
      rgb: colors,
      ceramic: fragments.includes('float glint'),
      rgbLookup: fragments.includes('texture2D( gradientMap, coord ).rgb'),
      deckPattern: fragments.includes('radialShade'),
      shellOpacity: crystal?.material.opacity,
      depthWrite: crystal?.material.depthWrite,
      positions: crystal
        ? Array.from(crystal.instanceMatrix.array).filter((_, i) => i % 16 === 13)
        : [],
      stars: r.scene.getObjectByName('valley-stars')?.geometry.attributes.position.count,
      skyDepth: r.scene.getObjectByName('valley-moon-sky')?.material.depthWrite,
      canvases: document.querySelectorAll('canvas').length,
    };
  });
}
try {
  const page = await browser.newPage({
    viewport: { width: 1728, height: 1080 },
    reducedMotion: 'no-preference',
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('lighting-color lightingColor'))
      errors.push(m.text());
  });
  await page.goto('http://127.0.0.1:15262/?quality=3');
  await expect(page.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
  await page.waitForTimeout(900);
  const a = await state(page);
  expect(a.rgbLookup && a.ceramic && a.deckPattern).toBe(true);
  expect(a.rgb[0]).not.toBe(a.rgb[1]);
  expect(a.rgb[1]).not.toBe(a.rgb[2]);
  expect(a.shellOpacity).toBeLessThan(1);
  expect(a.depthWrite).toBe(false);
  expect(a.canvases).toBeLessThanOrEqual(2);
  results.push({
    name: 'Actual compiled RGB Toon lighting, ceramic highlight and deck pattern; transparent crystals',
    state: a,
  });
  await page.waitForTimeout(750);
  const b = await state(page);
  const motion = a.positions.map((v, i) => b.positions[i] - v);
  expect(motion.some((v) => Math.abs(v) > 0.002)).toBe(true);
  expect(Math.max(...motion) - Math.min(...motion)).toBeGreaterThan(0.002);
  results.push({
    name: 'Crystal instances float independently rather than moving as a rigid ring',
  });
  await page.evaluate(() => {
    const m = document.createElement('div');
    m.id = 'm1-pause-probe';
    m.className = 'modal-backdrop';
    document.body.append(m);
  });
  await expect(page.locator('.scene-stage')).toHaveAttribute('data-paused', 'true');
  const paused = await state(page);
  await page.waitForTimeout(350);
  expect((await state(page)).positions).toEqual(paused.positions);
  await page.evaluate(() => document.querySelector('#m1-pause-probe').remove());
  await expect(page.locator('.scene-stage')).toHaveAttribute('data-paused', 'false');
  await page.waitForTimeout(350);
  expect((await state(page)).positions).not.toEqual(paused.positions);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(300);
  const still = await state(page);
  await page.waitForTimeout(400);
  expect((await state(page)).positions).toEqual(still.positions);
  results.push({
    name: 'Modal pause/resume and reduced-motion freeze retain stable instance matrices',
  });
  expect(a.skyDepth).toBe(false);
  expect(a.stars).toBe(1400);
  if (await page.getByRole('button', { name: '返回大世界', exact: true }).count())
    await page.getByRole('button', { name: '返回大世界', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-space-phase', 'idle');
  results.push({
    name: 'Sky does not occlude the star layer; real HUB panorama is keyboard/DOM reachable',
  });
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ passed: results.length, errors }, null, 2));
} finally {
  await writeFile(out + '/m1-checks.json', JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
