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
    await context.addInitScript(() => {
      window.scenarioAudit = { timers: new Set(), visibility: new Set(), subscriptions: new Set() };
      const schedule = window.setTimeout.bind(window), clear = window.clearTimeout.bind(window);
      window.setTimeout = function (handler, delay, ...args) {
        if (typeof handler !== 'function') return schedule(handler, delay, ...args);
        const ours = new Error().stack.includes('/browserDemoSerial.js'); let id;
        id = schedule(function (...values) { if (ours) window.scenarioAudit.timers.delete(id); return handler.apply(this, values); }, delay, ...args);
        if (ours) window.scenarioAudit.timers.add(id); return id;
      };
      window.clearTimeout = (id) => { window.scenarioAudit.timers.delete(id); return clear(id); };
      const add = document.addEventListener.bind(document), remove = document.removeEventListener.bind(document);
      document.addEventListener = (type, fn, options) => {
        if (type === 'visibilitychange' && new Error().stack.includes('/browserDemoSerial.js')) window.scenarioAudit.visibility.add(fn);
        return add(type, fn, options);
      };
      document.removeEventListener = (type, fn, options) => { if (type === 'visibilitychange') window.scenarioAudit.visibility.delete(fn); return remove(type, fn, options); };
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(baseURL);
    await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
    const panel = page.getByRole('region', { name: '浏览器光感演示', exact: true });
    const hardware = page.getByRole('region', { name: '真实硬件连接', exact: true });
    const scene = page.getByTestId('deskpet3d-scene');
    const scenarios = panel.locator('.demo-scenarios');
    const result = panel.locator('.demo-scenario-result');
    const wave = panel.locator('.demo-wave'), logs = panel.locator('.demo-events');
    const url = await page.evaluate(() => performance.getEntriesByType('resource').find((entry) => entry.name.includes('/src/features/hardware/useHardwareStore.js')).name);
    await page.evaluate(async (url) => {
      const { useHardwareStore } = await import(url), subscribe = useHardwareStore.subscribe;
      useHardwareStore.subscribe = (fn) => {
        const ours = new Error().stack.includes('/serialDemoSession.js');
        if (ours) window.scenarioAudit.subscriptions.add(fn);
        const off = subscribe(fn);
        return () => { if (ours) window.scenarioAudit.subscriptions.delete(fn); off(); };
      };
    }, url);
    const state = () => page.evaluate(async (url) => (await import(url)).useHardwareStore.getState(), url);
    const resources = () => page.evaluate(() => Object.fromEntries(Object.entries(window.scenarioAudit).map(([key, value]) => [key, value.size])));
    const learning = () => page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find((entry) => entry.name.includes('/src/stores/useLearningStore.js')).name;
      const s = (await import(url)).useLearningStore.getState();
      return { routes: s.routes, runtime: s.runtime, debug: s.debugProgress, unlocked: s.unlockedLevels, completed: s.completedLevels, storage: { ...localStorage } };
    });
    const before = await learning();
    await expect(scenarios).toHaveCount(0);
    await panel.getByRole('button', { name: '开启浏览器演示', exact: true }).click();
    await expect(hardware.getByTestId('hardware-light')).toHaveText('300');
    expect(await scenarios.evaluate((el) => el.open)).toBe(false);
    await scenarios.locator('summary').click();
    await panel.getByRole('button', { name: '遮住光感', exact: true }).click();
    await expect(scene).toHaveAttribute('data-sleeping', 'true');
    await scenarios.getByRole('button', { name: '暂停上报', exact: true }).click();
    await expect(result).toContainText('数据暂未更新');
    const paused = await state(), count = await wave.getAttribute('data-sample-count');
    await expect.poll(resources).toEqual({ timers: 0, visibility: 1, subscriptions: 1 });
    await page.waitForTimeout(1200);
    expect((await state()).status).toBe('connected'); expect((await state()).receivedCount).toBe(paused.receivedCount);
    expect((await state()).hardwareData).toEqual(paused.hardwareData);
    await expect(wave).toHaveAttribute('data-sample-count', count);
    await expect(wave.locator('.demo-wave-value')).toHaveText('50');
    await expect(panel.getByRole('button', { name: '恢复光照', exact: true })).toBeDisabled();
    await expect(scenarios.getByRole('button', { name: '非法数据后恢复', exact: true })).toBeDisabled();
    await scenarios.screenshot({ path: `test-results/demo-scenarios-${width}-paused.png` });
    await scenarios.getByRole('button', { name: '恢复上报', exact: true }).click();
    await expect.poll(() => state().then((s) => s.receivedCount)).toBeGreaterThan(paused.receivedCount);
    await expect.poll(resources).toEqual({ timers: 1, visibility: 1, subscriptions: 1 });
    await panel.getByRole('button', { name: '恢复光照', exact: true }).click();
    await expect(scene).toHaveAttribute('data-sleeping', 'false');
    await page.evaluate(async (url) => {
      const { useHardwareStore } = await import(url);
      const off = useHardwareStore.subscribe((next, prev) => {
        if (next.invalidLineCount > prev.invalidLineCount) {
          window.dirtyAudit = { preservedTelemetry: next.hardwareData === prev.hardwareData, preservedCount: next.receivedCount === prev.receivedCount };
          off();
        }
      });
    }, url);
    const badCount = (await state()).invalidLineCount;
    await scenarios.getByRole('button', { name: '非法数据后恢复', exact: true }).click();
    await expect(result).toContainText('已忽略非法数据');
    expect((await state()).invalidLineCount).toBe(badCount + 1);
    expect(await page.evaluate(() => window.dirtyAudit)).toEqual({ preservedTelemetry: true, preservedCount: true });
    await expect(logs.locator('[data-kind="warning"]')).not.toHaveCount(0);
    await expect(result).toContainText('已恢复正常');
    expect((await state()).notice).toBe(''); expect((await state()).status).toBe('connected');
    await scenarios.getByRole('button', { name: '模拟拔线', exact: true }).click();
    await expect(hardware.getByTestId('hardware-light')).toHaveText('—');
    await expect(hardware.getByTestId('hardware-temp')).toHaveText('—');
    await expect(wave).toHaveCount(0); await expect(logs).toHaveCount(0); await expect(scenarios).toHaveCount(0);
    await expect.poll(resources).toEqual({ timers: 0, visibility: 0, subscriptions: 0 });
    await expect(panel.getByRole('status')).toContainText('模拟设备已拔出');
    await panel.getByRole('button', { name: '重新连接浏览器演示', exact: true }).click();
    await expect(hardware.getByTestId('hardware-light')).toHaveText('300');
    expect(Number(await wave.getAttribute('data-sample-count'))).toBeLessThan(5);
    const keys = Object.keys(await state()).sort();
    for (let iteration = 0; iteration < 3; iteration++) {
      await scenarios.locator('summary').click();
      await scenarios.getByRole('button', { name: '非法数据后恢复', exact: true }).click();
      await expect(result).toContainText('已忽略非法数据');
      await scenarios.getByRole('button', { name: '模拟拔线', exact: true }).click();
      await expect.poll(resources).toEqual({ timers: 0, visibility: 0, subscriptions: 0 });
      await panel.getByRole('button', { name: '重新连接浏览器演示', exact: true }).click();
      await expect(hardware.getByTestId('hardware-light')).toHaveText('300');
    }
    expect(Object.keys(await state()).sort()).toEqual(keys);
    await panel.getByRole('button', { name: '结束浏览器演示', exact: true }).click();
    await expect.poll(resources).toEqual({ timers: 0, visibility: 0, subscriptions: 0 });
    device = await startVirtualEsp32({ port: 0, output: { write() {} } });
    await revealDevTools(hardware);
    await hardware.getByLabel('虚拟光感端口', { exact: true }).fill(String(device.port));
    await hardware.getByRole('button', { name: '连接虚拟光感', exact: true }).click();
    await expect(hardware.getByTestId('hardware-light')).toHaveText('300');
    await expect(scenarios).toHaveCount(0);
    expect(await page.evaluate(async (url) => {
      const { hardwareConnection } = await import(url);
      return [hardwareConnection.pauseDemo(true), hardwareConnection.injectDemoInvalid()];
    }, url)).toEqual([false, false]);
    await hardware.getByRole('button', { name: '断开硬件连接', exact: true }).click();
    await device.close(); device = null;
    expect(await learning()).toEqual(before); expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    report.push({ width, pausePreservesData: true, dirtyRejectedAndRecovered: true, unplugReconnect: true, cancelledRecoveries: 3, closedResources: await resources(), learningUnchanged: true, errors });
    await context.close(); console.log(`PASS demo scenarios ${width}px: pause, dirty recovery, unplug/reconnect and cleanup`);
  } finally { await device?.close(); await browser.close(); }
}
await writeFile('test-results/browser-demo-scenarios-check.json', JSON.stringify(report, null, 2));
