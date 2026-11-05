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
  await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
  await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
  await page.getByRole('button', { name: '学习仪表盘', exact: true }).click();
  expect(await canvas.evaluate((node, original) => node === original, original)).toBe(true);
  await page.goto('/?quality=dom');
  await expect(page.locator('.render-shell')).toHaveAttribute('data-quality-tier', '0');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('article')).toHaveCount(3);
  expect(errors).toEqual([]);
});
