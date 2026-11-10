import { test, expect } from '@playwright/test';

test('课节深链直接打开对应任务简报', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?lesson=AD-01&boot=0');
  await expect(page.locator('.teaching-panel')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.teaching-run')).toHaveAttribute('data-lesson-v2', 'AD-01');
  expect(errors).toEqual([]);
});

test('锁着的课节给出提示而不是静默失败', async ({ page }) => {
  await page.goto('/?lesson=K0-02&boot=0');
  await expect(page.locator('.teaching-panel')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.deep-link-note')).toContainText('还锁着');
});
