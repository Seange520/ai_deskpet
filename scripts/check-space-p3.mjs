import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';

const url = process.env.SPARKMATE_SPACE_URL;
if (!url) throw new Error('Set SPARKMATE_SPACE_URL to the normal development server');
const output = process.env.SPARKMATE_SPACE_OUTPUT || 'test-results/space-p3';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
const nav = (page, name) =>
  page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name, exact: true });
const stage = (page) => page.locator('.scene-stage');
const shell = (page) => page.locator('.app-shell');
const warning = (page) => page.getByRole('alert').filter({ hasText: '暂时无法载入此岛的 3D 内容' });

async function read(page, rememberReflection = false) {
  return page.evaluate(async (rememberReflection) => {
    const entry = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    const { _roots } = await import(entry.name);
    const state = _roots.get(document.querySelector('.scene-stage canvas')).store.getState();
    let reflector;
    const effects = [];
    const beams = [];
    state.scene.traverse((node) => {
      if (node.name.startsWith('space-beams-')) beams.push(node.name);
      for (const effect of node.__r3f?.objects || []) {
        if (effect.getBlendMode) effects.push(effect.name);
        if (effect.name === 'ScreenLightingEffect') reflector = effect.reflections;
      }
    });
    if (rememberReflection) {
      window.reflectionAttachments = [
        reflector?.ssrRenderTarget.texture,
        reflector?.blurRenderTarget2.texture,
      ];
    }
    const islands = {};
    for (const id of ['dashboard', 'hardware', 'code', 'ranking']) {
      const island = state.scene.getObjectByName('space-island-' + id);
      islands[id] = {
        level: island.userData.lod,
        placeholder: Boolean(island.getObjectByName('space-island-placeholder')),
      };
    }
    return {
      islands,
      effects,
      beams,
      reflection: Boolean(reflector),
      reflectionAttachments: window.reflectionAttachments?.filter(
        (texture) => texture && state.gl.properties.has(texture),
      ).length,
      performanceStep: document.querySelector('.scene-stage').dataset.performanceStep,
      ...state.gl.info.memory,
    };
  }, rememberReflection);
}

