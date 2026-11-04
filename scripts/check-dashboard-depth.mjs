import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const url = process.env.SPARKMATE_DASHBOARD_URL || 'http://127.0.0.1:5262';
const dir = process.env.SPARKMATE_DASHBOARD_REPORT || 'test-results/pr3-review';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
    reducedMotion: 'no-preference',
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.depthListeners = new Map();
    for (const [method, adding] of [
      ['addEventListener', true],
      ['removeEventListener', false],
    ]) {
      const original = EventTarget.prototype[method];
      EventTarget.prototype[method] = function (type, listener, ...rest) {
        if (
          this instanceof Element &&
          this.matches('.dashboard-depth') &&
          ['pointermove', 'pointerleave', 'pointercancel'].includes(type)
        ) {
          const map = window.depthListeners.get(this) || new Map();
          const set = map.get(type) || new Set();
          if (adding) set.add(listener);
          else set.delete(listener);
          map.set(type, set);
          window.depthListeners.set(this, map);
        }
        return original.call(this, type, listener, ...rest);
      };
    }
  });
  await page.goto(url);
  await expect(page.locator('.page-transition')).toHaveCSS('opacity', '1');
  const snapshot = () =>
    page.evaluate(async () => {
      const { useLearningStore } = await import('/src/stores/useLearningStore.js');
      return {
        storage: JSON.stringify(Object.entries(localStorage).sort()),
        learning: JSON.stringify(useLearningStore.getState()),
      };
    });
  const initial = await snapshot();
  const modules = page.locator('.dashboard-depth');
  await expect(modules).toHaveCount(3);
  const listenerCount = (locator) =>
    locator.evaluate((el) =>
      [...(window.depthListeners.get(el)?.values() || [])].reduce((n, s) => n + s.size, 0),
    );
  const selectors = ['.growth-overview', '.task-matrix', '.achievement-milestones'];
  for (const selector of selectors) {
    const card = page.locator(selector);
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute('data-depth-enabled', 'true');
    assert.equal(await listenerCount(card), 3);
    const r = await card.boundingBox();
    await page.mouse.move(r.x + r.width * 0.8, r.y + r.height * 0.3);
    await expect(card).toHaveAttribute('data-depth-hover', 'true');
    const angles = await card.evaluate((el) =>
      ['--dashboard-rx', '--dashboard-ry'].map((p) => parseFloat(el.style.getPropertyValue(p))),
    );
    assert(angles.every((n) => Number.isFinite(n) && Math.abs(n) <= 3.5));
    assert(angles.some((n) => Math.abs(n) > 0.1));
    await expect(card).toHaveCSS('transform-style', 'preserve-3d');
    assert.equal(
      await card
        .locator('h2')
        .first()
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m43),
      10,
    );
    await page.mouse.move(1, 1);
    await expect(card).toHaveAttribute('data-depth-hover', 'false');
    assert.equal(await card.evaluate((el) => el.style.getPropertyValue('--dashboard-rx')), '');
  }
  checks.push(
    'All three sections: visible-only native listeners, bounded +/-3.5deg tilt, Z=10 titles, leave resets',
  );
  const matrix = page.locator('.task-matrix');
  await matrix.scrollIntoViewIfNeeded();
  await expect(page.locator('.task-matrix-cell')).toHaveCount(16);
  await expect(page.locator('.badge')).toHaveCount(4);
  const cell = page.locator('.task-matrix-cell').nth(6),
    status = cell.locator('.task-matrix-status');
  await cell.hover();
  await expect(status).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -2)');
  await page.screenshot({ path: dir + '/matrix-hover.png' });
  checks.push(
    '16 original read-only table cells: hover raises status card 2px; all four badges remain',
  );
  await page.evaluate(() => scrollTo(0, 0));
  await expect(matrix).toHaveAttribute('data-depth-enabled', 'false');
  assert.equal(await listenerCount(matrix), 0);
  await matrix.evaluate((el) =>
    el.dispatchEvent(
      new PointerEvent('pointermove', { pointerType: 'mouse', clientX: 500, clientY: 300 }),
    ),
  );
  await page.waitForTimeout(80);
  assert.equal(await matrix.evaluate((el) => el.style.getPropertyValue('--dashboard-ry')), '');
  checks.push(
    'Offscreen: listeners removed, angles cleared, synthetic pointer events cause no effect',
  );
  await matrix.scrollIntoViewIfNeeded();
  await expect(matrix).toHaveAttribute('data-depth-enabled', 'true');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(matrix).toHaveAttribute('data-depth-enabled', 'false');
  assert.equal(await listenerCount(matrix), 0);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(matrix).toHaveAttribute('data-depth-enabled', 'true');
  await page.setViewportSize({ width: 1440, height: 4000 });
  await page.getByRole('button', { name: '查看物料清单' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  for (const card of await modules.all()) {
    await expect(card).toHaveAttribute('data-depth-enabled', 'false');
    assert.equal(await listenerCount(card), 0);
  }
  await page.getByRole('button', { name: '关闭弹窗' }).press('Escape');
  await page.setViewportSize({ width: 1440, height: 1080 });
  checks.push('Simulated visibilitychange and business modal: detach/reset, then resume');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const card of await modules.all()) {
    await expect(card).toHaveCSS('transform', 'none');
    await expect(card).toHaveCSS('transform-style', 'flat');
    assert.equal(await listenerCount(card), 0);
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 767, height: 1000 });
  for (const card of await modules.all()) {
    await expect(card).toHaveCSS('transform', 'none');
    assert.equal(await listenerCount(card), 0);
  }
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  checks.push('Reduced motion and 767px fine pointer: flat sections and zero pointer listeners');
  await page.setViewportSize({ width: 1440, height: 1080 });
  const unlocked = page.locator('.badge.unlocked').first();
  assert.match(
    await unlocked.evaluate((el) => getComputedStyle(el, '::before').backgroundImage),
    /radial-gradient/,
  );
  await expect(page.locator('.badge:not(.unlocked) > div').first()).toHaveCSS(
    'backdrop-filter',
    'blur(6px)',
  );
  checks.push(
    'Unlocked icons have a low-opacity radial halo; locked icons retain frosted grayscale',
  );
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
    await expect(modules).toHaveCount(0);
    assert.equal(
      await page.evaluate(() =>
        [...window.depthListeners.values()].reduce(
          (n, m) => n + [...m.values()].reduce((a, s) => a + s.size, 0),
          0,
        ),
      ),
      0,
    );
    await page.getByRole('button', { name: 'SparkMate 首页' }).click();
    await expect(modules).toHaveCount(3);
  }
  assert.deepEqual(await snapshot(), initial);
  checks.push(
    'Repeated unmount: all section listeners released; learning state and localStorage unchanged',
  );
  for (const width of [320, 1440]) {
    const touch = await browser.newPage({
      viewport: { width, height: 1080 },
      hasTouch: true,
      reducedMotion: 'no-preference',
    });
    await touch.goto(url);
    for (const selector of selectors) {
      const card = touch.locator(selector);
      await card.scrollIntoViewIfNeeded();
      await expect(card).toHaveAttribute('data-depth-enabled', 'false');
      await expect(card).toHaveCSS('transform', 'none');
      await expect(card).toHaveCSS('transform-style', 'flat');
    }
    await touch.locator('.task-matrix').scrollIntoViewIfNeeded();
    await touch
      .locator('.task-matrix')
      .screenshot({ path: dir + '/touch-matrix-' + width + '.png' });
    assert(await touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await touch.close();
  }
  checks.push(
    '320px touch and 1440px coarse pointer: static 2D matrix/modules, no horizontal overflow',
  );
  assert.deepEqual(errors, []);
  const report = { passed: checks.length, checks, pageErrors: errors, url, regression: false };
  await writeFile(dir + '/checks.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
