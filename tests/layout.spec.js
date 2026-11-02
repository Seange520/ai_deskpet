import { test, expect } from '@playwright/test';

// 覆盖原布局容易挤压的宽度，并验证弹窗在真实绘制顺序中高于导航。
for (const width of [320, 390, 768, 1024, 1440, 1920]) {
  test(`布局与弹窗层级：${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.locator('main > div').last()).toHaveCSS('opacity', '1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    const cards = await page.getByRole('article').all();
    const rects = await Promise.all(cards.map((card) => card.boundingBox()));
    for (let i = 1; i < rects.length; i++) {
      const a = rects[i - 1],
        b = rects[i];
      expect(b.x >= a.x + a.width - 1 || b.y >= a.y + a.height - 1).toBe(true);
    }
    const main = await page.locator('main').boundingBox();
    const nav = await page.locator('aside').boundingBox();
    expect(width > 960 ? nav.x + nav.width <= main.x : nav.y + nav.height <= main.y).toBe(true);
    await page.getByRole('button', { name: '查看物料清单' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(
      await page.locator('aside').evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(
          Math.max(1, r.x + r.width / 2),
          Math.max(1, r.y + 20),
        );
        return Boolean(hit?.closest('.modal-backdrop'));
      }),
    ).toBe(true);
    await page.getByRole('button', { name: '关闭弹窗' }).press('Escape');
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo(0, 0);
    });
    if (width === 1440 || width === 390)
      await page.screenshot({ path: `test-results/layout-${width}.png` });
    await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
    await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
    await expect(page.getByRole('slider')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}

test('按钮按压缩放与卡片呼吸边缘', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const button = page.getByRole('button', { name: '进入硬件实验室', exact: true });
  await button.scrollIntoViewIfNeeded();
  await button.hover();
  await page.mouse.down();
  await expect
    .poll(() => button.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a))
    .toBeCloseTo(0.95, 2);
  await page.mouse.move(1, 1);
  await page.mouse.up();
  await page.getByRole('article').first().hover();
  await expect(page.getByRole('article').first()).toHaveCSS('animation-name', 'edge-breathe');
});
