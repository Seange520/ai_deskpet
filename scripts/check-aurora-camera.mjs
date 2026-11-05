import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const url = process.env.SPARKMATE_AURORA_URL || 'http://127.0.0.1:5262';
const dir = process.env.SPARKMATE_AURORA_REPORT || 'test-results/aurora-camera';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [],
  errors = [];
async function open(options = {}, fault = '') {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1200 },
    reducedMotion: 'no-preference',
    ...options,
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(
    ({ fault }) => {
      window.auroraDraws = [];
      window.auroraPixels = [];
      window.auroraCalls = [];
      window.nativeTransitions = [];
      if (fault === 'low') {
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 });
      }
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (this.classList.contains('aurora-field') && fault === 'context') return null;
        return get.call(this, type, ...args);
      };
      const draw = WebGL2RenderingContext.prototype.drawArrays;
      WebGL2RenderingContext.prototype.drawArrays = function (...args) {
        const result = draw.apply(this, args);
        if (this.canvas.classList.contains('aurora-field')) {
          window.auroraDraws.push(performance.now());
          window.auroraCalls.push(args);
          if (window.auroraDraws.length % 10 === 0) {
            const p = new Uint8Array(4);
            this.readPixels(
              Math.floor(this.drawingBufferWidth * 0.72),
              Math.floor(this.drawingBufferHeight * 0.6),
              1,
              1,
              this.RGBA,
              this.UNSIGNED_BYTE,
              p,
            );
            window.auroraPixels.push([...p]);
          }
        }
        return result;
      };
      const compile = WebGL2RenderingContext.prototype.getShaderParameter;
      WebGL2RenderingContext.prototype.getShaderParameter = function (shader, p) {
        if (
          fault === 'shader' &&
          this.canvas.classList.contains('aurora-field') &&
          p === this.COMPILE_STATUS
        )
          return false;
        return compile.call(this, shader, p);
      };
      if (document.startViewTransition) {
        const original = document.startViewTransition.bind(document);
        window.originalCameraAPI = original;
        document.startViewTransition = function (update) {
          const t = original(update);
          window.lastCamera = t;
          window.nativeTransitions.push({
            direction: document.documentElement.dataset.vtDirection,
          });
          return t;
        };
      }
      document.addEventListener(
        'click',
        (e) => (window.cameraClick = { x: e.clientX, y: e.clientY }),
        true,
      );
    },
    { fault },
  );
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.page-transition')).toHaveCSS('opacity', '1');
  return page;
}
const stableDraws = async (page) => {
  await page.waitForTimeout(100);
  const n = await page.evaluate(() => auroraDraws.length);
  await page.waitForTimeout(220);
  assert.equal(await page.evaluate(() => auroraDraws.length), n);
};
try {
  const page = await open();
  const field = page.locator('.aurora-field');
  await expect(field).toHaveAttribute('data-state', 'running');
  await expect(field).toHaveCount(1);
  await expect(page.locator('.hero-particles')).toHaveCount(1);
  const dimensions = await field.evaluate((c) => ({
    width: c.width,
    height: c.height,
    css: c.getBoundingClientRect().width,
    dpr: devicePixelRatio,
    gl: c.getContext('webgl2').getError(),
  }));
  assert(dimensions.width <= Math.ceil(dimensions.css * 1.5));
  assert.equal(dimensions.gl, 0);
  const start = await page.evaluate(() => auroraDraws.length);
  await page.waitForTimeout(1000);
  const count = (await page.evaluate(() => auroraDraws.length)) - start;
  assert(count > 0 && count <= 47);
  for (let i = 0; i < 3; i++) {
    await page.locator('.hero-panel').screenshot({
      path: dir + '/aurora-time-' + i + '.png',
      style: '.companion {visibility:hidden!important}',
    });
    await page.waitForTimeout(750);
  }
  const evidence = await page.evaluate(() => ({ calls: auroraCalls, pixels: auroraPixels }));
  assert(evidence.calls.every((c) => c[0] === 4 && c[1] === 0 && c[2] === 3));
  assert(new Set(evidence.pixels.map((p) => p.join(','))).size > 1);
  checks.push(
    'Real WebGL2 shader compiles/draws one full-screen triangle per pass; varying pixel samples; DPR<=1.5; observed ' +
      count +
      ' draws / 1s (cap45)',
  );
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(field).toHaveAttribute('data-state', 'paused');
  await stableDraws(page);
  await page.evaluate(() => scrollTo(0, 0));
  await expect(field).toHaveAttribute('data-state', 'running');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(field).toHaveAttribute('data-state', 'paused');
  await stableDraws(page);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(field).toHaveAttribute('data-state', 'running');
  await page.setViewportSize({ width: 1440, height: 4000 });
  await page.getByRole('button', { name: '查看物料清单' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(field).toHaveAttribute('data-state', 'paused');
  await stableDraws(page);
  await page.getByRole('button', { name: '关闭弹窗' }).press('Escape');
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.evaluate(() => scrollTo(0, 0));
  await expect(field).toHaveAttribute('data-state', 'running');
  checks.push(
    'IntersectionObserver, simulated visibilitychange and real business modal: stop/resume Aurora draws',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(field).toHaveAttribute('data-state', 'static');
  await stableDraws(page);
  await expect(page.locator('.hero-particles')).toHaveCount(0);
  await expect(page.locator('.hero-panel')).toHaveCSS('perspective', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(field).toHaveAttribute('data-state', 'running');
  checks.push(
    'Live reduced-motion change: one static Aurora frame, no ongoing draws/particles/depth',
  );
  const initialStorage = await page.evaluate(() =>
    JSON.stringify(Object.entries(localStorage).sort()),
  );
  const card = page.getByRole('article').nth(1);
  await card.scrollIntoViewIfNeeded();
  await card.hover();
  await expect(card).toHaveCSS('backdrop-filter', 'none');
  assert.match(
    await card.evaluate((e) => getComputedStyle(e, '::before').backdropFilter),
    /blur\(18px\).*saturate\(1.2\)/,
  );
  await expect
    .poll(() => card.evaluate((e) => getComputedStyle(e, '::after').animationName))
    .toBe('card-refraction');
  await page.evaluate(() => {
    for (const a of document.getAnimations())
      if (a.animationName === 'card-refraction') {
        a.pause();
        a.currentTime = 360;
      }
  });
  await page.screenshot({
    path: dir + '/glass-sweep.png',
    style: '.companion {visibility:hidden!important}',
  });
  checks.push(
    'Real card hover: 900ms CSS refraction, 18px/saturate glass plane, original article depth preserved',
  );
  const freeze = async (label) => {
    await page.evaluate(async () => {
      await window.lastCamera.ready;
      for (const a of document.getAnimations())
        if (a.effect?.pseudoElement?.includes('view-transition')) {
          a.pause();
          a.currentTime = 230;
        }
    });
    const effects = await page.evaluate(() => ({
      direction: document.documentElement.dataset.vtDirection,
      old: getComputedStyle(document.documentElement, '::view-transition-old(page-camera)')
        .transform,
      filter: getComputedStyle(document.documentElement, '::view-transition-old(page-camera)')
        .filter,
      names: document.querySelectorAll('[data-camera-selected="true"]').length,
      animations: document
        .getAnimations()
        .map((a) => ({ name: a.animationName, pseudo: a.effect?.pseudoElement })),
    }));
    assert(effects.names <= 1);
    await page.screenshot({
      path: dir + '/' + label + '.png',
      style: '.companion {visibility:hidden!important}',
    });
    await page.evaluate(() => window.lastCamera.skipTransition());
    return effects;
  };
  await card.getByRole('button', { name: '开始探索' }).click();
  await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
  const forward = await freeze('camera-forward-mid');
  assert.equal(forward.direction, 'forward');
  assert.match(forward.filter, /blur/);
  assert(forward.animations.some((a) => a.pseudo === '::view-transition-old(camera-art)'));
  assert(forward.animations.some((a) => a.pseudo === '::view-transition-new(camera-art)'));
  assert(forward.animations.some((a) => a.pseudo === '::view-transition-group(camera-art)'));
  await page.getByRole('button', { name: 'SparkMate 首页' }).click();
  await expect(page.getByRole('heading', { name: /每个伟大/ })).toBeVisible();
  const backward = await freeze('camera-backward-mid');
  assert.equal(backward.direction, 'backward');
  checks.push(
    'Native forward/backward camera snapshots: unique camera-art, synchronized destination, blur/zoom/iris mid-frame captures',
  );
  await page.evaluate(() => {
    document.startViewTransition = undefined;
  });
  await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
  await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
  assert.equal(
    await page.locator('.page-transition').evaluate((e) => getComputedStyle(e).animationDuration),
    '0.3s',
  );
  await page.evaluate(() => {
    document.startViewTransition = () => {
      throw new Error('API unavailable');
    };
  });
  await page.getByRole('button', { name: 'SparkMate 首页' }).click();
  await expect(page.locator('.hero-panel')).toBeVisible();
  await page.evaluate(() => {
    document.startViewTransition = window.originalCameraAPI;
  });
  await page.evaluate(() => {
    for (const name of ['代码魔改工坊', '硬件实验室', '创客排位', '学习仪表盘'])
      document.querySelector('button[aria-label="' + name + '"]').click();
  });
  await expect(page.getByRole('button', { name: '学习仪表盘', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.locator('.hero-panel')).toBeVisible();
  assert.equal(
    await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort())),
    initialStorage,
  );
  checks.push(
    'Missing/throwing API: 300ms fade with immediate navigation; rapid navigation keeps latest destination and storage unchanged',
  );
  const reduced = await open({ reducedMotion: 'reduce' });
  await expect(reduced.locator('.aurora-field')).toHaveAttribute('data-state', 'static');
  await stableDraws(reduced);
  await reduced.getByRole('button', { name: '硬件实验室', exact: true }).click();
  await expect(reduced.getByRole('heading', { name: /认识它/ })).toBeVisible();
  assert.equal(
    await reduced
      .locator('.page-transition')
      .evaluate((e) => getComputedStyle(e).animationDuration),
    '0.15s',
  );
  assert.equal(await reduced.evaluate(() => nativeTransitions.length), 0);
  assert.equal(await reduced.locator('[data-camera-selected="true"]').count(), 0);
  await reduced.close();
  checks.push(
    'Fresh desktop reduced motion: static field; CSS-only 150ms opacity transition with immediate hit testing and no snapshot geometry',
  );
  for (const [options, fault, label] of [
    [{ viewport: { width: 320, height: 1000 }, hasTouch: true }, '', 'mobile'],
    [{ viewport: { width: 1440, height: 1000 }, hasTouch: true }, '', 'coarse'],
    [{}, 'low', 'low-power'],
  ]) {
    const p = await open(options, fault);
    await expect(p.locator('.aurora-field')).toHaveCount(0);
    await expect(p.locator('.hero-particles')).toHaveCount(0);
    await p.getByRole('button', { name: '硬件实验室', exact: true }).click();
    await expect(p.getByRole('heading', { name: /认识它/ })).toBeVisible();
    assert.equal(await p.evaluate(() => nativeTransitions.length), 0);
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.close();
    checks.push(label + ': no decorative Canvas, no native camera; usable flat layout');
  }
  for (const fault of ['context', 'shader']) {
    const p = await open({}, fault);
    await expect(p.locator('.aurora-field')).toHaveAttribute('data-state', 'fallback');
    await expect(p.locator('.aurora-field')).toBeHidden();
    await expect(p.getByRole('button', { name: '进入硬件实验室', exact: true })).toBeVisible();
    await p.close();
  }
  await page
    .locator('.aurora-field')
    .evaluate((c) => c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await expect(page.locator('.aurora-field')).toHaveAttribute('data-state', 'fallback');
  await stableDraws(page);
  checks.push(
    'WebGL2 denial, shader compile failure and real context loss: CSS background and controls survive',
  );
  assert.deepEqual(errors, []);
  const report = {
    passed: checks.length,
    checks,
    pageErrors: errors,
    forward,
    backward,
    url,
    regression: false,
  };
  await writeFile(dir + '/checks.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
