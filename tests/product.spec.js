import { test, expect } from './quality-fixture';

test('访客免登录入口与常驻伙伴的好奇反馈', async ({ page }) => {
  await page.goto('/');
  const buddy = page.getByRole('button', { name: '收起桌宠伙伴' });
  await buddy.hover();
  await expect(page.locator('.companion-bubble')).toContainText('在看什么');
  await page.getByRole('button', { name: '零门槛体验 · 虚拟连线' }).click();
  await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
  await page.getByRole('button', { name: '校验册', exact: true }).click();
  await page.getByRole('button', { name: /直接体验代码调参/ }).click();
  await expect(page.getByRole('slider')).toBeVisible();
  await page.getByRole('button', { name: '星云紫', exact: true }).click();
  await expect(page.locator('.editor')).toContainText('#B39AFF');
});

test('物料电商卡片、示例价格、套装浮窗和学习反馈', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '查看物料清单' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.material-card')).toHaveCount(4);
  await expect(dialog).toContainText('示例合计 ¥119');
  await page.getByRole('button', { name: '一键加入新手套装' }).click();
  await expect(page.locator('.kit-popover')).toContainText('不收款、不下单');
  await page.getByRole('button', { name: '确认加入我的套装' }).click();
  await expect(page.getByRole('status')).toContainText('已加入我的新手套装');
  for (const checkbox of await dialog.getByRole('checkbox').all()) await checkbox.check();
  await dialog.getByRole('button', { name: /我已认识全部物料/ }).click();
  await expect(page.locator('.experience-text')).toContainText('100');
  await expect(page.locator('.companion-bubble')).toContainText('物料准备好啦');
});

test('排行榜明确展示 Mock 数据与本机积分，手机不溢出', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.addInitScript(() =>
    localStorage.setItem(
      'sparkmate.progress.v1',
      JSON.stringify({ materials: true, wiring: true, code: false }),
    ),
  );
  await page.goto('/');
  await page.getByRole('button', { name: '委托板', exact: true }).click();
  await expect(page.getByRole('heading', { name: /委托板/ })).toBeVisible();
  await expect(page.locator('.rank-board')).toContainText('示例数据');
  await expect(page.locator('.rank-board li.is-you')).toContainText('350');
  await expect(page.locator('.rank-summary')).toContainText('第 4 名');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('毕业证书、作品卡下载和商城转化闭环', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'sparkmate.progress.v1',
      JSON.stringify({ materials: true, wiring: true, code: false }),
    );
    Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '誊写房', exact: true }).click();
  await page.getByRole('button', { name: '星云紫', exact: true }).click();
  await page.getByRole('button', { name: /唤醒伙伴 · 领取/ }).click();
  await expect(page.getByRole('dialog')).toContainText('毕业证书');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '分享我的作品' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('第七校验-我的作品.svg');
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('作品卡已下载');
  await expect(page.locator('.modal-backdrop')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'test-results/graduation.png' });
  await page.getByRole('button', { name: '前往商城获取实体套件' }).click();
  await expect(page.getByRole('heading', { name: '新手实体套件', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('不构成报价');
  await expect(page.locator('.modal-backdrop')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'test-results/materials-shop.png' });
});
