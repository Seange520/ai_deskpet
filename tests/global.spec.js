import { unlockThrough } from './level-helpers';
import { test, expect } from './quality-fixture';

async function wire(page, source, target, module = '麦克风', board = '主板') {
  await page.getByRole('button', { name: `${module} ${source} 引脚`, exact: true }).press('Enter');
  await page.getByRole('button', { name: `${board} ${target} 引脚`, exact: true }).press('Enter');
}
async function classic(page) {
  await wire(page, 'VCC', '3V3');
  await wire(page, 'GND', 'GND');
}
const xp = (page) => page.locator('.experience-text');

test('全局 XP、徽章 Toast、委托与钟楼回望、重复接线与切路重载保持一致', async ({ page }) => {
  await page.goto('/');
  await unlockThrough(page, 1);
  await page.getByRole('button', { name: '街坊工坊', exact: true }).click();
  await classic(page);
  await expect(xp(page)).toContainText('250 / 2200 XP');
  await expect(page.locator('.kit-toast')).toContainText('解锁「电路新星」');
  await expect(page.locator('.companion-bubble')).toContainText('接线成功');
  await expect(page.getByRole('progressbar', { name: '全局学习进度' })).toHaveAttribute(
    'aria-valuenow',
    '250',
  );
  await page.getByRole('button', { name: '重置接线', exact: true }).click();
  await classic(page);
  await expect(xp(page)).toContainText('250 / 2200 XP');
  await expect(page.locator('.kit-toast')).toHaveCount(0);
  await page.getByLabel('切换路线', { exact: true }).selectOption('quadruped');
  await expect(xp(page)).toContainText('250 / 2200 XP');
  await wire(page, 'VCC', 'EXT5V', '舵机', '独立电源');
  await wire(page, 'GND', 'GND', '舵机');
  await wire(page, 'PWM', 'GPIO4', '舵机');
  await expect(xp(page)).toContainText('LV.2');
  await expect(xp(page)).toContainText('500 / 2200 XP');
  await expect(page.locator('.companion-bubble')).toContainText('升级啦');
  await expect(page.locator('.kit-toast')).not.toContainText('解锁');
  await page.getByRole('button', { name: '委托板', exact: true }).click();
  await expect(page.locator('.commission-list')).toContainText('熄灯的晚餐');
  await expect(page.locator('.tower-stats')).toContainText('500');
  await page.reload();
  await expect(xp(page)).toContainText('500 / 2200 XP');
  await expect(page.locator('.badge.unlocked')).toHaveCount(2);
  await expect(page.locator('.kit-toast')).toHaveCount(0);
});

test('调参只在有效修改后主动领取一次，重置参数和恢复默认不奖励', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '街坊工坊', exact: true }).click();
  await classic(page);
  await page.getByRole('button', { name: /前往誊写房/ }).click();
  const slider = page.getByRole('slider', { name: '眨眼间隔' });
  await slider.fill('600');
  await slider.fill('2400');
  await expect(page.getByRole('button', { name: '先调整一个参数，唤醒你的伙伴' })).toBeDisabled();
  await slider.fill('800');
  await slider.fill('1000');
  await expect(xp(page)).toContainText('250 / 2200 XP');
  await page.getByRole('button', { name: /唤醒伙伴 · 领取/ }).click();
  await expect(page.locator('.kit-toast')).toContainText('唤醒伙伴');
  await page.getByRole('button', { name: '查看我的成就' }).click();
  await expect(xp(page)).toContainText('400 / 2200 XP');
  await page.getByRole('button', { name: '誊写房', exact: true }).click();
  await slider.fill('600');
  await expect(page.getByRole('button', { name: '伙伴已唤醒 · 成就已领取' })).toBeDisabled();
  await page.reload();
  await expect(xp(page)).toContainText('400 / 2200 XP');
});

