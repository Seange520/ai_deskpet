import { expect } from '@playwright/test';
export const levelPrograms = [
  'move("forward"); light("on");',
  'move("backward"); light("on"); play("success");',
  'move("forward"); move("stop"); light("off");',
  'light("on"); move("forward"); move("backward"); move("stop"); light("off"); play("success");',
];
const routes = ['classic', 'quadruped', 'tracked', 'spherical'];
// 原有选路回归通过真实挑战建立前置条件，不注入 store 或绕过锁。
export async function unlockThrough(page, count = 3) {
  for (let i = 0; i < count; i++) {
    await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
    await page.getByLabel('切换路线', { exact: true }).selectOption(routes[i]);
    await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
    await page.getByLabel('桌宠伪代码', { exact: true }).fill(levelPrograms[i]);
    await page.getByRole('button', { name: '运行代码', exact: true }).click();
    await expect(page.getByRole('region', { name: '通关目标' })).toContainText('已通关');
  }
  await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
  await page.getByLabel('切换路线', { exact: true }).selectOption('classic');
  await page.getByRole('button', { name: '学习仪表盘', exact: true }).click();
}
