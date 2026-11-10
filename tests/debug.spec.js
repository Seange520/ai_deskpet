import { test, expect } from './quality-fixture';
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
  await page.getByRole('button', { name: '街坊工坊', exact: true }).click();
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
    await page.getByRole('button', { name: '委托板', exact: true }).click();
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
    await page.getByRole('button', { name: '委托板', exact: true }).click();
    await expect(page.locator('.rank-summary')).toContainText('第 4 名');
    await page.reload();
    await expect(page.locator('.experience-text')).toContainText('300 / 2200 XP');
    await enter(page);
    await expect(page.locator('.debug-feedback')).toContainText('本题奖励已领取');
    await page.getByRole('button', { name: '正常模式', exact: true }).click();
    await expect(page.getByRole('button', { name: /前往誊写房/ })).toBeEnabled();
    expect(errors).toEqual([]);
  });
}

test('鼠标点击 SVG 错误线路：修复、音效、重复练习防刷分与刷新持久化', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.notes = [];
    window.wireClicks = [];
    document.addEventListener(
      'click',
      (event) => {
        const wire = event.target.closest?.('.debug-wire');
        if (wire)
          window.wireClicks.push({
            label: wire.getAttribute('aria-label'),
            trusted: event.isTrusted,
            pointer: event.pointerType,
          });
      },
      true,
    );
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
  // Hit the curve itself, away from endpoint pins and labels. No DOM dispatch or keyboard shortcut.
  async function clickWire(label) {
    const path = page
      .locator('.debug-svg')
      .getByRole('button', { name: label, exact: true })
      .locator('path')
      .first();
    await path.scrollIntoViewIfNeeded();
    const point = await path.evaluate((element) => {
      const local = element.getPointAtLength(element.getTotalLength() * 0.35);
      const screen = new DOMPoint(local.x, local.y).matrixTransform(element.getScreenCTM());
      return {
        x: screen.x,
        y: screen.y,
        hit: document
          .elementFromPoint(screen.x, screen.y)
          ?.closest('.debug-wire')
          ?.getAttribute('aria-label'),
      };
    });
    expect(point.hit).toBe(label);
    await page.mouse.click(point.x, point.y);
    expect(await page.evaluate(() => window.wireClicks.at(-1))).toEqual({
      label,
      trusted: true,
      pointer: 'mouse',
    });
  }
  const sounds = () =>
    page.evaluate(() => window.notes.filter((hz) => [110, 880, 1320].includes(hz)));
  await page.goto('/');
  await enter(page);
  await clickWire('检查连线 GND → GND');
  await expect(page.getByRole('alert')).toContainText('模拟短路警告');
  await expect(page.locator('.experience-text')).toContainText('0 / 2200 XP');
  expect(await sounds()).toEqual([110]);
  await clickWire('检查连线 VCC → GND');
  await expect(page.locator('.debug-feedback')).toContainText('修复成功 · VCC → 3V3 · +25 XP');
  await expect(page.locator('.experience-text')).toContainText('25 / 2200 XP');
  await expect(page.getByRole('progressbar', { name: '全局学习进度' })).toHaveAttribute(
    'aria-valuenow',
    '25',
  );
  await expect(
    page.locator('.debug-svg').getByRole('button', { name: '检查连线 VCC → 3V3', exact: true }),
  ).toHaveAttribute('aria-disabled', 'true');
  expect(await sounds()).toEqual([110, 880, 1320]);
  const awarded = await read(page);
  expect(awarded.debugProgress.classic).toEqual({ 'power-line': true });
  expect(awarded.routes.classic).toEqual({ materials: false, wiring: false, code: false });
  expect(awarded.completedLevels).toEqual([]);
  expect(awarded.unlockedLevels).toEqual(['L1']);
  // Clicking an already solved curve must not run the repair action or replay success audio.
  await clickWire('检查连线 VCC → 3V3');
  expect(await sounds()).toEqual([110, 880, 1320]);
  expect(await read(page)).toEqual(awarded);
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: '重新练习此题', exact: true }).click();
    await clickWire('检查连线 VCC → GND');
    await expect(page.locator('.debug-feedback')).toContainText('重复练习不加分');
    await expect(page.locator('.experience-text')).toContainText('25 / 2200 XP');
    expect(await read(page)).toEqual(awarded);
    expect(await sounds()).toEqual([
      110,
      ...Array.from({ length: i + 2 }, () => [880, 1320]).flat(),
    ]);
  }
  await page.getByRole('button', { name: '静音音效', exact: true }).click();
  const noteCount = await page.evaluate(() => window.notes.length);
  await page.getByRole('button', { name: '重新练习此题', exact: true }).click();
  await clickWire('检查连线 GND → GND');
  await expect(page.getByRole('alert')).toContainText('模拟短路警告');
  await clickWire('检查连线 VCC → GND');
  await expect(page.locator('.debug-feedback')).toContainText('重复练习不加分');
  expect(await page.evaluate(() => window.notes.length)).toBe(noteCount);
  const mutedSave = await read(page);
  expect(mutedSave).toEqual({ ...awarded, muted: true });
  await page.reload();
  await enter(page);
  await expect(page.locator('.experience-text')).toContainText('25 / 2200 XP');
  await expect(page.locator('.debug-feedback')).toContainText('本题奖励已领取');
  await page.getByRole('button', { name: '重新练习此题', exact: true }).click();
  await clickWire('检查连线 VCC → GND');
  await expect(page.locator('.debug-feedback')).toContainText('重复练习不加分');
  expect(await read(page)).toEqual(mutedSave);
  expect(await page.evaluate(() => window.notes)).toEqual([]);
  await page.getByRole('button', { name: '正常模式', exact: true }).click();
  await expect(page.getByRole('button', { name: /前往誊写房/ })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('正常模式未完成连线在切换 Debug 后保留，Debug 不代替接线或代码通关', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '街坊工坊', exact: true }).click();
  await page.getByRole('button', { name: '麦克风 VCC 引脚', exact: true }).press('Enter');
  await page.getByRole('button', { name: '主板 3V3 引脚', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Debug 挑战', exact: true }).click();
  await page.getByRole('button', { name: '检查目标引脚 GND', exact: true }).click();
  await page.getByRole('button', { name: '正常模式', exact: true }).click();
  await expect(page.locator('.wiring-svg path')).toHaveCount(3);
  await expect(page.getByRole('button', { name: /前往誊写房/ })).toBeDisabled();
  expect((await read(page)).unlockedLevels).toEqual(['L1']);
  await page.getByRole('button', { name: '麦克风 GND 引脚', exact: true }).press('Enter');
  await page.getByRole('button', { name: '主板 GND 引脚', exact: true }).press('Enter');
  await expect(page.locator('.experience-text')).toContainText('275 / 2200 XP');
  await page.getByRole('button', { name: '誊写房', exact: true }).click();
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
