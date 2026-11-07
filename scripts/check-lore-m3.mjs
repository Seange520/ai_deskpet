import { chromium, expect as baseExpect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const expect = baseExpect.configure({ timeout: 20000 });
const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = process.env.SPARKMATE_M3_OUTPUT || 'test-results/lore-m3';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const p = await browser.newPage({
  viewport: { width: 1728, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
});
const errors = [],
  results = [],
  captures = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('lighting-color lightingColor'))
    errors.push(m.text());
});
const check = (name, evidence) => results.push({ name, evidence });
let expectedSave;
async function read(fn, arg, companion = false) {
  return p.evaluate(
    async ({ source, arg, companion }) => {
      const entry = performance
        .getEntriesByType('resource')
        .find((r) => r.name.includes('/@react-three_fiber.js'));
      const { _roots } = await import(entry.name);
      const canvas = document.querySelector(
        companion ? '[data-testid="deskpet3d-scene"] canvas' : '.scene-stage canvas',
      );
      const r = _roots.get(canvas).store.getState();
      return new Function('r', 'arg', `return (${source})(r,arg)`)(r, arg);
    },
    { source: fn.toString(), arg, companion },
  );
}
async function inject(complete) {
  const injected = await p.evaluate(async (complete) => {
    const { useLearningStore, totalXP } = await import('/src/stores/useLearningStore.js');
    const s = useLearningStore.getState();
    const routes = Object.fromEntries(
      Object.keys(s.routes).map((id, i) => [
        id,
        { materials: complete && i === 0, wiring: complete && i === 0, code: complete && i === 0 },
      ]),
    );
    useLearningStore.setState({ routes, debugProgress: {} });
    return {
      xp: totalXP(useLearningStore.getState().routes, {}),
      saved: localStorage.getItem('sparkmate.routes.v2'),
    };
  }, complete);
  expectedSave = injected.saved;
  return injected.xp;
}
async function shot(name, clean = false) {
  let style;
  if (clean)
    style = await p.addStyleTag({ content: '.app-shell,.space-dock{visibility:hidden!important}' });
  const camera = await read((r) => ({
    position: r.camera.position.toArray(),
    quaternion: r.camera.quaternion.toArray(),
    fov: r.camera.fov,
  }));
  await p.screenshot({ path: join(out, name + '.png') });
  await style?.evaluate((n) => n.remove());
  captures.push({ name, clean, ...camera });
}
const nav = (name) =>
  p.getByRole('navigation', { name: '主导航' }).getByRole('button', { name, exact: true });
