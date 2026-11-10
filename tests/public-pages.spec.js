import { test, expect } from '@playwright/test';

// 静态公开页（官网 / 档案阅读 / 内测反馈）不依赖游戏主 bundle，
// 单独守住：可打开、关键内容在、无页面脚本错误。

test.describe('公开静态页', () => {
  test('官网：标题、下载区、内测反馈入口', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/site/index.html', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/第七校验/);
    await expect(page.locator('h1').first()).toContainText('第七校验');
    await expect(page.locator('a[href="../feedback/index.html"]')).toHaveCount(1);
    await expect(page.locator('text=先做能一个人安静修好的版本')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('档案阅读：22 章目录与切章', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/novel/index.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#toc button')).toHaveCount(22);
    await expect(page.locator('article h1')).toContainText('第一章');
    await page.locator('#toc button').nth(3).click();
    await expect(page.locator('article h1')).toContainText('第四章');
    await expect(page.locator('#toc button[aria-current="true"]')).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('内测反馈：表单可填、诊断可见、复制与下载按钮存在', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/feedback/index.html', { waitUntil: 'domcontentloaded' });
    await page.fill('#device', '自动化测试设备');
    await page.fill('#oneLine', '一句话反馈');
    await expect(page.locator('#diag')).toContainText('版本');
    await expect(page.locator('#copy')).toBeVisible();
    await expect(page.locator('#download')).toBeVisible();
    const draft = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('sparkmate.checksum.playtest.v1') || '{}'),
    );
    expect(draft.device).toBe('自动化测试设备');
    expect(errors).toEqual([]);
  });
});
