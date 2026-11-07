import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const out = process.env.SPARKMATE_M2_OUTPUT || 'test-results/toon-m2';
const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [],
  errors = [],
  captures = [];
const p = await browser.newPage({
  viewport: { width: 1728, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('lighting-color lightingColor'))
    errors.push(m.text());
});
async function read(fn, arg) {
  return p.evaluate(
    async ({ source, arg }) => {
      const entry = performance
        .getEntriesByType('resource')
        .find((r) => r.name.includes('/@react-three_fiber.js'));
      const { _roots } = await import(entry.name);
      const r = _roots.get(document.querySelector('.scene-stage canvas')).store.getState();
      return new Function('r', 'arg', `return (${source})(r,arg)`)(r, arg);
    },
    { source: fn.toString(), arg },
  );
}
const nav = (name) =>
  p.getByRole('navigation', { name: '主导航' }).getByRole('button', { name, exact: true });
async function shot(name, clean = false) {
  const meta = await read((r) => ({
    position: r.camera.position.toArray(),
    quaternion: r.camera.quaternion.toArray(),
    fov: r.camera.fov,
  }));
  let style;
  if (clean)
    style = await p.addStyleTag({
      content:
        '.app-shell,.companion-container,.space-dock,.deskpet3d-shell {visibility:hidden!important}',
    });
  await p.screenshot({ path: join(out, name + '.png') });
  await style?.evaluate((e) => e.remove());
  captures.push({ name, ...meta, clean, viewport: [1728, 1080], dpr: 1 });
}
try {
  await p.goto(base + '/?quality=3');
  await expect(p.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
  await p.evaluate(async () => {
    const { useEnvironmentStore } =
      await import('/src/features/environment/useEnvironmentStore.js');
    useEnvironmentStore.getState().setMode('day');
  });
  await p.waitForTimeout(1200);
  const saves = await p.evaluate(() => localStorage.getItem('sparkmate.routes.v2'));
  for (const [name, id] of [
    ['学习仪表盘', 'dashboard'],
    ['硬件实验室', 'hardware'],
    ['代码魔改工坊', 'code'],
    ['创客排位', 'ranking'],
  ]) {
    await nav(name).click();
    await expect(p.locator('.app-shell')).toHaveAttribute('data-space-phase', 'detail');
    await p.waitForTimeout(650);
    const s = await read((r, id) => {
      const island = r.scene.getObjectByName('space-island-' + id);
      const solids = [],
        foliage = [];
      island.traverse((n) => {
        if (n.isMesh && !n.material.transparent && !n.material.isShaderMaterial)
          solids.push({ name: n.name, type: n.material.type });
        if (n.name === 'npr-edge-vines') foliage.push(n.count);
      });
      return {
        solids,
        foliage,
        rims: island.children.length,
        canvases: document.querySelectorAll('canvas').length,
        refraction: r.gl.info.programs.some((p) =>
          (r.gl.getContext().getShaderSource(p.fragmentShader) || '').includes(
            'chromaticAberration',
          ),
        ),
      };
    }, id);
    expect(
      s.solids.filter(
        (m) => m.type === 'MeshStandardMaterial' || m.type === 'MeshPhysicalMaterial',
      ),
    ).toEqual([]);
    expect(s.foliage).toEqual([28]);
    expect(s.canvases).toBeLessThanOrEqual(2);
    expect(s.refraction).toBe(false);
    results.push({ name: 'Toon solids and botanical LOD ' + id, state: s });
    if (id !== 'dashboard') await shot('m2-' + id, true);
  }
  await p.getByRole('button', { name: '返回大世界', exact: true }).click();
  await expect(p.locator('.app-shell')).toHaveAttribute('data-space-phase', 'idle');
  await p.waitForTimeout(900);
  const far = await read((r) => ({
    towers: r.scene.getObjectByName('valley-megastructures')?.material.type,
    rocks: r.scene.getObjectByName('valley-asteroids')?.material.type,
    drones: r.scene.getObjectByName('npr-survey-drones')?.count,
    fog: r.scene.fog.isFogExp2,
  }));
  expect(far.towers).toBe('MeshToonMaterial');
  expect(far.rocks).toBe('MeshToonMaterial');
  expect(far.drones).toBe(8);
  expect(far.fog).toBe(true);
  results.push({ name: 'Far Toon silhouettes and fog', state: far });
  await shot('m2-world', true);
  await shot('m2-world-ui');
  await nav('学习仪表盘').click();
  await expect(p.locator('.app-shell')).toHaveAttribute('data-space-phase', 'detail');
  await p.waitForTimeout(500);
  const relic = p.getByRole('button', { name: '查看维护者石碑', exact: true });
  await relic.focus();
  await p.keyboard.press('Enter');
  await expect(p.getByRole('status').filter({ hasText: '这是上一任维护者留下的……' })).toBeVisible();
  expect(await p.evaluate(() => localStorage.getItem('sparkmate.routes.v2'))).toEqual(saves);
  await shot('m2-relic', true);
  await shot('m2-relic-ui');
  results.push({ name: 'Keyboard relic trigger and unchanged learning save' });
  await p.emulateMedia({ reducedMotion: 'no-preference' });
  await p.waitForTimeout(550);
  const a = await read((r) => {
    const vine = r.scene.getObjectByName('npr-edge-vines');
    return {
      time: vine.material.uniforms,
      shader: r.gl.info.programs.some((p) =>
        (r.gl.getContext().getShaderSource(p.vertexShader) || '').includes('botanicalTime'),
      ),
    };
  });
  expect(a.shader).toBe(true);
  const windTime = () =>
    read((r) => {
      const m = r.scene.getObjectByName('npr-edge-vines').material;
      const props = r.gl.properties.get(m);
      return props.currentProgram?.getUniforms().map.botanicalTime?.cache[0] ?? null;
    });
  const before = await windTime();
  await p.waitForTimeout(250);
  const after = await windTime();
  expect(after).toBeGreaterThan(before);
  await p.evaluate(() => {
    const el = document.createElement('div');
    el.id = 'm2-modal';
    el.className = 'modal-backdrop';
    document.body.append(el);
  });
  await expect(p.locator('.scene-stage')).toHaveAttribute('data-paused', 'true');
  const frozen = await windTime();
  await p.waitForTimeout(300);
  expect(await windTime()).toEqual(frozen);
  await expect(relic).toBeHidden();
  await p.evaluate(() => document.querySelector('#m2-modal').remove());
  await expect(p.locator('.scene-stage')).toHaveAttribute('data-paused', 'false');
  await p.waitForTimeout(300);
  expect(await windTime()).toBeGreaterThan(frozen);
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.waitForTimeout(200);
  const reduced = await windTime();
  await p.waitForTimeout(300);
  expect(await windTime()).toEqual(reduced);
  results.push({
    name: 'Actual vertex wind advances, modal freezes, resumes and reduced-motion freezes',
  });
  await p.emulateMedia({ reducedMotion: 'no-preference' });
  await p.waitForTimeout(200);
  await p.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(p.locator('.scene-stage')).toHaveAttribute('data-paused', 'true');
  const background = await windTime();
  await p.waitForTimeout(300);
  expect(await windTime()).toEqual(background);
  await expect(relic).toBeHidden();
  await p.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(p.locator('.scene-stage')).toHaveAttribute('data-paused', 'false');
  results.push({ name: 'Simulated background freezes shader and hides relic; foreground resumes' });

  await p.goto(base + '/?quality=1');
  await expect(p.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
  await p.waitForTimeout(1000);
  const low = await read((r) => ({
    plants: !!r.scene.getObjectByName('npr-edge-vines'),
    far: !!r.scene.getObjectByName('valley-megastructures'),
    towers: !!r.scene.getObjectByName('valley-towers'),
    drones: !!r.scene.getObjectByName('npr-survey-drones'),
    rocks: !!r.scene.getObjectByName('valley-asteroids'),
    calls: r.gl.info.render.calls,
    triangles: r.gl.info.render.triangles,
    renderer: r.gl.getContext().getParameter(r.gl.getContext().RENDERER),
  }));
  expect(low.plants || low.far || low.towers || low.drones || low.rocks).toBe(false);
  const perf = await p.evaluate(async () => {
    const entry = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    const { _roots } = await import(entry.name);
    const r = _roots.get(document.querySelector('.scene-stage canvas')).store.getState();
    const firstFrame = r.gl.info.render.frame;
    const samples = [];
    let last = performance.now();
    await new Promise((resolve) => {
      function frame(now) {
        samples.push(now - last);
        last = now;
        r.invalidate();
        if (samples.length < 150) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
    const stable = samples.slice(10).sort((a, b) => a - b);
    return {
      frames: stable.length,
      renderedFrames: r.gl.info.render.frame - firstFrame,
      calls: r.gl.info.render.calls,
      triangles: r.gl.info.render.triangles,
      fps: 1000 / (stable.reduce((a, b) => a + b, 0) / stable.length),
      p95ms: stable[Math.floor(stable.length * 0.95)],
    };
  });
  expect(perf.fps).toBeGreaterThanOrEqual(30);
  expect(perf.renderedFrames).toBeGreaterThan(100);
  expect(perf.calls).toBeGreaterThan(0);
  results.push({ name: 'Tier 1 stripped extras and forced render cadence', state: low, perf });
  await shot('m2-tier1', true);
  await p.goto(base + '/?quality=dom');
  await expect(p.locator('canvas')).toHaveCount(0);
  await p.getByRole('button', { name: '查看维护者石碑' }).click();
  await expect(p.getByRole('status').filter({ hasText: '这是上一任维护者留下的……' })).toBeVisible();
  results.push({ name: 'Zero Canvas DOM relic and keyboard-accessible navigation' });
  const failure = await browser.newPage({ reducedMotion: 'reduce' });
  await failure.route('**/src/features/stage/SceneCanvas.jsx*', (route) => route.abort());
  await failure.goto(base + '/?quality=3');
  await expect(failure.locator('.render-shell')).toHaveAttribute('data-quality-tier', '0');
  await expect(failure.locator('canvas')).toHaveCount(0);
  await failure.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
  await expect(failure.getByLabel('桌宠伪代码', { exact: true })).toBeVisible();
  await failure.close();
  results.push({ name: 'Stage module loading failure retains zero Canvas teaching fallback' });
  const islandFailure = await browser.newPage({ reducedMotion: 'reduce' });
  await islandFailure.route('**/src/features/space/islands/HardwareIsland.jsx*', (route) =>
    route.abort(),
  );
  await islandFailure.goto(base + '/?quality=2');
  await expect(islandFailure.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
  await islandFailure.getByRole('button', { name: '硬件实验室', exact: true }).click();
  await expect(islandFailure.locator('.app-shell')).toHaveAttribute('data-space-phase', 'detail');
  await expect
    .poll(() =>
      islandFailure.evaluate(async () => {
        const entry = performance
          .getEntriesByType('resource')
          .find((r) => r.name.includes('/@react-three_fiber.js'));
        const { _roots } = await import(entry.name);
        const r = _roots.get(document.querySelector('.scene-stage canvas')).store.getState();
        const group = r.scene.getObjectByName('space-island-hardware');
        return (
          !!group?.getObjectByName('space-island-placeholder') &&
          !group?.getObjectByName('p5-hardware-board')
        );
      }),
    )
    .toBe(true);
  await expect(islandFailure.getByRole('button', { name: '拆解', exact: true })).toBeVisible();
  await islandFailure.close();
  results.push({
    name: 'Island content loading failure retains hardware teaching and placeholder',
  });
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ passed: results.length, errors, perf }, null, 2));
} finally {
  await writeFile(
    join(out, 'm2-checks.json'),
    JSON.stringify({ results, errors, captures }, null, 2),
  );
  await browser.close();
}