test('v2 四路线存量折算全局 XP，损坏关卡不误发积分', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    localStorage.setItem(
      'sparkmate.routes.v2',
      JSON.stringify({
        routeId: 'tracked',
        routes: {
          classic: { materials: true, wiring: true, code: true },
          quadruped: { materials: true, wiring: true, code: false },
          tracked: { wiring: false, code: true },
          spherical: { materials: 'true' },
        },
      }),
    );
  });
  await page.goto('/');
  await expect(xp(page)).toContainText('850 / 2200 XP');
  await expect(page.locator('.badge.unlocked')).toHaveCount(4);
  await page.reload();
  await expect(xp(page)).toContainText('850 / 2200 XP');
  await expect(page.locator('.kit-toast')).toHaveCount(0);
});

test('音效由交互创建，点击/成功/烧板不同音高，静音保存并阻止播放', async ({ page }) => {
  await page.addInitScript(() => {
    window.audioNotes = [];
    window.audioCreated = 0;
    window.AudioContext = class {
      constructor() {
        window.audioCreated++;
        this.state = 'suspended';
        this.currentTime = 0;
        this.destination = {};
      }
      resume() {
        this.state = 'running';
        return Promise.resolve();
      }
      createOscillator() {
        return {
          frequency: { setValueAtTime: (hz) => window.audioNotes.push(hz) },
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
  expect(await page.evaluate(() => window.audioCreated)).toBe(0);
  await page.getByRole('button', { name: '街坊工坊', exact: true }).click();
  await classic(page);
  expect(await page.evaluate(() => window.audioNotes)).toEqual(
    expect.arrayContaining([1450, 880, 1320]),
  );
  await page.getByRole('button', { name: '重置接线', exact: true }).click();
  await wire(page, 'VCC', 'GND');
  expect(await page.evaluate(() => window.audioNotes)).toContain(110);
  await page.getByRole('button', { name: '重置模拟开发板' }).click();
  await page.getByRole('button', { name: '静音音效' }).click();
  const count = await page.evaluate(() => window.audioNotes.length);
  await classic(page);
  expect(await page.evaluate(() => window.audioNotes.length)).toBe(count);
  await page.reload();
  await expect(page.getByRole('button', { name: '开启音效' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '街坊工坊', exact: true }).click();
  expect(await page.evaluate(() => window.audioCreated)).toBe(0);
});

for (const mode of ['missing', 'throws', 'rejected']) {
  test(`音效 ${mode} 时仍可学习、失败恢复且无页面错误`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript((mode) => {
      window.webkitAudioContext = undefined;
      window.AudioContext =
        mode === 'missing'
          ? undefined
          : class {
              constructor() {
                if (mode === 'throws') throw Error('unavailable');
                this.state = 'suspended';
              }
              resume() {
                return Promise.reject(Error('blocked'));
              }
            };
    }, mode);
    await page.goto('/');
    await page.getByRole('button', { name: '街坊工坊', exact: true }).click();
    await wire(page, 'VCC', 'GND');
    await expect(page.getByRole('alert')).toHaveCount(1);
    await page.getByRole('button', { name: '重置模拟开发板' }).press('Escape');
    await expect(page.locator('.companion-bubble')).toContainText('重新接线');
    await classic(page);
    await expect(xp(page)).toContainText('250 / 2200 XP');
    await page.getByRole('button', { name: '重置接线', exact: true }).click();
    await wire(page, 'VCC', 'GND');
    await page.getByRole('button', { name: '重置模拟开发板' }).click();
    await expect(xp(page)).toContainText('250 / 2200 XP');
    await page.getByRole('button', { name: '校验册', exact: true }).click();
    await expect(page.locator('.badge.unlocked')).toHaveCount(2);
    expect(errors).toEqual([]);
  });
}

test('存储不可用时仍能获得 XP 与徽章', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error('storage denied');
    };
  });
  await page.goto('/');
  await expect(page.locator('.storage-note')).toContainText('浏览器存储不可用');
  await page.getByRole('button', { name: '街坊工坊', exact: true }).click();
  await classic(page);
  await expect(xp(page)).toContainText('250 / 2200 XP');
});