async function jump(id) {
  await p.evaluate(async (id) => {
    const { useSpaceStore } = await import('/src/features/space/spaceStore.js');
    useSpaceStore.getState().jumpTo(id);
  }, id);
  await p.waitForTimeout(300);
}
try {
  await p.goto(base + '/?quality=3');
  await expect(p.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
  await expect(p.locator('[data-testid="deskpet3d-scene"]')).toHaveAttribute('data-form', 'Spark');
  const saves = await p.evaluate(() => localStorage.getItem('sparkmate.routes.v2'));
  await p.evaluate(async () => {
    const { useEnvironmentStore } =
      await import('/src/features/environment/useEnvironmentStore.js');
    useEnvironmentStore.getState().setMode('day');
  });
  await nav('学习仪表盘').click();
  await expect(p.locator('.app-shell')).toHaveAttribute('data-space-phase', 'detail');
  await p.getByRole('button', { name: '查看维护者石碑' }).click();
  await expect(p.locator('.relic-message')).toContainText('七道刻痕');
  await shot('m3-stone');
  await shot('m3-stone-scene', true);
  await p.getByRole('button', { name: '⌁ 第一束光的回声', exact: true }).click();
  await expect(p.locator('.sos-archive')).toBeVisible();
  await expect(p.locator('.sos-archive i')).toHaveAttribute('data-lit', 'true');
  const on = 'true';
  await expect
    .poll(() => p.locator('.sos-archive i').getAttribute('data-lit'), {
      intervals: [40],
      timeout: 4000,
    })
    .toBe('false');
  const off = 'false';
  await shot('m3-sos');
  await p.getByRole('button', { name: '关闭记忆提示' }).click();
  check('石碑数据库 / SOS 档案灯 / 存档不变', { on, off });
  expect(await p.evaluate(() => localStorage.getItem('sparkmate.routes.v2'))).toEqual(saves);
  expect(await inject(true)).toBe(500);
  await expect(p.getByTestId('pet-evolution')).toBeVisible();
  await p.waitForTimeout(850);
  const mid = await read(
    (r) => {
      const root = r.scene.getObjectByName('command-pet');
      const points = r.scene.getObjectByName('p7-jump-shell');
      return {
        form: root.userData.form,
        particleCount: points.geometry.attributes.position.count,
        dissolve: points.material.uniforms.dissolve.value,
        calls: r.gl.info.render.calls,
        programs: r.gl.info.programs.map((p) => p.name),
      };
    },
    null,
    true,
  );
  expect(mid.particleCount).toBe(960);
  expect(mid.dissolve).toBeGreaterThan(0.2);
  await shot('m3-evolution-mid');
  await p.getByRole('button', { name: '重置学习进度' }).click();
  await expect(p.locator('.modal-backdrop')).toBeVisible();
  await p.waitForTimeout(100);
  const progress = () =>
    p.evaluate(async () => {
      const entry = performance
        .getEntriesByType('resource')
        .find((r) => r.name.includes('/src/features/space/useLorePresentation.js'));
      return (await import(entry.name)).evolutionClock.progress;
    });
  const modalProgress = await progress();
  await p.waitForTimeout(350);
  expect(await progress()).toBe(modalProgress);
  await p.getByRole('button', { name: '保留进度' }).click();
  await p.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await p.waitForTimeout(100);
  const backgroundProgress = await progress();
  await p.waitForTimeout(350);
  expect(await progress()).toBe(backgroundProgress);
  await p.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await p.waitForTimeout(150);
  expect(await progress()).toBeGreaterThan(backgroundProgress);
  check('进化模态暂停 / 模拟后台冻结 / 恢复继续', { modalProgress, backgroundProgress });
  await expect(p.locator('[data-testid="deskpet3d-scene"]')).toHaveAttribute('data-form', 'Kernel');
  await p.waitForTimeout(1150);
  await shot('m3-evolution-kernel-mid');
  const identity = await p.locator('[data-testid="deskpet3d-scene"] canvas').evaluate((n) => {
    n.dataset.m3Identity = 'same';
    return n.dataset.m3Identity;
  });
  await expect(p.getByTestId('pet-evolution')).toBeHidden({ timeout: 12000 });
  await expect(p.locator('.kernel-achievement')).toContainText('系统核心已激活');
  await expect(p.locator('[data-testid="deskpet3d-scene"]')).toHaveAttribute('data-form', 'Kernel');
  const kernel = await read(
    (r) => ({
      form: r.scene.getObjectByName('command-pet').userData.form,
      tools: !!r.scene.getObjectByName('kernel-robot-tools'),
    }),
    null,
    true,
  );
  expect(kernel.tools).toBe(true);
  expect(
    await p.locator('[data-testid="deskpet3d-scene"] canvas').getAttribute('data-m3-identity'),
  ).toBe(identity);
  expect(await p.locator('canvas').count()).toBeLessThanOrEqual(2);
  await shot('m3-kernel-achievement');
  await shot('m3-kernel-scene', true);
  check('500 XP / 960 表面粒子 / 形态重组 / 成就 / 同 Canvas', { mid, kernel });
  expect(await inject(false)).toBe(0);
  await expect(p.locator('[data-testid="deskpet3d-scene"]')).toHaveAttribute('data-form', 'Spark');
  // Exact threshold: 475 XP from one route's first two tasks + five debug repairs.
  const boundary = await p.evaluate(async () => {
    const { useLearningStore, totalXP } = await import('/src/stores/useLearningStore.js');
    const { hardwareRoutes } = await import('/src/data/hardwareRoutes.js');
    const state = useLearningStore.getState(),
      routes = structuredClone(state.routes),
      debugProgress = {};
    const id = Object.keys(routes)[0];
    routes[id] = { materials: true, wiring: true, code: false };
    let count = 0;
    for (const route of hardwareRoutes)
      for (const fault of route.faultyCircuits) {
        if (count++ < 5) (debugProgress[route.id] ||= {})[fault.id] = true;
      }
    useLearningStore.setState({ routes, debugProgress });
    return totalXP(routes, debugProgress);
  });
  expect(boundary).toBe(475);
  await expect(p.locator('[data-testid="deskpet3d-scene"]')).toHaveAttribute('data-form', 'Spark');
  check('475 XP 保持 Spark / 复位回退', boundary);
  await inject(false);
  await nav('硬件实验室').click();
  await expect(p.locator('.app-shell')).toHaveAttribute('data-space-phase', 'detail');
  await p.getByRole('button', { name: '⌁ 残响议会的总线遗物', exact: true }).click();
  await expect(p.locator('.lore-memory')).toContainText('最后一次握手');
  await shot('m3-echo');
  await nav('代码魔改工坊').click();
  await expect(p.locator('.app-shell')).toHaveAttribute('data-space-phase', 'detail');
  await p.getByRole('button', { name: '⌁ 未退出的循环残骸', exact: true }).click();
  await expect(p.locator('.lore-memory')).toContainText('为循环留下出口');
  check('两岛遗物 / 静态死循环档案 / 导航可用', true);
  await p.getByRole('button', { name: '返回大世界', exact: true }).click();
  await expect(p.locator('.app-shell')).toHaveAttribute('data-space-phase', 'idle');
  await p.waitForTimeout(600);
  const ecosystem = await read((r) => {
    const fish = r.scene.getObjectByName('lumen-memory-fish');
    const meteor = r.scene.getObjectByName('seventh-memory-meteor');
    meteor.userData.clock.next = meteor.userData.clock.elapsed;
    return {
      fishCount: fish.count,
      fishTime: fish.material.uniforms.fishTime.value,
      meteorInterval: 150,
    };
  });
  expect(ecosystem.fishCount).toBe(72);
  await p.waitForTimeout(2600);
  await expect(p.getByRole('button', { name: '捕捉流星记忆' })).toBeVisible();
  await shot('m3-world-meteor', true);
  await shot('m3-world-ui');
  await p.getByRole('button', { name: '捕捉流星记忆' }).focus();
  await p.keyboard.press('Enter');
  await expect(p.locator('.lore-memory')).toContainText('继续检查');
  await shot('m3-meteor-memory');
  check('鱼群单批实例 / 流星真实 shader 与键盘捕捉', ecosystem);
  const fishTime = () =>
    read((r) => r.scene.getObjectByName('lumen-memory-fish').material.uniforms.fishTime.value);
  const before = await fishTime();
  await p.waitForTimeout(200);
  expect(await fishTime()).toBeGreaterThan(before);
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.waitForTimeout(250);
  const frozen = await fishTime();
  await p.waitForTimeout(250);
  expect(await fishTime()).toBe(frozen);
  await expect(p.getByRole('button', { name: '捕捉流星记忆' })).toBeHidden();
  await inject(true);
  await expect(p.locator('.kernel-achievement')).toContainText('系统核心已激活');
  await expect(p.getByTestId('pet-evolution')).toBeHidden();
  expect(await p.evaluate(() => localStorage.getItem('sparkmate.routes.v2'))).toEqual(expectedSave);
  check('减少动画冻结生态 / 静态进化 / 注入以外无额外存档写入', true);
  // Old-save restoration uses the real serialized route flags, without an invented xp field.
  await p.evaluate(async () => {
    const { useLearningStore } = await import('/src/stores/useLearningStore.js');
    const s = useLearningStore.getState();
    localStorage.setItem(
      'sparkmate.routes.v2',
      JSON.stringify({
        routes: s.routes,
        debugProgress: s.debugProgress,
        routeId: s.routeId,
        unlockedLevels: ['L1'],
        completedLevels: [],
      }),
    );
  });
  await p.reload();
  await expect(p.locator('[data-testid="deskpet3d-scene"]')).toHaveAttribute('data-form', 'Kernel');
  await expect(p.getByTestId('pet-evolution')).toBeHidden();
  check('旧档 500 XP 直接恢复 Kernel，不重复弹成就', true);
  const switchTier = async (tier) => {
    await p.evaluate((tier) => {
      history.pushState(null, '', `/?quality=${tier}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, tier);
    await expect(p.locator('.render-shell')).toHaveAttribute('data-quality-tier', String(tier));
    await p.waitForTimeout(250);
  };
  await switchTier(2);
  await expect(p.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
  expect(
    await read((r) => ({
      fish: r.scene.getObjectByName('lumen-memory-fish').count,
      meteor: !!r.scene.getObjectByName('seventh-memory-meteor'),
    })),
  ).toEqual({ fish: 40, meteor: false });
  await switchTier(1);
  await expect(p.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
  expect(
    await read(
      (r) =>
        !!r.scene.getObjectByName('lumen-memory-fish') ||
        !!r.scene.getObjectByName('seventh-memory-meteor'),
    ),
  ).toBe(false);
  await inject(false);
  await p.emulateMedia({ reducedMotion: 'no-preference' });
  await inject(true);
  await expect(p.getByTestId('pet-evolution')).toBeVisible();
  await p.waitForTimeout(700);
  const lowDraw = await read(
    (r) => ({
      calls: r.gl.info.render.calls,
      triangles: r.gl.info.render.triangles,
      form: r.scene.getObjectByName('command-pet').userData.form,
    }),
    null,
    true,
  );
  expect(lowDraw.calls).toBeGreaterThan(0);
  expect(lowDraw.triangles).toBeGreaterThan(0);
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await expect(p.getByTestId('pet-evolution')).toBeHidden();
  check('Tier 1 进化有实际绘制，无正优先级黑屏', lowDraw);
  await switchTier(3);
  expect(await read((r) => r.scene.getObjectByName('lumen-memory-fish').count)).toBe(72);
  await read((r) => r.gl.getContext().getExtension('WEBGL_lose_context').loseContext());
  await expect(p.locator('.render-shell')).toHaveAttribute('data-quality-tier', '0');
  await expect(p.locator('canvas')).toHaveCount(0);
  await expect(p.locator('.companion')).toHaveAttribute('data-form', 'Kernel');
  await p.getByRole('button', { name: '查看维护者石碑' }).click();
  await expect(p.locator('.relic-message')).toContainText('七道刻痕');
  check('Tier 2 / 1 / 0 门控与 DOM Kernel / 石碑兜底', true);
  const failure = await browser.newPage({ reducedMotion: 'reduce' });
  await failure.route('**/features/stage/SceneCanvas.jsx*', (route) => route.abort('failed'));
  await failure.goto(base + '/?quality=3');
  await expect(failure.locator('.render-shell')).toHaveAttribute('data-quality-tier', '0');
  await expect(failure.locator('canvas')).toHaveCount(0);
  await expect(failure.getByRole('button', { name: '查看维护者石碑' })).toBeVisible();
  await failure.close();
  check('Stage 模块失败仍有零 Canvas / 石碑 DOM 入口', true);
  expect(errors).toEqual([]);
} catch (error) {
  await p.screenshot({ path: join(out, 'failure.png') });
  console.log(
    JSON.stringify(
      {
        error: String(error),
        errors,
        ui: await p.locator('.render-shell').evaluate((n) => ({
          tier: n.dataset.qualityTier,
          phase: n.querySelector('.app-shell')?.dataset.spacePhase,
          relic: n.querySelector('.relic-overlay')?.outerHTML,
          text: n.innerText.slice(-2200),
        })),
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await writeFile(
    join(out, 'm3-checks.json'),
    JSON.stringify({ results, errors, captures }, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify({ passed: results.length, errors, output: out }, null, 2));