async function check(name, run) {
  const page = await browser.newPage({
    viewport: { width: 1728, height: 1080 },
    reducedMotion: 'reduce',
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
    const details = await run(page);
    expect(errors).toEqual([]);
    results.push({ name, ...details });
    console.log('PASS', name, details || '');
  } finally {
    await page.close();
  }
}

async function ready(page, query = 'quality=3') {
  await page.goto(url + '/?' + query);
  await expect(page.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
  await expect.poll(() => read(page).then((s) => s.islands.dashboard.placeholder)).toBe(false);
}

try {
  await check(
    'Hover starts one import; failed chunk preserves Canvas and teaching HUD',
    async (page) => {
      let hits = 0;
      await page.route('**/RankingIsland.jsx*', (route) => {
        hits++;
        return route.abort('failed');
      });
      await ready(page);
      const canvas = await stage(page).locator('canvas').elementHandle();
      expect(hits).toBe(0);
      const ranking = nav(page, '委托板');
      await ranking.hover();
      await expect.poll(() => hits).toBe(1);
      await expect(warning(page)).toHaveCount(0);
      await ranking.focus();
      await ranking.press('Enter');
      await expect(shell(page)).toHaveAttribute('data-space-focus', 'ranking');
      await expect(warning(page)).toBeVisible();
      await expect.poll(() => read(page).then((s) => s.islands.ranking.placeholder)).toBe(true);
      await expect(page.getByRole('heading', { name: /委托板，/ })).toBeVisible();
      expect(
        await stage(page)
          .locator('canvas')
          .evaluate((node, old) => node === old, canvas),
      ).toBe(true);
      expect(hits).toBe(1);
    },
  );

  await check('travelTo starts import; timeout warns and late response recovers', async (page) => {
    let hits = 0;
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    await page.route('**/CodeIsland.jsx*', async (route) => {
      hits++;
      await gate;
      await route.continue().catch(() => {});
    });
    try {
      await ready(page);
      const canvas = await stage(page).locator('canvas').elementHandle();
      expect(hits).toBe(0);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await expect(shell(page)).toHaveAttribute('data-space-phase', 'idle');
      await page.evaluate(async () => {
        const { useSpaceStore } = await import('/src/features/space/spaceStore.js');
        useSpaceStore.getState().travelTo('code');
      });
      await expect.poll(() => hits).toBe(1);
      await expect.poll(() => read(page).then((s) => s.islands.code.placeholder)).toBe(true);
      await expect(shell(page)).toHaveAttribute('data-space-focus', 'code');
      await expect(page.getByRole('heading', { name: /一点代码，/ })).toBeVisible();
      await expect(warning(page)).toBeVisible();
      expect((await read(page)).islands.code.placeholder).toBe(true);
      release();
      await expect.poll(() => read(page).then((s) => s.islands.code.placeholder)).toBe(false);
      await expect(warning(page)).toHaveCount(0);
      expect(
        await stage(page)
          .locator('canvas')
          .evaluate((node, old) => node === old, canvas),
      ).toBe(true);
      expect(hits).toBe(1);
    } finally {
      release();
    }
  });

  await check(
    'Distant details repeatedly unmount; GPU counters settle and Canvas survives',
    async (page) => {
      await ready(page);
      const canvas = await stage(page).locator('canvas').elementHandle();
      const saved = await page.evaluate(() => JSON.stringify(localStorage));
      const circuit = async () => {
        for (const [id, name] of [
          ['hardware', '街坊工坊'],
          ['code', '誊写房'],
          ['ranking', '委托板'],
          ['dashboard', '校验册'],
        ]) {
          await nav(page, name).click();
          await expect(shell(page)).toHaveAttribute('data-space-focus', id);
          await expect
            .poll(() => read(page).then((s) => s.islands[id]))
            .toEqual({ level: 'detail', placeholder: false });
        }
        await expect.poll(() => read(page).then((s) => s.islands.code.level)).not.toBe('detail');
        await page.waitForTimeout(180);
        const { geometries, textures } = await read(page);
        return { geometries, textures };
      };
      const baseline = await circuit();
      const samples = [];
      for (let i = 0; i < 4; i++) {
        const sample = await circuit();
        samples.push(sample);
        expect(sample.geometries).toBeLessThanOrEqual(baseline.geometries + 2);
        expect(sample.textures).toBeLessThanOrEqual(baseline.textures + 2);
      }
      expect(
        await stage(page)
          .locator('canvas')
          .evaluate((node, old) => node === old, canvas),
      ).toBe(true);
      expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(saved);
      return { baseline, samples };
    },
  );

  await check(
    'Sustained slow frames retire volume, reflection, Bloom/DoF, then snap to Tier 1',
    async (page) => {
      await page.addInitScript(() => {
        const raf = window.requestAnimationFrame.bind(window);
        const caf = window.cancelAnimationFrame.bind(window);
        const scheduled = new Map();
        window.requestAnimationFrame = (callback) => {
          const start = performance.now();
          const tick = (now) => {
            if (window.slowStageFrames && now - start < 52) scheduled.set(id, raf(tick));
            else {
              scheduled.delete(id);
              callback(now);
            }
          };
          const id = raf(tick);
          return id;
        };
        window.cancelAnimationFrame = (id) => {
          caf(scheduled.get(id) ?? id);
          scheduled.delete(id);
        };
      });
      await ready(page, 'quality=3&adaptive=1');
      const canvas = await stage(page).locator('canvas').elementHandle();
      const baseline = await read(page);
      expect(baseline.reflection).toBe(true);
      expect(baseline.beams.length).toBeGreaterThan(0);
      await page.evaluate(() => {
        window.slowStageFrames = true;
      });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await expect(stage(page)).toHaveAttribute('data-performance-step', '1');
      // The graph swap publishes the quality step before the new SSR targets are drawn.
      await expect
        .poll(async () => (await read(page, true)).reflectionAttachments, {
          intervals: [20, 40, 80, 100],
        })
        .toBe(2);
      const first = await read(page);
      expect(first.beams).toEqual([]);
      expect(first.reflection).toBe(true);
      await expect(stage(page)).toHaveAttribute('data-performance-step', '2');
      const second = await read(page);
      expect(second.reflection).toBe(false);
      expect(second.reflectionAttachments).toBe(0);
      await expect(stage(page)).toHaveAttribute('data-performance-step', '3');
      await expect
        .poll(async () => {
          const sample = await read(page);
          return sample.performanceStep === '3' ? sample.textures : Infinity;
        })
        .toBeLessThan(second.textures);
      const third = await read(page);
      expect(third.effects).toEqual(['ToneMappingEffect', 'VignetteEffect', 'FXAAEffect']);
      await nav(page, '街坊工坊').click();
      await expect(shell(page)).toHaveAttribute('data-space-phase', 'entering');
      await expect(page.locator('.render-shell')).toHaveAttribute('data-quality-tier', '1');
      await expect(shell(page)).toHaveAttribute('data-space-phase', 'detail');
      await expect(shell(page)).toHaveAttribute('data-space-focus', 'hardware');
      await expect(page.locator('.page-transition')).toBeVisible();
      await expect(stage(page)).toHaveAttribute('data-effects', 'none');
      expect(
        await stage(page)
          .locator('canvas')
          .evaluate((node, old) => node === old, canvas),
      ).toBe(true);
      return {
        textures: [
          baseline.textures,
          first.textures,
          second.textures,
          third.textures,
          (await read(page)).textures,
        ],
      };
    },
  );

  await writeFile(join(output, 'p3-checks.json'), JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
