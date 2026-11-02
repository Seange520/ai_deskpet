import { test, expect } from '@playwright/test';

const cases = [
  {
    id: 'classic',
    name: '经典方块桌宠',
    source: '麦克风',
    parts: ['board', 'screen', 'mic'],
    count: 4,
    total: 119,
    pairs: [
      ['VCC', '3V3'],
      ['GND', 'GND'],
    ],
  },
  {
    id: 'quadruped',
    name: '迷你四足机器狗',
    source: '舵机',
    parts: ['frame', 'board', 'servos', 'screen'],
    count: 6,
    total: 280,
    pairs: [
      ['PWM', 'GPIO4'],
      ['GND', 'GND'],
    ],
  },
  {
    id: 'tracked',
    name: '履带/麦轮小车',
    source: '电机驱动',
    parts: ['chassis', 'board', 'driver'],
    count: 5,
    total: 204,
    pairs: [
      ['IN1', 'GPIO5'],
      ['GND', 'GND'],
    ],
  },
  {
    id: 'spherical',
    name: '球形自平衡机器人',
    source: 'IMU',
    parts: ['actuator', 'board', 'imu', 'shell'],
    count: 6,
    total: 283,
    pairs: [
      ['VCC', '3V3'],
      ['GND', 'GND'],
      ['SDA', 'GPIO8'],
      ['SCL', 'GPIO9'],
    ],
  },
];

for (const route of cases) {
  test(`${route.name}：选路、部件拆解、专属引脚、物料与刷新恢复`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.getByRole('button', { name: `探索${route.name}`, exact: true }).click();
    await expect(page.getByLabel('切换路线', { exact: true })).toHaveValue(route.id);
    await expect(page.locator('.exploded-scene')).toHaveAttribute('data-route', route.id);
    expect(
      await page.locator('[data-part]').evaluateAll((nodes) => nodes.map((n) => n.dataset.part)),
    ).toEqual(route.parts);
    const before = await page
      .locator('[data-part]')
      .evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n).transform));
    await page.getByRole('button', { name: '拆解', exact: true }).click();
    const after = await page
      .locator('[data-part]')
      .evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n).transform));
    for (let i = 0; i < before.length; i++) expect(after[i]).not.toBe(before[i]);
    await expect(page.locator('.wiring-svg [role="button"]')).toHaveCount(route.pairs.length * 2);
    // 错误的第一根信号不能解锁；改正全部配对才完成当前路线。
    await page
      .getByRole('button', { name: `${route.source} ${route.pairs[0][0]} 引脚`, exact: true })
      .press('Enter');
    await page
      .getByRole('button', { name: `主板 ${route.pairs[1][1]} 引脚`, exact: true })
      .press('Enter');
    await expect(page.getByRole('alert')).toContainText('危险！可能烧毁主板！');
    await expect(page.getByRole('button', { name: /前往代码魔改工坊/ })).toBeDisabled();
    for (const [source, target] of route.pairs) {
      if (route.id === 'spherical') {
        const a = await page
          .getByRole('button', { name: `${route.source} ${source} 引脚`, exact: true })
          .boundingBox();
        const b = await page
          .getByRole('button', { name: `主板 ${target} 引脚`, exact: true })
          .boundingBox();
        await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
        await page.mouse.down();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
        await page.mouse.up();
        continue;
      }
      await page
        .getByRole('button', { name: `${route.source} ${source} 引脚`, exact: true })
        .press('Enter');
      await page.getByRole('button', { name: `主板 ${target} 引脚`, exact: true }).press('Enter');
    }
    await expect(page.getByRole('button', { name: /前往代码魔改工坊/ })).toBeEnabled();
    await expect(page.locator('.experience-text')).toContainText('250');
    if (route.id === 'quadruped' || route.id === 'spherical') {
      await page.mouse.move(1, 1);
      await page.screenshot({ path: `test-results/route-${route.id}.png`, fullPage: true });
    }
    await page.getByRole('button', { name: `准备物料 · ${route.name}`, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('物料路线', { exact: true })).toHaveValue(route.id);
    await expect(dialog.locator('.material-card')).toHaveCount(route.count);
    await expect(dialog).toContainText(`示例合计 ¥${route.total}`);
    if (route.id === 'quadruped')
      await expect(dialog.getByRole('heading', { name: /SG90 舵机/ })).toContainText('× 8');
    for (const checkbox of await dialog.getByRole('checkbox').all()) await checkbox.check();
    await dialog.getByRole('button', { name: /我已认识全部物料/ }).click();
    await expect(page.locator('.experience-text')).toContainText('350');
    await page.reload();
    await expect(page.locator('.project-chip')).toContainText(route.name);
    await expect(page.locator('.experience-text')).toContainText('350');
    await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
    await expect(page.getByLabel('切换路线', { exact: true })).toHaveValue(route.id);
    await expect(page.getByRole('button', { name: /前往代码魔改工坊/ })).toBeEnabled();
    expect(errors).toEqual([]);
  });
}

