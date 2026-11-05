import { test, expect } from './quality-fixture';

test('完整学习流程：错线警告、拖拽连线、实时参数与进度持久化', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /每个伟大的创造/ })).toBeVisible();
  // 弹窗取消后将键盘焦点还给原按钮，便于连续操作。
  const materialsButton = page.getByRole('button', { name: '查看物料清单' });
  await materialsButton.click();
  await page.getByRole('button', { name: '关闭弹窗' }).press('Escape');
  await expect(materialsButton).toBeFocused();
  await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true });
  await page.getByRole('button', { name: '查看物料清单' }).click();
  const dialog = page.getByRole('dialog');
  for (const item of await dialog.getByRole('checkbox').all()) await item.check();
  await dialog.getByRole('button', { name: /我已认识全部物料/ }).click();
  await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
  await page.getByRole('button', { name: '拆解', exact: true }).click();
  await expect(page.locator('.exploded-scene')).toHaveClass(/is-exploded/);
  // 先接错 VCC→GND，再验证两条正确连线。
  async function wire(from, to) {
    const a = await page
      .getByRole('button', { name: `麦克风 ${from} 引脚`, exact: true })
      .boundingBox();
    const b = await page
      .getByRole('button', { name: `主板 ${to} 引脚`, exact: true })
      .boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
    await page.mouse.up();
  }
  await wire('VCC', 'GND');
  await expect(page.getByRole('alert')).toContainText('危险！可能烧毁主板！');
  await expect(page.getByRole('alertdialog')).toContainText('BOOM！');
  await page.getByRole('button', { name: '重置模拟开发板' }).click();
  await expect(page.getByRole('button', { name: /前往代码魔改工坊/ })).toBeDisabled();
  await wire('VCC', '3V3');
  await wire('GND', 'GND');
  await expect(page.locator('.wire-feedback')).toContainText('电源连接正确');
  await page.screenshot({ path: 'test-results/hardware.png', fullPage: true });
  await page.getByRole('button', { name: /前往代码魔改工坊/ }).click();
  const slider = page.getByRole('slider', { name: '眨眼间隔' });
  await slider.focus();
  await slider.press('Home');
  await expect(page.locator('.editor')).toContainText('pet.blinkEvery(600)');
  await page.getByRole('button', { name: '星云紫', exact: true }).click();
  await expect(page.locator('.editor')).toContainText('#B39AFF');
  await page.getByLabel('表情模式').selectOption('curious');
  await expect(page.getByRole('img', { name: '桌宠表情：好奇' })).toBeVisible();
  await page.screenshot({ path: 'test-results/codelab.png', fullPage: true });
  await page.getByRole('button', { name: /唤醒伙伴 · 领取/ }).click();
  await expect(page.getByRole('dialog')).toContainText('你好，桌宠创造者');
  await page.getByRole('button', { name: '查看我的成就' }).click();
  await expect(page.locator('.experience-text')).toContainText('500');
  await page.reload();
  await expect(page.locator('.badge.unlocked')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('键盘连线、重置接线和成就锁定', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
  await expect(page.getByRole('button', { name: '完成接线后解锁成就' })).toBeDisabled();
  await page.getByRole('button', { name: '去接线' }).click();
  for (const [a, b] of [
    ['VCC', '3V3'],
    ['GND', 'GND'],
  ]) {
    await page.getByRole('button', { name: `麦克风 ${a} 引脚`, exact: true }).press('Enter');
    await page.getByRole('button', { name: `主板 ${b} 引脚`, exact: true }).press('Enter');
  }
  await expect(page.getByRole('button', { name: /前往代码魔改工坊/ })).toBeEnabled();
  await page.getByRole('button', { name: '重置接线' }).click();
  await expect(page.getByRole('button', { name: /前往代码魔改工坊/ })).toBeDisabled();
  await page.getByRole('button', { name: '重置学习进度' }).click();
  await page.getByRole('button', { name: '确认重置' }).click();
  await expect(page.locator('.badge.unlocked')).toHaveCount(1);
  await expect(page.locator('.experience-text')).toContainText('0 / 2200 XP');
});

test('手机布局无横向溢出、损坏的存储可恢复', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('sparkmate.progress.v1', 'broken-json'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /每个伟大的创造/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
  await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
