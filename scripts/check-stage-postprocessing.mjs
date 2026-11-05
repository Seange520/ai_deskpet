import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const url = process.env.SPARKMATE_STAGE_URL;
if (!url) throw new Error('Set SPARKMATE_STAGE_URL to a checked normal development server.');
const out = 'test-results/stage-p1';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
async function read(page, operation = 'read') {
  return page.evaluate(async (operation) => {
    const entry = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    if (!entry) return null;
    const { _roots } = await import(entry.name);
    const s = _roots.get(document.querySelector('.scene-stage canvas'))?.store.getState();
    if (!s) return null;
    const effects = [];
    s.scene.traverse((o) => {
      for (const e of o.__r3f?.objects || []) if (e.getBlendMode) effects.push(e);
    });
    const bloom = effects.find((e) => e.name === 'BloomEffect');
    if (operation === 'no-bloom') {
      bloom.intensity = 0;
      s.invalidate();
    }
    if (operation === 'bloom') {
      bloom.intensity = 0.9;
      s.invalidate();
    }
    return {
      effects: effects.map((e) => e.name),
      camera: s.camera.position.toArray(),
      toneMapping: s.gl.toneMapping,
      count:
        s.scene.getObjectByName('stage-gpu-particles')?.geometry.attributes.position.count || 0,
      aurora: Boolean(s.scene.getObjectByName('stage-aurora')),
      dpr: s.gl.getPixelRatio(),
      bloom: bloom?.intensity,
      geometries: s.gl.info.memory.geometries,
      textures: s.gl.info.memory.textures,
      time: s.scene.getObjectByName('stage-aurora')?.material.uniforms.time.value,
    };
  }, operation);
}
async function check(name, fn, options = {}) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
    reducedMotion: 'reduce',
    ...options,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    const text = m.text();
    const known =
      text.startsWith('Warning: Invalid DOM property') &&
      text.includes('lighting-color lightingColor') &&
      text.includes('@khvicha_react-liquid-glass');
    if (m.type() === 'error' && !known) errors.push(text);
  });
  try {
    await fn(page);
    expect(errors).toEqual([]);
    results.push({ name, passed: true });
    console.log('PASS', name);
  } finally {
    await page.close();
  }
}
try {
  for (const tier of [3, 2, 1, 0])
    await check('Tier ' + tier + ' actual effect graph and screenshot', async (page) => {
      await page.goto(url + '/?quality=' + tier);
      await expect(page.locator('.render-shell')).toHaveAttribute(
        'data-quality-tier',
        String(tier),
      );
      if (tier === 0) {
        await expect(page.locator('canvas')).toHaveCount(0);
      } else {
        await expect(page.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
        await expect
          .poll(() => read(page).then((s) => s?.effects.length))
          .toBe(tier >= 2 ? (tier === 3 ? 5 : 4) : 0);
        const s = await read(page);
        expect(s.effects).toEqual(
          tier >= 2
            ? [
                'BloomEffect',
                'ToneMappingEffect',
                'VignetteEffect',
                'FXAAEffect',
                ...(tier === 3 ? ['DepthOfFieldEffect'] : []),
              ]
            : [],
        );
        expect(s.count).toBe(tier >= 2 ? 12 : 0);
        expect(s.aurora).toBe(tier >= 2);
        if (tier >= 2) {
          expect(s.toneMapping).toBe(0);
          expect(s.bloom).toBe(0.9);
        }
      }
      if (tier !== 1) {
        // Real teaching runner lights the eyes; it awards no XP or lesson completion.
        await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
        await page.getByLabel('桌宠伪代码', { exact: true }).fill('move("stop"); light("on");');
        await page.getByRole('button', { name: '运行代码', exact: true }).click();
        await page.getByRole('button', { name: '学习仪表盘', exact: true }).click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: out + '/tier' + tier + '.png' });
      if (tier === 0) await page.locator('.hero-art').screenshot({ path: out + '/tier0-stage.png' });
        if (tier >= 2)
          await page
            .locator('.scene-window')
            .screenshot({ path: out + '/tier' + tier + '-stage.png' });
        if (tier === 2) {
          await read(page, 'no-bloom');
          await page.waitForTimeout(120);
          await page.locator('.scene-window').screenshot({ path: out + '/tier2-no-bloom.png' });
          await read(page, 'bloom');
        }
      }
    });
  await check(
    'Reduced motion is static; repeated navigation retains Canvas and storage',
    async (page) => {
      await page.goto(url + '/?quality=2');
      await expect.poll(() => read(page).then((s) => s?.effects.length)).toBe(4);
      const before = await page.evaluate(() => JSON.stringify(localStorage));
      const camera = (await read(page)).camera;
      const time = (await read(page)).time;
      await page.mouse.move(1370, 420);
      await page.waitForTimeout(400);
      expect((await read(page)).camera).toEqual(camera);
      expect((await read(page)).time).toBe(time);
      const canvas = await page.locator('.scene-stage canvas').elementHandle();
      for (let i = 0; i < 4; i++) {
        await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
        await page.getByRole('button', { name: '学习仪表盘', exact: true }).click();
      }
      expect(
        await page.locator('.scene-stage canvas').evaluate((node, old) => node === old, canvas),
      ).toBe(true);
      expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before);
      await page
        .locator('.scene-stage canvas')
        .evaluate((node) =>
          node.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext(),
        );
      await expect(page.locator('.render-shell')).toHaveAttribute('data-quality-tier', '0');
      await expect(page.locator('canvas')).toHaveCount(0);
    },
  );
  await check(
    'HUD pointer parallax, particles and Aurora animate; modal pauses Stage',
    async (page) => {
      await page.goto(url + '/?quality=2');
      await expect.poll(() => read(page).then((s) => s?.effects.length)).toBe(4);
      const before = await read(page);
      await page.mouse.move(1360, 430);
      await expect.poll(() => read(page).then((s) => s?.camera[0])).toBeGreaterThan(4.02);
      expect((await read(page)).time).toBeGreaterThan(before.time);
      await page.getByRole('article').first().getByRole('button').click();
      await expect(page.locator('.scene-stage')).toHaveAttribute('data-paused', 'true');
    },
    { reducedMotion: 'no-preference' },
  );
  await check('Live Tier 2/3 changes release retired resources and retain Canvas', async (page) => {
    await page.goto(url + '/?quality=2');
    await expect.poll(() => read(page).then((s) => s?.effects.length)).toBe(4);
    const canvas = await page.locator('.scene-stage canvas').elementHandle();
    const before = await read(page);
    for (const tier of [3, 2, 3, 2, 3, 2, 3, 2]) {
      await page.evaluate((tier) => {
        history.pushState({}, '', '?quality=' + tier);
        dispatchEvent(new PopStateEvent('popstate'));
      }, tier);
      await expect.poll(() => read(page).then((s) => s?.effects.length)).toBe(tier === 3 ? 5 : 4);
    }
    const after = await read(page);
    expect(after.textures).toBeLessThanOrEqual(before.textures + 2);
    expect(after.geometries).toBeLessThanOrEqual(before.geometries + 2);
    expect(
      await page.locator('.scene-stage canvas').evaluate((node, old) => node === old, canvas),
    ).toBe(true);
    await page.evaluate(() => {
      history.pushState({}, '', '?quality=1');
      dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect.poll(() => read(page).then((s) => s?.effects.length)).toBe(0);
    await expect.poll(() => read(page).then((s) => s?.toneMapping)).toBe(4);
  });
  await writeFile(out + '/report.json', JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
