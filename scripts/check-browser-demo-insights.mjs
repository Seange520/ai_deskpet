import { revealDevTools } from './dev-tools-fixture.mjs';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { startVirtualEsp32 } from './virtual-esp32.mjs';

const baseURL = process.env.SPARKMATE_DEMO_URL || 'http://127.0.0.1:5262';
const report = [];
await mkdir('test-results', { recursive: true });
for (const width of [1440, 320]) {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', args: ['--enable-unsafe-swiftshader'] });
  let device;
  try {
    const context = await browser.newContext({ viewport: { width, height: 1100 }, reducedMotion: width === 320 ? 'reduce' : 'no-preference' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(baseURL);
    await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
    const panel = page.getByRole('region', { name: '浏览器光感演示', exact: true });
    const hardware = page.getByRole('region', { name: '真实硬件连接', exact: true });
    const wave = panel.getByRole('region', { name: '光照波形 · 原始读数', exact: true });
    const logs = panel.getByRole('region', { name: '演示事件日志', exact: true });
    const url = await page.evaluate(() => performance.getEntriesByType('resource').find((entry) => entry.name.includes('/src/features/hardware/useHardwareStore.js')).name);
    await page.evaluate(async (url) => {
      const { useHardwareStore } = await import(url), original = useHardwareStore.subscribe;
      window.sessionSubscriptions = new Set();
      useHardwareStore.subscribe = (listener) => {
        const ours = new Error().stack.includes('/serialDemoSession.js');
        if (ours) window.sessionSubscriptions.add(listener);
        const unsubscribe = original(listener);
        return () => { if (ours) window.sessionSubscriptions.delete(listener); unsubscribe(); };
      };
    }, url);
    const subscriptions = () => page.evaluate(() => window.sessionSubscriptions.size);
    const learning = () => page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find((entry) => entry.name.includes('/src/stores/useLearningStore.js')).name;
      const s = (await import(url)).useLearningStore.getState();
      return { routes: s.routes, runtime: s.runtime, routeId: s.routeId, debugProgress: s.debugProgress, unlockedLevels: s.unlockedLevels, completedLevels: s.completedLevels, storage: { ...localStorage } };
    });
    const before = await learning();
    const hardwareKeys = await page.evaluate(async (url) => Object.keys((await import(url)).useHardwareStore.getState()).sort(), url);
    await expect(wave).toHaveCount(0); await expect(logs).toHaveCount(0);
    await panel.getByRole('button', { name: '开启浏览器演示', exact: true }).click();
    await expect(wave.locator('.demo-wave-value')).toHaveText('300');
    await expect.poll(subscriptions).toBe(1);
    const latencies = [];
    for (let cycle = 0; cycle < 10; cycle++) {
      for (const [name, light] of [['遮住光感', 50], ['恢复光照', 300]]) {
        const started = Date.now();
        await panel.getByRole('button', { name, exact: true }).click();
        await expect(wave.locator('.demo-wave-value')).toHaveText(String(light));
        await expect(hardware.getByTestId('hardware-light')).toHaveText(String(light));
        await expect(page.getByTestId('deskpet3d-scene')).toHaveAttribute('data-sleeping', light === 50 ? 'true' : 'false');
        latencies.push(Date.now() - started);
      }
    }
    await expect(logs.locator('.demo-event-row[data-kind="simulator"]')).not.toHaveCount(0);
    await expect(logs.locator('.demo-event-row[data-kind="telemetry"]')).not.toHaveCount(0);
    await expect(logs.locator('.demo-event-row')).toHaveCount(40);
    await page.evaluate(async (url) => {
      const { hardwareConnection } = await import(url);
      for (let index = 0; index < 100; index++) {
        hardwareConnection.setDemoLight(index % 2 ? 300 : 50);
        await new Promise(requestAnimationFrame);
      }
    }, url);
    await expect(wave).toHaveAttribute('data-sample-count', '60');
    await expect(logs).toHaveAttribute('data-event-count', '40');
    expect(await wave.locator('polyline').evaluate((el) => el.points.numberOfItems)).toBe(60);
    await expect(logs.locator('.demo-event-row')).toHaveCount(40);
    if (width === 320) await expect(logs.locator('.demo-event-row').first()).toHaveCSS('animation-name', 'none');
    expect(await wave.locator('polyline').evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await learning()).toEqual(before);
    expect(await page.evaluate(async (url) => Object.keys((await import(url)).useHardwareStore.getState()).sort(), url)).toEqual(hardwareKeys);
    await panel.locator('.demo-insights').screenshot({ path: `test-results/browser-demo-insights-${width}.png` });
    await panel.getByRole('button', { name: '结束浏览器演示', exact: true }).click();
    await expect(wave).toHaveCount(0); await expect(logs).toHaveCount(0);
    await expect.poll(subscriptions).toBe(0);
    for (let index = 0; index < 3; index++) {
      await panel.getByRole('button', { name: '开启浏览器演示', exact: true }).click();
      await expect(wave.locator('.demo-wave-value')).toHaveText('300');
      expect(Number(await wave.getAttribute('data-sample-count'))).toBeLessThan(5);
      await panel.getByRole('button', { name: '结束浏览器演示', exact: true }).click();
      await expect.poll(subscriptions).toBe(0);
    }
    await panel.getByRole('button', { name: '开启浏览器演示', exact: true }).click();
    await expect(wave.locator('.demo-wave-value')).toHaveText('300');
    await page.getByRole('button', { name: '学习仪表盘', exact: true }).click();
    await expect.poll(subscriptions).toBe(0);
    await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
    device = await startVirtualEsp32({ port: 0, output: { write() {} } });
    await revealDevTools(hardware);
    await hardware.getByLabel('虚拟光感端口', { exact: true }).fill(String(device.port));
    await hardware.getByRole('button', { name: '连接虚拟光感', exact: true }).click();
    await expect(hardware.getByTestId('hardware-light')).toHaveText('300');
    await expect(wave).toHaveCount(0); await expect(logs).toHaveCount(0);
    expect(await subscriptions()).toBe(0);
    await hardware.getByRole('button', { name: '断开硬件连接', exact: true }).click();
    await device.close(); device = null;
    expect(await learning()).toEqual(before); expect(errors).toEqual([]);
    report.push({ width, toggles: 20, stressReadings: 100, samples: 60, logs: 40, subscriptionAfterClose: await subscriptions(), maxObservedUiLatencyMs: Math.max(...latencies), storeShapeUnchanged: true, learningUnchanged: true, errors });
    await context.close();
    console.log(`PASS demo insights ${width}px: 10 dark/bright cycles, 60/40 caps, reduced motion, isolation and cleanup`);
  } finally { await device?.close(); await browser.close(); }
}
await writeFile('test-results/browser-demo-insights-check.json', JSON.stringify(report, null, 2));
