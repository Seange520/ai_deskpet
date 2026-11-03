import { unlockThrough } from './level-helpers';
import { test, expect } from '@playwright/test';

const routes = [
  { id: 'classic', code: 'pet.setExpression("happy")', hardware: /ESP32-S3 开发板/ },
  { id: 'quadruped', code: 'myServo.write(90)', hardware: /SG90 舵机/ },
  { id: 'tracked', code: 'digitalWrite(MotorA, HIGH)', hardware: /L298N 电机驱动/ },
  { id: 'spherical', code: 'mpu.getEvent(&a, &g, &temp)', hardware: /MPU6050/ },
];
for (const route of routes) {
  test(`${route.id}：真实物料、专属代码、参数预览与模拟 IDE`, async ({ page }) => {
    await page.addInitScript(
      ({ id }) =>
        localStorage.setItem(
          'sparkmate.routes.v2',
          JSON.stringify({
            routeId: id,
            routes: { [id]: { materials: false, wiring: true, code: false } },
          }),
        ),
      { id: route.id },
    );
    await page.goto('/');
    await page.getByRole('button', { name: '查看物料清单' }).click();
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: route.hardware }),
    ).toBeVisible();
    if (route.id === 'quadruped') await expect(page.getByRole('dialog')).toContainText('× 8');
    await page.getByRole('button', { name: '关闭弹窗' }).press('Escape');
    await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
    await expect(page.locator('.editor')).toContainText(route.code);
    await expect(page.getByRole('button', { name: '上传（模拟）' })).toBeDisabled();
    await page.getByRole('button', { name: '验证（模拟）' }).click();
    await expect(page.locator('.ide-feedback')).toContainText('不进行 C++ 编译');
    await page.getByRole('button', { name: '上传（模拟）' }).click();
    await expect(page.locator('.ide-feedback')).toContainText('没有连接串口或烧录');
    if (route.id === 'classic') {
      await page.getByLabel('表情模式').selectOption('curious');
      await expect(page.locator('.editor')).toContainText('pet.setExpression("curious")');
    } else if (route.id === 'quadruped') {
      await expect(page.locator('.editor')).toContainText('#include <Servo.h>');
      await expect(page.locator('.editor')).toContainText('#include <ESP32Servo.h>');
      await page.getByRole('slider', { name: '关节角度' }).focus();
      await page.getByRole('slider', { name: '关节角度' }).press('End');
      await expect(page.locator('.editor')).toContainText('myServo.write(135)');
      await expect(page.getByRole('img', { name: '舵机关节角度 135 度' })).toBeVisible();
    } else if (route.id === 'tracked') {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.getByLabel('电机方向', { exact: true }).selectOption('reverse');
      await expect(page.locator('.editor')).toContainText('Direction mode = REVERSE');
      await expect(page.getByRole('img', { name: 'L298N 电机预览：反转' })).toBeVisible();
      await page.getByLabel('电机方向', { exact: true }).selectOption('stop');
      await expect(page.locator('.motor-wheel').first()).toHaveCSS(
        'animation-play-state',
        'paused',
      );
    } else {
      await expect(page.locator('.editor')).toContainText('a.acceleration.x');
      await expect(page.locator('.editor')).toContainText('g.gyro.y');
      await page.getByRole('slider', { name: '模拟俯仰角' }).focus();
      await page.getByRole('slider', { name: '模拟俯仰角' }).press('End');
      await expect(page.getByRole('img', { name: 'MPU6050 模拟俯仰 40 度' })).toBeVisible();
      await expect(page.locator('.experiment-readout')).toContainText('Ax -6.31 / Az 7.51');
    }
    await expect(page.getByRole('button', { name: '上传（模拟）' })).toBeDisabled();
    if (route.id !== 'classic')
      await expect(page.locator('.editor')).not.toContainText('pet.setExpression');
    if (route.id === 'quadruped' || route.id === 'spherical')
      await page.screenshot({ path: `test-results/workshop-${route.id}.png`, fullPage: true });
  });
}

test('VCC 误接 GND 的全屏模拟烧板、键盘焦点与重置恢复', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
  const a = await page.getByRole('button', { name: '麦克风 VCC 引脚', exact: true }).boundingBox();
  const b = await page.getByRole('button', { name: '主板 GND 引脚', exact: true }).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
  const failure = page.getByRole('alertdialog');
  await expect(failure).toContainText('BOOM！你的开发板烧了，重新买一块吧（点击重置）');
  await expect(page.locator('.app-shell')).toHaveAttribute('inert', '');
  const reset = page.getByRole('button', { name: '重置模拟开发板' });
  await reset.press('Tab');
  await expect(reset).toBeFocused();
  const r = await failure.boundingBox();
  expect(r.x).toBe(0);
  expect(r.y).toBe(0);
  expect(r.width).toBe(1440);
  await page.screenshot({ path: 'test-results/burnout.png' });
  await reset.click();
  await expect(failure).toHaveCount(0);
  await expect(page.locator('.app-shell')).not.toHaveAttribute('inert');
  await expect(page.getByRole('button', { name: /前往代码魔改工坊/ })).toBeDisabled();
  for (const [source, target] of [
    ['VCC', '3V3'],
    ['GND', 'GND'],
  ]) {
    await page.getByRole('button', { name: `麦克风 ${source} 引脚`, exact: true }).press('Enter');
    await page.getByRole('button', { name: `主板 ${target} 引脚`, exact: true }).press('Enter');
  }
  await expect(page.getByRole('button', { name: /前往代码魔改工坊/ })).toBeEnabled();
  await expect(page.locator('.experience-text')).toContainText('250');
});

test('避坑提示按路线切换，普通信号接错仅红线，不触发烧板', async ({ page }) => {
  await page.goto('/');
  await unlockThrough(page);
  await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
  await expect(page.getByRole('region', { name: '创客避坑指南' })).toContainText('VCC 和 GND');
  await page.getByLabel('切换路线', { exact: true }).selectOption('quadruped');
  await expect(page.getByRole('region', { name: '创客避坑指南' })).toContainText('8个舵机同时转动');
  await expect(page.getByRole('region', { name: '创客避坑指南' })).toContainText('公对母');
  await page.getByRole('button', { name: '舵机 PWM 引脚', exact: true }).press('Enter');
  await page.getByRole('button', { name: '主板 GND 引脚', exact: true }).press('Enter');
  await expect(page.getByRole('alert')).toContainText('危险！');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await page.getByLabel('切换路线', { exact: true }).selectOption('tracked');
  await expect(page.getByRole('region', { name: '创客避坑指南' })).toContainText('公对母');
  await expect(page.getByRole('region', { name: '创客避坑指南' })).not.toContainText(
    '8个舵机同时转动',
  );
  await page.getByLabel('切换路线', { exact: true }).selectOption('spherical');
  await expect(page.getByRole('region', { name: '创客避坑指南' })).toContainText('角速度');
});