test('切换时清除未完成的接线、拖线与警告，不串用物料勾选和成就', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
  await page.getByRole('button', { name: '麦克风 VCC 引脚', exact: true }).press('Enter');
  await page.getByRole('button', { name: '主板 3V3 引脚', exact: true }).press('Enter');
  await page.getByRole('button', { name: '麦克风 GND 引脚', exact: true }).press('Enter');
  await page.getByLabel('切换路线', { exact: true }).selectOption('quadruped');
  await expect(page.getByRole('button', { name: '舵机 PWM 引脚', exact: true })).toBeVisible();
  await expect(page.locator('.wiring-svg path')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /前往代码魔改工坊/ })).toBeDisabled();
  await page.getByRole('button', { name: '准备物料 · 迷你四足机器狗', exact: true }).click();
  await page.getByRole('checkbox').first().check();
  await page.getByLabel('物料路线', { exact: true }).selectOption('spherical');
  await expect(page.getByRole('checkbox')).toHaveCount(6);
  expect(
    await page.getByRole('checkbox').evaluateAll((nodes) => nodes.every((n) => !n.checked)),
  ).toBe(true);
  await page.getByRole('button', { name: '关闭弹窗' }).press('Escape');
  await expect(page.getByRole('button', { name: 'IMU SDA 引脚', exact: true })).toBeVisible();
  await expect(page.locator('.experience-text')).toContainText('0 / 500 XP');
});

test('旧进度迁移到经典路线，其他路线独立，重置清空全部路线', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'sparkmate.progress.v1',
      JSON.stringify({ materials: true, wiring: true, code: false }),
    ),
  );
  await page.goto('/');
  await expect(page.locator('.experience-text')).toContainText('350');
  await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
  await page.getByLabel('切换路线', { exact: true }).selectOption('quadruped');
  await expect(page.locator('.experience-text')).toContainText('0 / 500 XP');
  await page.getByLabel('切换路线', { exact: true }).selectOption('classic');
  await expect(page.locator('.experience-text')).toContainText('350');
  await page.getByRole('button', { name: '重置学习进度' }).click();
  await page.getByRole('button', { name: '确认重置' }).click();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('sparkmate.routes.v2')));
  expect(state.routeId).toBe('classic');
  expect(Object.values(state.routes).every((p) => !p.materials && !p.wiring && !p.code)).toBe(true);
});

test('手机直接选物料与四路线切换无横向溢出，损坏记录安全回退', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.addInitScript(() =>
    localStorage.setItem(
      'sparkmate.routes.v2',
      JSON.stringify({
        routeId: 'unknown',
        routes: { classic: { materials: 'true', wiring: false, code: true } },
      }),
    ),
  );
  await page.goto('/');
  await expect(page.locator('.experience-text')).toContainText('0 / 500 XP');
  await page.getByRole('button', { name: '准备物料 · 球形自平衡机器人', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('物料路线', { exact: true })).toHaveValue(
    'spherical',
  );
  await page.getByRole('button', { name: '关闭弹窗' }).press('Escape');
  for (const route of cases) {
    await page.getByLabel('切换路线', { exact: true }).selectOption(route.id);
    await expect(page.locator('.exploded-scene')).toHaveAttribute('data-route', route.id);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
