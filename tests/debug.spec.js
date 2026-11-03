import { test, expect } from '@playwright/test';
const cases = [
  {
    id: 'classic',
    power: 'VCC',
    wrong: 'GND',
    correct: '3V3',
    signal: 'SD',
    badSignal: 'GPIO8',
    goodSignal: 'GPIO4',
  },
  {
    id: 'quadruped',
    power: 'VCC',
    wrong: 'GND',
    correct: 'EXT5V',
    signal: 'PWM',
    badSignal: 'GPIO8',
    goodSignal: 'GPIO4',
  },
  {
    id: 'tracked',
    power: 'ENA',
    wrong: 'GPIO5',
    correct: 'GPIO7',
    signal: 'IN1',
    badSignal: 'GPIO6',
    goodSignal: 'GPIO5',
  },
  {
    id: 'spherical',
    power: 'VCC',
    wrong: 'GND',
    correct: '3V3',
    signal: 'SDA',
    badSignal: 'GPIO9',
    goodSignal: 'GPIO8',
  },
];
const read = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('sparkmate.routes.v2')));
async function enter(page) {
  await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
  await page.getByRole('button', { name: 'Debug 挑战', exact: true }).click();
}
for (const route of cases) {
  test(route.id + '：定位错误、键盘修复、首次 XP、两题幂等持久化与排名联动', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript((id) => {
      if (localStorage.getItem('seeded')) return;
      localStorage.setItem('seeded', '1');
      localStorage.setItem(
        'sparkmate.routes.v2',
        JSON.stringify({ routeId: id, routes: { [id]: { wiring: true } } }),
      );
    }, route.id);
    await page.goto('/');
    await page.getByRole('button', { name: '创客排位', exact: true }).click();
    await expect(page.locator('.rank-summary')).toContainText('第 5 名');
    await enter(page);
    await page.getByRole('button', { name: '检查连线 GND → GND', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('模拟短路警告');
    await expect(page.locator('.debug-feedback')).toHaveCSS('color', 'rgb(255, 151, 151)');
    await expect(page.locator('.experience-text')).toContainText('250 / 2200 XP');
    await page
      .getByRole('button', { name: '检查连线 ' + route.power + ' → ' + route.wrong, exact: true })
      .press('Enter');
    await expect(page.locator('.debug-feedback')).toContainText('修复成功');
    await expect(page.locator('.debug-feedback')).toContainText('+25 XP');
    await expect(page.locator('.debug-feedback')).toHaveCSS('color', 'rgb(110, 231, 183)');
    await expect(page.locator('.experience-text')).toContainText('275 / 2200 XP');
    await expect(page.getByRole('progressbar', { name: '全局学习进度' })).toHaveAttribute(
      'aria-valuenow',
      '275',
    );
    await page.getByRole('button', { name: '重新练习此题' }).click();
    await page.getByRole('button', { name: '检查目标引脚 ' + route.wrong, exact: true }).click();
    await expect(page.locator('.debug-feedback')).toContainText('重复练习不加分');
    await expect(page.locator('.experience-text')).toContainText('275 / 2200 XP');
    await page.getByLabel('选择故障题', { exact: true }).selectOption('1');
    await page
      .getByRole('button', { name: '检查目标引脚 ' + route.badSignal, exact: true })
      .click();
    await expect(page.locator('.debug-feedback')).toContainText(
      route.signal + ' → ' + route.goodSignal,
    );
    await expect(page.locator('.experience-text')).toContainText('300 / 2200 XP');
    expect((await read(page)).completedLevels).toEqual([]);
    expect((await read(page)).routes[route.id]).toEqual({
      materials: false,
      wiring: true,
      code: false,
    });
    await page.getByRole('button', { name: '创客排位', exact: true }).click();
    await expect(page.locator('.rank-summary')).toContainText('第 4 名');
    await page.reload();
    await expect(page.locator('.experience-text')).toContainText('300 / 2200 XP');
    await enter(page);
    await expect(page.locator('.debug-feedback')).toContainText('本题奖励已领取');
    await page.getByRole('button', { name: '正常模式', exact: true }).click();
    await expect(page.getByRole('button', { name: /前往代码魔改工坊/ })).toBeEnabled();
    expect(errors).toEqual([]);
  });
}

test('正常模式未完成连线在切换 Debug 后保留，Debug 不代替接线或代码通关', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
  await page.getByRole('button', { name: '麦克风 VCC 引脚', exact: true }).press('Enter');
  await page.getByRole('button', { name: '主板 3V3 引脚', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Debug 挑战', exact: true }).click();
  await page.getByRole('button', { name: '检查目标引脚 GND', exact: true }).click();
  await page.getByRole('button', { name: '正常模式', exact: true }).click();
  await expect(page.locator('.wiring-svg path')).toHaveCount(3);
  await expect(page.getByRole('button', { name: /前往代码魔改工坊/ })).toBeDisabled();
  expect((await read(page)).unlockedLevels).toEqual(['L1']);
  await page.getByRole('button', { name: '麦克风 GND 引脚', exact: true }).press('Enter');
  await page.getByRole('button', { name: '主板 GND 引脚', exact: true }).press('Enter');
  await expect(page.locator('.experience-text')).toContainText('275 / 2200 XP');
  await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
  await page.getByRole('button', { name: '运行代码', exact: true }).click();
  await expect(page.locator('.challenge-celebration')).toContainText('已解锁 L2');
  await expect(page.locator('.runner-console')).toContainText('运行完成');
  await expect(page.locator('.experience-text')).toContainText('275 / 2200 XP');
});

test('成功/失败音效遵循静音，重置清空 Debug 奖励', async ({ page }) => {
  await page.addInitScript(() => {
    window.notes = [];
    window.AudioContext = class {
      state = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          frequency: { setValueAtTime: (hz) => window.notes.push(hz) },
          connect() {},
          disconnect() {},
          start() {},
          stop() {},
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime() {},
            linearRampToValueAtTime() {},
            exponentialRampToValueAtTime() {},
            cancelScheduledValues() {},
          },
          connect() {},
          disconnect() {},
        };
      }
    };
  });
  await page.goto('/');
  await enter(page);
  await page.getByRole('button', { name: '检查连线 GND → GND', exact: true }).click();
  expect(await page.evaluate(() => window.notes)).toContain(110);
  await page.getByRole('button', { name: '检查目标引脚 GND', exact: true }).click();
  expect(await page.evaluate(() => window.notes.filter((hz) => hz === 880).length)).toBe(1);
  await page.getByRole('button', { name: '静音音效' }).click();
  const count = await page.evaluate(() => window.notes.length);
  await page.getByLabel('选择故障题', { exact: true }).selectOption('1');
  await page.getByRole('button', { name: '检查目标引脚 GPIO8', exact: true }).click();
  expect(await page.evaluate(() => window.notes.length)).toBe(count);
  await page.getByRole('button', { name: '重置学习进度' }).click();
  await page.getByRole('button', { name: '确认重置' }).click();
  await expect(page.locator('.experience-text')).toContainText('0 / 2200 XP');
  expect(
    Object.values((await read(page)).debugProgress).every((p) => Object.keys(p).length === 0),
  ).toBe(true);
});

test('移动端无音频、存储不可用仍可修复，键盘可操作且无横向溢出', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;
    Storage.prototype.setItem = () => {
      throw Error('denied');
    };
  });
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.goto('/');
  await enter(page);
  await page.getByRole('button', { name: '诊断连线 VCC → GND', exact: true }).press('Enter');
  await expect(page.locator('.debug-feedback')).toContainText('修复成功');
  await expect(page.locator('.experience-text')).toContainText('25 / 2200 XP');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.debug-challenge').screenshot({ path: 'test-results/debug-mobile.png' });
  expect(errors).toEqual([]);
});
