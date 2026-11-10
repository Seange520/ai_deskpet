import { test, expect } from './quality-fixture';
import { readCompanionScene } from './deskpet3d-helpers';

async function open(page) {
  await page.goto('/');
  await page.getByRole('button', { name: '誊写房', exact: true }).click();
  await expect(page.getByLabel('桌宠伪代码', { exact: true })).toBeVisible();
}
const result = (page) => page.getByRole('region', { name: '代码运行结果', exact: true });

test.describe('保留真实模型与材质断言', () => {
  test.use({ quality: '2' });
  test('默认指令、全局伙伴联动、跨页保留、刷新复位且不奖励 XP', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await open(page);
    await page.getByRole('button', { name: '运行代码', exact: true }).click();
    await expect(result(page)).toContainText('动作：前进');
    await expect(result(page)).toContainText('LED：亮');
    await expect(page.locator('.runner-console')).toContainText('运行完成');
    await expect(page.locator('.runner-console')).toContainText('成功音效已触发');
    await expect(page.locator('.companion canvas')).toBeVisible();
    await expect(page.locator('.companion').getByTestId('deskpet3d-scene')).toHaveAttribute(
      'data-led',
      'on',
    );
    await expect.poll(async () => (await readCompanionScene(page))?.eyes).toEqual([2.2, 2.2]);
    await expect(page.locator('.companion').getByTestId('deskpet3d-scene')).toHaveCount(1);
    await expect(page.locator('.companion').getByTestId('deskpet3d-scene')).toHaveAttribute(
      'data-action',
      'forward',
    );
    await expect.poll(async () => (await readCompanionScene(page))?.z).toBeGreaterThan(0.37);
    await expect(page.locator('.companion-bubble')).toContainText('正在前进');
    await expect(page.locator('.experience-text')).toContainText('0 / 2200 XP');
    await page.getByRole('button', { name: '校验册', exact: true }).click();
    await expect(page.locator('.companion canvas')).toBeVisible();
    await expect(page.locator('.companion').getByTestId('deskpet3d-scene')).toHaveAttribute(
      'data-led',
      'on',
    );
    await expect.poll(async () => (await readCompanionScene(page))?.eyes).toEqual([2.2, 2.2]);
    await page.getByRole('button', { name: '誊写房', exact: true }).click();
    await expect(result(page)).toContainText('LED：亮');
    await page.reload();
    await page.getByRole('button', { name: '誊写房', exact: true }).click();
    await expect(result(page)).toContainText('动作：停止');
    await expect(result(page)).toContainText('LED：灭');
    await expect.poll(async () => (await readCompanionScene(page))?.z).toBe(0);
    await expect.poll(async () => (await readCompanionScene(page))?.eyes).toEqual([0.15, 0.15]);
    expect(errors).toEqual([]);
  });

  test('错误整段不执行，红色控制台与修正恢复、复位', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await open(page);
    const input = page.getByLabel('桌宠伪代码', { exact: true });
    await input.fill('move("forward");\nlight("wrong");');
    await page.getByRole('button', { name: '运行代码', exact: true }).click();
    await expect(page.locator('.runner-console')).toHaveClass(/has-error/);
    await expect(page.locator('.runner-console')).toContainText('第 2 行');
    await expect(page.locator('.runner-console')).toHaveCSS('color', 'rgb(255, 151, 151)');
    await expect(result(page)).toContainText('动作：停止');
    await input.fill('while(true){}');
    await page.getByRole('button', { name: '运行代码', exact: true }).click();
    await expect(page.locator('.runner-console')).toContainText('运行失败');
    await input.fill('move("backward"); light("on");');
    await page.getByRole('button', { name: '运行代码', exact: true }).click();
    await expect(result(page)).toContainText('动作：后退');
    await expect.poll(async () => (await readCompanionScene(page))?.z).toBeLessThan(-0.37);
    await expect(result(page)).toContainText('LED：亮');
    await input.fill('move("stop"); light("off");');
    await page.getByRole('button', { name: '运行代码', exact: true }).click();
    await expect(result(page)).toContainText('动作：停止');
    await expect(result(page)).toContainText('LED：灭');
    await page.getByRole('button', { name: '恢复示例与状态' }).click();
    await expect(input).toHaveValue(/move\("forward"\)/);
    await expect(page.locator('.runner-console')).toContainText('等待运行');
    expect(errors).toEqual([]);
  });
});

test('play 每条执行一次，遵循静音，无音频 API 仍可运行', async ({ page }) => {
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
  await open(page);
  const input = page.getByLabel('桌宠伪代码', { exact: true });
  await input.fill('play("success");');
  await page.getByRole('button', { name: '运行代码', exact: true }).click();
  expect(await page.evaluate(() => window.notes.filter((x) => x === 880).length)).toBe(1);
  await page.getByRole('button', { name: '静音音效' }).click();
  await page.getByRole('button', { name: '运行代码', exact: true }).click();
  expect(await page.evaluate(() => window.notes.filter((x) => x === 880).length)).toBe(1);
  await expect(page.locator('.runner-console')).toContainText('当前静音');
  await page.addInitScript(() => {
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;
  });
  await open(page);
  await page.getByRole('button', { name: '开启音效' }).click();
  await page.getByRole('button', { name: '运行代码', exact: true }).click();
  await expect(page.locator('.runner-console')).toContainText('运行完成');
});

for (const width of [320, 1440]) {
  test('运行器布局与键盘输入 ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await open(page);
    await page.getByLabel('桌宠伪代码', { exact: true }).fill('light("on")');
    await page.getByRole('button', { name: '运行代码', exact: true }).press('Enter');
    await expect(result(page)).toContainText('LED：亮');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 1440) {
      const a = await page.locator('.runner-editor').boundingBox();
      const b = await page.locator('.runner-preview').boundingBox();
      expect(b.x).toBeGreaterThan(a.x + a.width);
    }
    await page
      .locator('.code-runner')
      .screenshot({ path: 'test-results/code-runner-' + width + '.png' });
  });
}
