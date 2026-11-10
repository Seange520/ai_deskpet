import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.env.SPARKMATE_P9_OUTPUT || 'test-results/world-p0';
const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [],
  errors = [];
const p = await browser.newPage({
  viewport: { width: 1728, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
p.on('pageerror', (e) => errors.push(e.message));
async function scene(fn) {
  return p.evaluate(async (source) => {
    const entry = performance
      .getEntriesByType('resource')
      .find((e) => e.name.includes('/@react-three_fiber.js'));
    const { _roots } = await import(entry.name);
    const r = _roots.get(document.querySelector('.scene-stage canvas')).store.getState();
    return new Function('r', 'return (' + source + ')(r)')(r);
  }, fn.toString());
}
async function quality(tier) {
  await p.evaluate((tier) => {
    const url = new URL(location.href);
    url.searchParams.set('quality', tier);
    history.replaceState(null, '', url);
    dispatchEvent(new PopStateEvent('popstate'));
  }, tier);
  await expect(p.locator('.render-shell')).toHaveAttribute('data-quality-tier', tier);
}
try {
  await p.goto(base + '/?quality=3&world=p9');
  await expect(p.locator('.render-shell')).toHaveAttribute('data-world-preview', 'true');
  await expect.poll(() => scene((r) => !!r.scene.getObjectByName('p9-world-graybox'))).toBe(true);
  const before = await p.evaluate(() => localStorage.getItem('sparkmate.routes.v2'));
  const canvas = await p.locator('.scene-stage canvas').elementHandle();
  const labels = ['枢纽全景', '学习观测站', '硬件台地', '数据瀑布', '排位尖塔'];
  for (let i = 0; i < labels.length; i++) {
    await p.getByRole('button', { name: labels[i], exact: true }).click();
    await expect.poll(() => scene((r) => r.camera.fov)).toBe(65);
    const sample = await scene((r) => {
      const layers = ['macro', 'meso', 'micro'].map((id) => {
        const group = r.scene.getObjectByName('p9-' + id);
        let visible = 0;
        group.traverse((o) => {
          if (!o.isMesh) return;
          const point = o.getWorldPosition(r.camera.position.clone()).project(r.camera);
          if (Math.abs(point.x) < 1 && Math.abs(point.y) < 1 && Math.abs(point.z) < 1) visible++;
        });
        return { id, visible };
      });
      return {
        layers,
        position: r.camera.position.toArray(),
        owner: r.camera.userData.cameraOwner,
        calls: r.gl.info.render.calls,
        triangles: r.gl.info.render.triangles,
      };
    });
    expect(sample.layers.every((l) => l.visible > 0)).toBe(true);
    expect(sample.owner).toBe('p9-survey');
    expect(sample.calls).toBeGreaterThan(0);
    expect(await p.locator('canvas').count()).toBeLessThanOrEqual(2);
    await p.screenshot({ path: out + '/p0-' + i + '.png' });
    results.push({ name: labels[i] + ' FOV65 / three visible depth layers', ...sample });
  }
  await p.keyboard.press('Escape');
  await expect(p.locator('.render-shell')).toHaveAttribute('data-world-preview', 'false');
  expect(await canvas.evaluate((c) => c === document.querySelector('.scene-stage canvas'))).toBe(
    true,
  );
  expect(await scene((r) => !!r.scene.getObjectByName('p9-world-graybox'))).toBe(false);
  expect(await scene((r) => r.camera.userData.cameraOwner || null)).toBe(null);
  expect(await p.locator('.hud-layer').getAttribute('inert')).toBe(null);
  await p.getByRole('button', { name: '返回大世界', exact: true }).click();
  await expect(p.locator('.app-shell')).toHaveAttribute('data-space-phase', 'idle');
  results.push({ name: 'Escape restores teaching, legacy navigation and same renderer' });
  await p.getByRole('button', { name: '预览 P9 世界骨架', exact: true }).click();
  await p.evaluate(() => {
    history.replaceState(null, '', '/?quality=3');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(p.locator('.render-shell')).toHaveAttribute('data-world-preview', 'false');
  await expect(p.locator('.hud-layer')).not.toHaveAttribute('inert');
  await p.evaluate(() => {
    history.replaceState(null, '', '/?quality=3&world=p9');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(p.locator('.render-shell')).toHaveAttribute('data-world-preview', 'true');
  results.push({ name: 'URL preview opt-out restores teaching and focus access' });
  for (const tier of ['2', '1', '3', '0']) {
    await quality(tier);
    if (tier === '0') await expect(p.locator('canvas')).toHaveCount(0);
    else {
      await expect
        .poll(() => scene((r) => !!r.scene.getObjectByName('p9-world-graybox')))
        .toBe(tier === '3');
      if (tier !== '3') expect(await scene((r) => r.gl.info.render.calls)).toBeGreaterThan(0);
    }
  }
  expect(await p.evaluate(() => localStorage.getItem('sparkmate.routes.v2'))).toBe(before);
  results.push({ name: 'Live 3→2→1→3→0; legacy draws, zero Canvas, learning storage unchanged' });
  const low = await browser.newPage();
  for (const tier of ['dom', '1', '2']) {
    const requests = [];
    low.on('request', (r) => requests.push(r.url()));
    await low.goto(base + '/?quality=' + tier + '&world=p9');
    await expect(low.locator('.render-shell')).toHaveAttribute('data-world-preview', 'false');
    if (tier === 'dom') await expect(low.locator('canvas')).toHaveCount(0);
    else await expect(low.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
    expect(requests.some((u) => u.includes('/world/WorldScene'))).toBe(false);
    low.removeAllListeners('request');
  }
  await low.close();
  results.push({ name: 'Fresh Tier 0/1/2 never request P9 scene module' });
  const fail = await browser.newPage();
  await fail.route('**/src/features/world/WorldScene.jsx*', (route) => route.abort());
  await fail.goto(base + '/?quality=3&world=p9');
  await expect(fail.locator('.render-shell')).toHaveAttribute('data-quality-tier', '0');
  await expect(fail.locator('canvas')).toHaveCount(0);
  await fail
    .getByRole('navigation', { name: '主导航' })
    .getByRole('button', { name: '誊写房', exact: true })
    .click();
  await expect(fail.getByLabel('桌宠伪代码', { exact: true })).toBeVisible();
  await fail.close();
  results.push({ name: 'P9 module failure restores zero Canvas teaching' });
  await quality('3');
  await expect(p.locator('.render-shell')).toHaveAttribute('data-world-preview', 'true');
  await scene((r) => r.gl.getContext().getExtension('WEBGL_lose_context').loseContext());
  await expect(p.locator('.render-shell')).toHaveAttribute('data-quality-tier', '0');
  await expect(p.locator('canvas')).toHaveCount(0);
  results.push({ name: 'Actual WebGL context loss restores teaching' });
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ passed: results.length, errors, results }, null, 2));
} finally {
  await writeFile(
    out + '/p0-checks.json',
    JSON.stringify({ passed: results.length, errors, results }, null, 2),
  );
  await browser.close();
}
