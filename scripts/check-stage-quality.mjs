import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const url = process.env.SPARKMATE_STAGE_URL;
if (!url) throw new Error('Set SPARKMATE_STAGE_URL to a checked, independent normal server.');
await mkdir('test-results/stage-p0', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
async function inspect(page, selector = '.scene-stage canvas') {
  return page.evaluate(async (selector) => {
    const source = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'))?.name;
    if (!source) return null;
    const { _roots } = await import(source);
    const state = _roots.get(document.querySelector(selector))?.store.getState();
    if (!state) return null;
    const shell = state.scene.getObjectByName('command-head');
    let material;
    shell?.traverse((o) => {
      if (o.material?.name === 'pet-shell') material = o.material;
    });
    return {
      frames: state.gl.info.render.frame,
      triangles: state.gl.info.render.triangles,
      dpr: state.gl.getPixelRatio(),
      environment: Boolean(state.scene.environment),
      material: material && { type: material.type, clearcoat: material.clearcoat },
    };
  }, selector);
}
async function run(name, fn, options = {}) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
    reducedMotion: 'reduce',
    ...options,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (
      m.type() === 'error' &&
      !(
        m.text().startsWith('Warning: Invalid DOM property') &&
        m.text().includes('lighting-color lightingColor') &&
        m.text().includes('@khvicha_react-liquid-glass')
      )
    )
      errors.push(m.text());
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
  await run(
    'Tier 2 geometry, environment, DPR, persistent Stage and untouched storage',
    async (page) => {
      await page.goto(url + '/?quality=2');
      await expect(page.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
      await expect.poll(async () => (await inspect(page))?.triangles).toBeGreaterThan(0);
      await expect
        .poll(async () => (await inspect(page, '.companion canvas'))?.material?.clearcoat)
        .toBe(1);
      expect((await inspect(page, '.companion canvas')).environment).toBe(true);
      expect((await inspect(page)).dpr).toBeLessThanOrEqual(1.25);
      const before = await page.evaluate(() => JSON.stringify(localStorage));
      const canvas = await page.locator('.scene-stage canvas').elementHandle();
      await page.screenshot({ path: 'test-results/stage-p0/desktop-tier2.png' });
      for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: '街坊工坊', exact: true }).click();
        await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
        await page.getByRole('button', { name: '校验册', exact: true }).click();
      }
      expect(
        await page.locator('.scene-stage canvas').evaluate((node, old) => node === old, canvas),
      ).toBe(true);
      expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before);
    },
  );
  await run(
    'Modal and hidden Stage pause, scrolling keeps full-screen Stage active, focus reuses Canvas',
    async (page) => {
      await page.goto(url + '/?quality=2');
      await expect(page.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
      await expect(page.locator('.scene-stage')).toHaveAttribute('data-paused', 'false');
      await page.getByRole('article').first().getByRole('button').click();
      await expect(page.locator('.scene-stage')).toHaveAttribute('data-paused', 'true');
      await page.getByRole('button', { name: '关闭弹窗', exact: true }).click();
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(page.locator('.scene-stage')).toHaveAttribute('data-paused', 'false');
      const companion = await page.locator('.pet-canvas-host canvas').elementHandle();
      await page.getByTestId('deskpet-focus-button').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('.scene-stage')).toHaveAttribute('data-paused', 'true');
      expect(
        await page
          .locator('.pet-focus-overlay canvas')
          .evaluate((node, old) => node === old, companion),
      ).toBe(true);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(page.locator('.scene-stage')).toHaveAttribute('data-paused', 'false');
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(page.locator('.scene-stage')).toHaveAttribute('data-paused', 'false');
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await expect(page.locator('.scene-stage')).toHaveAttribute('data-paused', 'true');
    },
  );
  await run('Real Stage context loss falls back to zero canvases and usable HUD', async (page) => {
    await page.goto(url + '/?quality=2');
    await expect(page.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
    await page
      .locator('.scene-stage canvas')
      .evaluate((node) =>
        node.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext(),
      );
    await expect(page.locator('.render-shell')).toHaveAttribute('data-quality-tier', '0');
    await expect(page.locator('canvas')).toHaveCount(0);
    await page.getByRole('button', { name: '街坊工坊', exact: true }).click();
    await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
  });
  await run('Tier 1 skips environment map and clearcoat', async (page) => {
    await page.goto(url + '/?quality=1');
    await expect(page.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
    await expect
      .poll(async () => (await inspect(page, '.companion canvas'))?.material?.clearcoat)
      .toBe(0);
    expect((await inspect(page, '.companion canvas')).environment).toBe(false);
    expect((await inspect(page)).dpr).toBeLessThanOrEqual(1);
    expect((await inspect(page)).dpr).toBeGreaterThanOrEqual(0.5);
  });
  await run('Tier 3 bounded DPR', async (page) => {
    await page.goto(url + '/?quality=3');
    await expect(page.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
    expect((await inspect(page)).dpr).toBeLessThanOrEqual(1.5);
  });
  await run('DOM override creates no canvas, retains desktop CSS artwork', async (page) => {
    await page.goto(url + '/?quality=dom');
    await expect(page.locator('.render-shell')).toHaveAttribute('data-quality-tier', '0');
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.getByRole('article')).toHaveCount(3);
    await page.screenshot({ path: 'test-results/stage-p0/desktop-tier0.png' });
  });
  await run(
    'Mobile automatic Tier 0 and explicit DOM screenshot',
    async (page) => {
      await page.goto(url);
      await expect(page.locator('.render-shell')).toHaveAttribute('data-quality-tier', '0');
      await expect(page.locator('canvas')).toHaveCount(0);
      await page.screenshot({ path: 'test-results/stage-p0/mobile-tier0.png', fullPage: true });
      await page
        .locator('.hero-panel')
        .screenshot({ path: 'test-results/stage-p0/mobile-tier0-hero.png' });
      await page.getByRole('button', { name: '街坊工坊', exact: true }).click();
      await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
    },
    { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  );
  await run('Low CPU automatically stays DOM', async (page) => {
    await page.addInitScript(() =>
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 }),
    );
    await page.goto(url);
    await expect(page.locator('.render-shell')).toHaveAttribute('data-quality-tier', '0');
    await expect(page.locator('canvas')).toHaveCount(0);
  });
  await run(
    'Normal motion space navigation preserves Stage identity',
    async (page) => {
      await page.goto(url + '/?quality=2');
      await expect(page.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
      const canvas = await page.locator('.scene-stage canvas').elementHandle();
      await page.getByRole('button', { name: '街坊工坊', exact: true }).click();
      await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
      await page.getByRole('button', { name: '校验册', exact: true }).click();
      await expect(page.getByRole('heading', { name: /每个伟大的创造/ })).toBeVisible();
      expect(
        await page.locator('.scene-stage canvas').evaluate((node, old) => node === old, canvas),
      ).toBe(true);
    },
    { reducedMotion: 'no-preference' },
  );
  await writeFile('test-results/stage-p0/report.json', JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
