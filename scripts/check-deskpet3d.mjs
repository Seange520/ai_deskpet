import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Separate from the original 64 tests; run against a dev server for this checkout.
const baseURL = process.env.SPARKMATE_DEMO_URL || 'http://127.0.0.1:5220';
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  args: ['--enable-unsafe-swiftshader'],
});
const results = [];
try {
  for (const scenario of ['fresh', 'progress', 'legacy']) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
      reducedMotion: 'no-preference',
    });
    try {
      const main = await context.newPage();
      await main.goto(baseURL);
      await expect(main.getByRole('button', { name: '誊写房', exact: true })).toBeVisible();
      await main.evaluate(async (scenario) => {
        const { useLearningStore } = await import('/src/stores/useLearningStore.js');
        if (scenario === 'progress') {
          const state = useLearningStore.getState();
          useLearningStore.setState({
            routes: { ...state.routes, classic: { materials: true, wiring: true, code: false } },
          });
        } else {
          localStorage.clear();
          if (scenario === 'legacy') {
            localStorage.setItem(
              'sparkmate.progress.v1',
              '{ "materials": true, "wiring": false, "code": false }',
            );
            localStorage.setItem('unrelated.setting', 'keep-exactly');
          }
        }
      }, scenario);
      const snapshot = () =>
        main.evaluate(async () => {
          const { useLearningStore, totalXP } = await import('/src/stores/useLearningStore.js');
          const state = useLearningStore.getState();
          return {
            storage: Object.fromEntries(
              Object.keys(localStorage)
                .sort()
                .map((key) => [key, localStorage.getItem(key)]),
            ),
            learning: JSON.stringify(state),
            xp: totalXP(state.routes, state.debugProgress),
            unlocked: state.unlockedLevels,
            completed: state.completedLevels,
          };
        });
      const before = await snapshot();
      const demo = await context.newPage();
      const commands = [],
        errors = [],
        resources = [];
      await demo.addInitScript(() => {
        window.storageAudit = [];
        for (const name of ['getItem', 'setItem', 'removeItem', 'clear']) {
          const original = Storage.prototype[name];
          Storage.prototype[name] = function (...args) {
            window.storageAudit.push(name);
            return original.apply(this, args);
          };
        }
      });
      demo.on('pageerror', (error) => errors.push(error.message));
      demo.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
        if (message.text().startsWith('[3D DeskPet]')) commands.push(message.text());
      });
      demo.on('request', (request) => resources.push(request.url()));
      async function visual() {
        return demo.evaluate(async () => {
          const url = performance
            .getEntriesByType('resource')
            .find((entry) => entry.name.includes('/@react-three_fiber.js'))?.name;
          if (!url) return null;
          const { _roots } = await import(url);
          const root = _roots.get(document.querySelector('canvas'))?.store.getState();
          const body = root?.scene.getObjectByName('command-pet');
          if (!body) return null;
          const eyes = [];
          body.traverse((object) => {
            if (object.material?.name === 'command-eye')
              eyes.push(object.material.emissiveIntensity);
          });
          return {
            z: body.position.z,
            y: body.position.y,
            eyes,
            frames: root.gl.info.render.frame,
          };
        });
      }
      async function unchanged() {
        expect(await snapshot()).toEqual(before);
        expect(await demo.evaluate(() => window.storageAudit)).toEqual([]);
      }
      async function run(source) {
        await demo.getByLabel('桌宠伪代码', { exact: true }).fill(source);
        await demo.getByRole('button', { name: '运行代码', exact: true }).click();
      }
      await demo.goto(`${baseURL}/lab/deskpet3d/`);
      await expect.poll(visual).not.toBeNull();
      await unchanged();
      // This program passes L1 in the real runner and used to change the actual save.
      await run('move("forward"); light("on"); play("success");');
      await expect.poll(async () => (await visual()).z).toBeGreaterThan(0.37);
      await expect.poll(async () => (await visual()).eyes[0]).toBeGreaterThan(2.19);
      await unchanged();
      expect(commands).toHaveLength(3);
      await demo.getByRole('button', { name: '重置视角', exact: true }).click();
      expect(commands).toHaveLength(3);
      for (let i = 0; i < 3; i++)
        await demo.getByRole('button', { name: '运行代码', exact: true }).click();
      expect(commands).toHaveLength(12);
      await unchanged();
      await run('move("backward"); light("on");');
      await expect.poll(async () => (await visual()).z).toBeLessThan(-0.37);
      const backward = await visual();
      await expect
        .poll(async () => Math.abs((await visual()).y - backward.y))
        .toBeGreaterThan(0.005);
      await unchanged();
      await run('move("stop"); light("off");');
      await expect.poll(async () => (await visual()).z).toBe(0);
      await expect.poll(async () => (await visual()).eyes[0]).toBe(0.15);
      await expect.poll(async () => (await visual()).y).toBe(0);
      const stopped = await visual();
      await demo.waitForTimeout(200);
      expect((await visual()).frames).toBe(stopped.frames);
      await unchanged();
      await run('move("forward"); light("on");');
      await expect.poll(async () => (await visual()).z).toBeGreaterThan(0.37);
      const count = commands.length;
      await run('move("backward"); light("wrong");');
      await expect(demo.getByRole('log')).toContainText('运行失败');
      await expect.poll(async () => (await visual()).z).toBe(0);
      await expect.poll(async () => (await visual()).eyes[0]).toBe(0.15);
      expect(commands).toHaveLength(count);
      await demo.getByRole('button', { name: '恢复示例与状态', exact: true }).click();
      await run('light("on");');
      await expect.poll(async () => (await visual()).eyes[0]).toBeGreaterThan(2.19);
      await unchanged();
      await demo.getByRole('button', { name: '恢复示例与状态', exact: true }).click();
      await expect.poll(async () => (await visual()).eyes[0]).toBe(0.15);
      await unchanged();
      await demo.emulateMedia({ reducedMotion: 'reduce' });
      await demo.reload();
      await expect.poll(visual).not.toBeNull();
      expect((await visual()).z).toBe(0);
      expect((await visual()).eyes).toEqual([0.15, 0.15]);
      await unchanged();
      await run('move("backward"); light("on");');
      await expect.poll(async () => (await visual()).z).toBe(-0.38);
      expect((await visual()).y).toBe(0);
      expect((await visual()).eyes).toEqual([2.2, 2.2]);
      for (const width of [320, 1440]) {
        await demo.setViewportSize({ width, height: 1100 });
        expect(await demo.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
      await unchanged();
      expect(
        resources.filter((url) => /useLearningStore|components\/CodeRunner|sounds\.js/.test(url)),
      ).toEqual([]);
      expect(errors).toEqual([]);
      results.push({
        scenario,
        status: 'PASS',
        xpBefore: before.xp,
        xpAfter: (await snapshot()).xp,
        unlocked: before.unlocked,
        completed: before.completed,
        storageUnchanged: true,
        demoStorageCalls: 0,
        visualChecks: 'forward/backward/bob/light/stop/error/reset/reload/reduced-motion',
        errors,
      });
      console.log(
        `PASS ${scenario}: XP ${before.xp} unchanged, levels/save unchanged, demo Storage calls 0`,
      );
    } finally {
      await context.close();
    }
  }
  await mkdir('test-results', { recursive: true });
  await writeFile('test-results/deskpet3d-isolation.json', JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
