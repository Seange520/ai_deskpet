import { test, expect } from './quality-fixture';
import { unlockThrough, levelPrograms } from './level-helpers';
const card = (page, name) => page.getByRole('region', { name: name + '路线卡片', exact: true });
const saved = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('sparkmate.routes.v2')));
async function code(page, source) {
  await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
  await page.getByLabel('桌宠伪代码', { exact: true }).fill(source);
  await page.getByRole('button', { name: '运行代码', exact: true }).click();
}
test('新用户仅 L1，锁卡点击提示，材料与下拉和 store 入口均不能绕过', async ({ page }) => {
  await page.goto('/');
  expect((await saved(page)).unlockedLevels).toEqual(['L1']);
  await expect(page.locator('.route-card.is-locked')).toHaveCount(3);
  const locked = card(page, '迷你四足机器狗');
  await locked.getByRole('heading', { name: '迷你四足机器狗' }).click();
  await expect(page.locator('.kit-toast')).toContainText('请先完成前置挑战');
  await locked.getByRole('button', { name: '查看解锁条件' }).click();
  await expect(page.locator('.kit-toast')).toContainText('请先完成前置挑战');
  await expect(page.getByRole('heading', { name: /每个伟大的创造/ })).toBeVisible();
  await locked.getByRole('button', { name: /准备物料/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
  await expect(
    page.getByLabel('切换路线', { exact: true }).locator('option[value="quadruped"]'),
  ).toHaveJSProperty('disabled', true);
  const allowed = await page.evaluate(async () => {
    const { useLearningStore } = await import('/src/stores/useLearningStore.js');
    return useLearningStore.getState().selectRoute('spherical');
  });
  expect(allowed).toBe(false);
  expect((await saved(page)).routeId).toBe('classic');
});

test('目标须同次显式执行，最终状态匹配；失败不解锁，通关幂等且刷新不重播', async ({ page }) => {
  await page.addInitScript(() => {
    window.successNotes = 0;
    window.AudioContext = class {
      state = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          frequency: {
            setValueAtTime: (hz) => {
              if (hz === 880) window.successNotes++;
            },
          },
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
  await code(page, 'move("forward")');
  await code(page, 'light("on")');
  expect((await saved(page)).unlockedLevels).toEqual(['L1']);
  await code(page, 'move("forward"); light("on"); move("stop");');
  expect((await saved(page)).unlockedLevels).toEqual(['L1']);
  await code(page, 'move("forward"); light("on"); bad()');
  await expect(page.locator('.runner-console')).toContainText('运行失败');
  expect((await saved(page)).completedLevels).toEqual([]);
  await code(page, levelPrograms[0]);
  await expect(page.locator('.challenge-celebration')).toContainText('已解锁 L2');
  await page.screenshot({ path: 'test-results/l1-pass.png', fullPage: true });
  expect((await saved(page)).unlockedLevels).toEqual(['L1', 'L2']);
  expect(await page.evaluate(() => window.successNotes)).toBe(1);
  const event = await page.evaluate(
    async () =>
      (await import('/src/stores/useLearningStore.js')).useLearningStore.getState().challengeEvent
        .id,
  );
  await code(page, levelPrograms[0]);
  expect(
    await page.evaluate(
      async () =>
        (await import('/src/stores/useLearningStore.js')).useLearningStore.getState().challengeEvent
          .id,
    ),
  ).toBe(event);
  expect(await page.evaluate(() => window.successNotes)).toBe(1);
  await page.reload();
  await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
  await expect(page.locator('.challenge-celebration')).toHaveCount(0);
  await expect(page.getByRole('region', { name: '通关目标' })).toContainText('已通关');
  await expect(page.locator('.experience-text')).toContainText('0 / 2200 XP');
});

test('四关顺序通关、静音、减少动画与重置', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '静音音效' }).click();
  await unlockThrough(page);
  expect((await saved(page)).completedLevels).toEqual(['L1', 'L2', 'L3']);
  await expect(page.locator('.route-card.is-locked')).toHaveCount(0);
  await page.getByRole('button', { name: '探索球形自平衡机器人', exact: true }).click();
  await code(page, levelPrograms[3]);
  await expect(page.locator('.challenge-celebration')).toContainText('四关挑战全部完成');
  await expect(page.locator('.challenge-confetti')).toHaveCSS('display', 'none');
  expect((await saved(page)).completedLevels).toEqual(['L1', 'L2', 'L3', 'L4']);
  await page.getByRole('button', { name: '重置学习进度' }).click();
  await page.getByRole('button', { name: '确认重置' }).click();
  expect((await saved(page)).unlockedLevels).toEqual(['L1']);
  expect((await saved(page)).completedLevels).toEqual([]);
  await page.reload();
  await expect(page.locator('.route-card.is-locked')).toHaveCount(3);
});

test('旧记录保留路线访问、XP，损坏新解锁记录回退连续前缀', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    localStorage.setItem(
      'sparkmate.routes.v2',
      JSON.stringify({
        routeId: 'tracked',
        routes: {
          classic: { materials: true, wiring: true, code: true },
          tracked: { wiring: true },
        },
      }),
    );
  });
  await page.goto('/');
  expect((await saved(page)).unlockedLevels).toEqual(['L1', 'L2', 'L3']);
  expect((await saved(page)).completedLevels).toEqual([]);
  await expect(page.locator('.experience-text')).toContainText('750 / 2200 XP');
  await page.evaluate(() =>
    localStorage.setItem(
      'sparkmate.routes.v2',
      JSON.stringify({
        levelVersion: 1,
        routeId: 'spherical',
        routes: {},
        unlockedLevels: ['L1', 'L4'],
        completedLevels: ['L4'],
      }),
    ),
  );
  await page.reload();
  expect((await saved(page)).unlockedLevels).toEqual(['L1']);
  expect((await saved(page)).routeId).toBe('classic');
});

test('通关无音频/存储 API 仍可解锁；移动端锁卡无溢出', async ({ page }) => {
  await page.addInitScript(() => {
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;
    Storage.prototype.setItem = () => {
      throw Error('denied');
    };
  });
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.goto('/');
  await page.screenshot({ path: 'test-results/level-locks-mobile.png', fullPage: true });
  await code(page, levelPrograms[0]);
  await expect(page.locator('.challenge-celebration')).toContainText('已解锁 L2');
  await page.getByRole('button', { name: '学习仪表盘', exact: true }).click();
  await expect(page.locator('.route-card.is-locked')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
