import { test, expect } from './quality-fixture';

test('Stage Tier 2 挂载真实 WebGL，导航复用 Canvas，Tier 0 保留 DOM', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?quality=2');
  await expect(page.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
  const canvas = page.getByTestId('scene-stage').locator('canvas');
  await expect(canvas).toBeVisible();
  const original = await canvas.elementHandle();
  await expect
    .poll(() =>
      canvas.evaluate((node) => {
        const gl = node.getContext('webgl2');
        return Boolean(gl && !gl.isContextLost());
      }),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const url = performance
          .getEntriesByType('resource')
          .find((r) => r.name.includes('/@react-three_fiber.js'))?.name;
        if (!url) return 0;
        const { _roots } = await import(url);
        return (
          _roots.get(document.querySelector('.scene-stage canvas'))?.store.getState().gl.info.render
            .triangles || 0
        );
      }),
    )
    .toBeGreaterThan(0);
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.getByRole('button', { name: '街坊工坊', exact: true }).click();
  await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
  await page.getByRole('button', { name: '校验册', exact: true }).click();
  expect(await canvas.evaluate((node, original) => node === original, original)).toBe(true);
  await page.goto('/?quality=dom');
  await expect(page.locator('.render-shell')).toHaveAttribute('data-quality-tier', '0');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('article')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('四岛投影热点按顺序聚焦，进出工作台复用同一 Stage', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?quality=2');
  const shell = page.locator('.app-shell');
  const dock = page.getByRole('navigation', { name: '主导航' });
  await expect(shell).toHaveAttribute('data-space-phase', 'idle');
  await expect(dock).toHaveAttribute('data-positioned', 'true');
  const buttons = dock.getByRole('button');
  await expect(buttons).toHaveCount(4);
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await expect(page.locator('.page-transition')).toHaveCount(0);
  const canvas = page.getByTestId('scene-stage').locator('canvas');
  const original = await canvas.elementHandle();
  await buttons.first().focus();
  for (let index = 0; index < 4; index += 1) {
    await expect(buttons.nth(index)).toBeFocused();
    if (index < 3) await page.keyboard.press('Tab');
  }
  const hardware = dock.getByRole('button', { name: '街坊工坊' });
  await hardware.click();
  await expect(shell).toHaveAttribute('data-space-phase', 'entering');
  await expect(page.getByRole('heading', { name: /认识它/ })).toHaveCount(0);
  await expect(shell).toHaveAttribute('data-space-phase', 'detail');
  await expect(hardware).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
  await expect(page.locator('.page-transition')).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: '返回大世界' }).press('Enter');
  await expect(shell).toHaveAttribute('data-space-phase', 'leaving');
  await expect(page.locator('.page-transition')).toHaveAttribute('inert', '');
  await expect(shell).toHaveAttribute('data-space-phase', 'idle');
  await expect(hardware).toBeFocused();
  await expect(page.locator('.page-transition')).toHaveCount(0);
  expect(await canvas.evaluate((node, original) => node === original, original)).toBe(true);
});
