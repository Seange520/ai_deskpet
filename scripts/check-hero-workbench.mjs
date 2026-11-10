import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const url = process.env.SPARKMATE_HERO_URL || 'http://127.0.0.1:5262';
const dir = process.env.SPARKMATE_HERO_REPORT || 'test-results/pr2-review';
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
    window.heroDraws = 0;
    window.heroCorePoints = 0;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    const arc = CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.classList.contains('hero-particles')) {
        window.heroDraws++;
        window.heroCorePoints = 0;
      }
      return clear.apply(this, args);
    };
    CanvasRenderingContext2D.prototype.arc = function (...args) {
      if (this.canvas.classList.contains('hero-particles') && args[2] < 2) window.heroCorePoints++;
      return arc.apply(this, args);
    };
  });
  await page.goto(url);
  const hero = page.locator('.hero-workbench');
  const storage = () => page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  const originalStorage = await storage();
  await expect(hero).toHaveAttribute('data-active', 'true');
  await expect(hero).toHaveCSS('perspective', '1200px');
  await expect(hero).toHaveCSS('overflow', 'visible');
  await expect(hero).toHaveCSS('transform-style', 'preserve-3d');
  await expect(page.locator('.hero-art')).toHaveCSS('transform-style', 'preserve-3d');
  await expect.poll(() => page.evaluate(() => window.heroCorePoints)).toBe(12);
  const planes = await page
    .locator('.hero-copy')
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m43);
  assert.equal(planes, 40);
  const float = await page.locator('.hero-pet-float').evaluate((el) => {
    const a = el.getAnimations()[0];
    return {
      duration: a.effect.getTiming().duration,
      frames: a.effect.getKeyframes().map((f) => f.transform),
    };
  });
  assert.equal(float.duration, 4000);
  assert(float.frames.includes('translateZ(20px)'));
  checks.push(
    'Desktop: real 12-point Canvas2D, unflattened perspective, text Z=40, breathing Z=0..20 / 4s',
  );
  const stopped = async () => {
    await page.waitForTimeout(100);
    const count = await page.evaluate(() => window.heroDraws);
    await page.waitForTimeout(180);
    assert.equal(await page.evaluate(() => window.heroDraws), count);
  };
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(hero).toHaveAttribute('data-active', 'false');
  await stopped();
  await page.evaluate(() => scrollTo(0, 0));
  await expect(hero).toHaveAttribute('data-active', 'true');
  checks.push('IntersectionObserver: no particle draws offscreen; resumes in view');
  await page.setViewportSize({ width: 1440, height: 4000 });
  await page.getByRole('button', { name: '查看物料清单' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(hero).toHaveAttribute('data-active', 'false');
  await stopped();
  await page.getByRole('button', { name: '关闭弹窗' }).press('Escape');
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.evaluate(() => scrollTo(0, 0));
  await expect(hero).toHaveAttribute('data-active', 'true');
  checks.push('Business modal: pauses particles and resumes after close');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(hero).toHaveAttribute('data-active', 'false');
  await stopped();
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(hero).toHaveAttribute('data-active', 'true');
  checks.push('Simulated visibilitychange: no draws while hidden; resumes when visible');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.hero-particles')).toHaveCount(0);
  await expect(hero).toHaveCSS('perspective', 'none');
  await expect(page.locator('.hero-pet-float')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.hero-copy')).toHaveCSS('transform', 'none');
  await expect(page.locator('.hero-liquid')).toHaveAttribute('data-flow', 'false');
  await stopped();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 767, height: 1000 });
  await expect(hero).toHaveAttribute('data-depth', 'false');
  await expect(page.locator('.hero-particles')).toHaveCount(0);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  checks.push('Reduced motion and 767px fine pointer: flat static background, no particle canvas');
  await page.setViewportSize({ width: 1440, height: 1080 });
  await expect(hero).toHaveAttribute('data-active', 'true');
  const button = page.getByRole('button', { name: '进入街坊工坊', exact: true });
  await button.hover();
  await page.mouse.down();
  await expect(button.locator('.button-ripple')).toHaveCount(1);
  await page.screenshot({ path: dir + '/cta-pressed.png' });
  await page.mouse.up();
  await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
  await expect(page.locator('.hero-particles')).toHaveCount(0);
  await stopped();
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'SparkMate 首页' }).click();
    await expect(hero).toHaveAttribute('data-active', 'true');
    await page.getByRole('button', { name: '街坊工坊', exact: true }).click();
    await expect(page.locator('.hero-particles')).toHaveCount(0);
    await stopped();
  }
  assert.equal(await storage(), originalStorage);
  checks.push(
    'CTA ripple/click navigation and repeated unmount: no residual particle draws; storage unchanged',
  );
  for (const width of [320, 1440]) {
    const touch = await browser.newPage({
      viewport: { width, height: 1000 },
      hasTouch: true,
      reducedMotion: 'no-preference',
    });
    await touch.goto(url);
    const stage = touch.locator('.hero-workbench');
    await expect(stage).toHaveAttribute('data-depth', 'false');
    await expect(stage).toHaveCSS('perspective', 'none');
    await expect(touch.locator('.hero-particles')).toHaveCount(0);
    await expect(touch.locator('.hero-pet-float')).toHaveCSS('animation-name', 'none');
    await expect(touch.locator('.hero-copy')).toHaveCSS('transform', 'none');
    await expect(touch.locator('.hero-liquid')).toHaveAttribute('data-flow', 'false');
    assert(await touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await expect(touch.locator('.page-transition')).toHaveCSS('opacity', '1');
    await touch.screenshot({ path: dir + '/touch-' + width + '.png' });
    await touch.close();
  }
  checks.push(
    '320px touch and 1440px coarse pointer: static 2D, no canvas, no horizontal overflow',
  );
  assert.deepEqual(errors, []);
  const report = { passed: checks.length, checks, pageErrors: errors, url, regression: false };
  await writeFile(dir + '/checks.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
