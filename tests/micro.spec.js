import { test, expect } from './quality-fixture';

test('字体、原有主色与液态玻璃实际覆盖面积', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('.hero-liquid')).toHaveAttribute('data-flow', 'true');
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(27, 22, 38)');
  await expect(page.locator('html')).toHaveCSS('font-family', /Inter Variable/);
  const a = await page.locator('.hero-panel').boundingBox(),
    b = await page.locator('.hero-glass').boundingBox();
  expect(b.width).toBeGreaterThan(a.width * 0.95);
  expect(b.height).toBeGreaterThan(a.height * 0.95);
  await expect(page.locator('.hero-glass')).toHaveCSS('backdrop-filter', /blur\(8px\)/);
  await expect(page.locator('.page-transition')).toHaveCSS('opacity', '1');
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.screenshot({ path: 'test-results/micro-home.png' });
  await page.getByRole('button', { name: '誊写房', exact: true }).click();
  await expect(page.locator('.code-line code').first()).toHaveCSS(
    'font-family',
    /JetBrains Mono Variable/,
  );
});

test('微小磁吸、鼠标与键盘涟漪保留按钮原有语义', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const button = page.getByRole('button', { name: '进入街坊工坊', exact: true });
  const r = await button.boundingBox();
  await page.mouse.move(r.x + r.width * 0.8, r.y + r.height * 0.6);
  await expect
    .poll(() => button.evaluate((el) => parseFloat(el.style.getPropertyValue('--magnet-x')) || 0))
    .toBeGreaterThan(0);
  await page.mouse.down();
  await expect(button.locator('.button-ripple')).toHaveCount(1);
  await expect(button.locator('.cta-shimmer')).toHaveCSS('opacity', '0.15');
  await page.mouse.move(1, 1);
  await page.mouse.up();
  await expect(button.locator('.button-ripple')).toHaveCount(0);
  await expect
    .poll(() => button.evaluate((el) => el.style.getPropertyValue('--magnet-x')))
    .toBe('0px');
  await page.getByRole('button', { name: '重置学习进度' }).focus();
  await page.getByRole('button', { name: '重置学习进度' }).press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('分层视差、低亮度聚光灯与实际帧间隔采样', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const card = page.getByRole('article').first();
  await card.scrollIntoViewIfNeeded();
  const r = await card.boundingBox();
  await page.mouse.move(r.x + r.width * 0.8, r.y + r.height * 0.25);
  await expect(card.locator('.level-illustration')).not.toHaveCSS(
    'transform',
    'matrix(1, 0, 0, 1, 0, 0)',
  );
  await expect
    .poll(() =>
      card.evaluate((el) => {
        const illustration = new DOMMatrix(
          getComputedStyle(el.querySelector('.level-illustration')).transform,
        );
        const heading = new DOMMatrix(getComputedStyle(el.querySelector('h3')).transform);
        return Math.abs(illustration.m43 - heading.m43);
      }),
    )
    .toBeGreaterThan(1);
  await expect(page.locator('.card-tilt [data-spotlight-border]').first()).toHaveCSS(
    'opacity',
    '0.12',
  );
  const samples = await card.evaluate(
    (el) =>
      new Promise((resolve) => {
        const times = [];
        let previous = performance.now(),
          n = 0;
        const r = el.getBoundingClientRect();
        function tick(now) {
          if (n > 0) times.push(now - previous);
          previous = now;
          el.dispatchEvent(
            new MouseEvent('mousemove', {
              bubbles: true,
              clientX: r.x + r.width * (0.3 + 0.3 * Math.sin(n / 10)),
              clientY: r.y + r.height * 0.4,
            }),
          );
          if (++n < 90) requestAnimationFrame(tick);
          else resolve(times);
        }
        requestAnimationFrame(tick);
      }),
  );
  const sorted = [...samples].sort((a, b) => a - b);
  await testInfo.attach('frame-sampling', {
    body: JSON.stringify(
      {
        samples: samples.length,
        medianMs: sorted[Math.floor(sorted.length / 2)],
        p95Ms: sorted[Math.floor(sorted.length * 0.95)],
        note: '本机无头 Chrome 样本，不代表全部设备性能',
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
  expect(samples.length).toBe(89);
  await page.screenshot({ path: 'test-results/micro-tilt.png' });
});

test('减少动态效果时关闭空间动效与涟漪，导航仍能使用', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: '进入街坊工坊', exact: true });
  await button.hover();
  await page.mouse.down();
  await expect(button.locator('.button-ripple')).toHaveCount(0);
  await expect(page.locator('.hero-liquid')).toHaveAttribute('data-flow', 'false');
  await expect(page.locator('.page-transition')).toHaveCSS('clip-path', 'none');
  await page.mouse.up();
  await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
});

test.describe('触屏降级', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('关闭磁吸与折射，不拦截滚动与导航', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.locator('.hero-liquid')).toHaveAttribute('data-flow', 'false');
    await expect(page.locator('.hero-glass')).toHaveCSS('backdrop-filter', 'none');
    await page.getByRole('button', { name: '街坊工坊', exact: true }).tap();
    await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
});
