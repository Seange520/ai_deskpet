import { test, expect } from './quality-fixture';
for (const width of [320, 768, 1440]) {
  test('路线卡片标题、真实任务进度与状态独立排版 ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() =>
      localStorage.setItem(
        'sparkmate.routes.v2',
        JSON.stringify({
          routeId: 'classic',
          levelVersion: 1,
          unlockedLevels: ['L1', 'L2'],
          completedLevels: ['L1'],
          routes: {
            classic: { materials: true, wiring: true, code: true },
            quadruped: { materials: true, wiring: false, code: false },
          },
        }),
      ),
    );
    await page.goto('/');
    const cards = page.locator('.route-card');
    await expect(cards).toHaveCount(4);
    for (const [i, label] of ['L1 · 入门', 'L2 · 进阶', 'L3 · 探索', 'L4 · 挑战'].entries()) {
      const c = cards.nth(i);
      await expect(c.locator('.route-level-title')).toHaveText(label);
      await expect(c.locator('.route-level-title')).not.toContainText('/');
      const h = await c.locator('.route-level-title').boundingBox();
      const progress = await c.locator('.route-task-progress').boundingBox();
      expect(progress.y).toBeGreaterThanOrEqual(h.y + h.height);
      const rect = await c.boundingBox();
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width);
    }
    await expect(cards.nth(0).locator('.route-status')).toHaveText('已完成');
    await expect(cards.nth(0)).toContainText('任务进度 4 / 4');
    await expect(cards.nth(1).locator('.route-status')).toHaveText('继续挑战');
    await expect(cards.nth(1)).toContainText('任务进度 1 / 4');
    await expect(cards.nth(2).locator('.route-status')).toContainText('未解锁');
    await expect(cards.nth(2).getByRole('progressbar')).toHaveAttribute('value', '0');
    await cards.nth(1).getByRole('button', { name: '探索迷你四足机器狗', exact: true }).click();
    await page.getByRole('button', { name: '校验册', exact: true }).click();
    await expect(cards.nth(1).locator('.route-status')).toHaveText('当前路线');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page
      .locator('.route-gallery')
      .screenshot({ path: 'test-results/route-cards-' + width + '.png' });
  });
}
