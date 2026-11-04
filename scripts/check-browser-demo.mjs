import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { startVirtualEsp32 } from './virtual-esp32.mjs';

const baseURL = process.env.SPARKMATE_DEMO_URL || 'http://127.0.0.1:5262';
const report = [];
await mkdir('test-results', { recursive: true });
for (const width of [1440, 320]) {
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    args: ['--enable-unsafe-swiftshader'],
  });
  let device;
  try {
    const context = await browser.newContext({
      viewport: { width, height: 1100 },
      reducedMotion: width === 320 ? 'reduce' : 'no-preference',
    });
    const page = await context.newPage();
    const errors = [];
    const streamRequests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/stream') streamRequests.push(request.url());
    });
    await page.addInitScript((width) => {
      const audit = window.demoAudit = { timers: new Set(), listeners: new Set(), usb: 0 };
      const schedule = window.setTimeout.bind(window);
      const cancel = window.clearTimeout.bind(window);
      window.setTimeout = function (handler, delay, ...args) {
        if (typeof handler !== 'function') return schedule(handler, delay, ...args);
        const demo = new Error().stack.includes('/browserDemoSerial.js');
        let id;
        id = schedule(function (...values) {
          if (demo) audit.timers.delete(id);
          return handler.apply(this, values);
        }, delay, ...args);
        if (demo) audit.timers.add(id);
        return id;
      };
      window.clearTimeout = (id) => { audit.timers.delete(id); return cancel(id); };
      const add = document.addEventListener.bind(document), remove = document.removeEventListener.bind(document);
      document.addEventListener = (type, listener, options) => {
        if (type === 'visibilitychange' && new Error().stack.includes('/browserDemoSerial.js')) audit.listeners.add(listener);
        return add(type, listener, options);
      };
      document.removeEventListener = (type, listener, options) => {
        if (type === 'visibilitychange') audit.listeners.delete(listener);
        return remove(type, listener, options);
      };
      Object.defineProperty(navigator, 'serial', { configurable: true, value: width === 320 ? undefined : {
        requestPort() { audit.usb++; throw new DOMException('Unexpected USB request', 'NotAllowedError'); },
      } });
    }, width);
    await page.goto(baseURL);
    await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
    const hardware = page.getByRole('region', { name: '真实硬件连接', exact: true });
    const panel = page.getByRole('region', { name: '浏览器光感演示', exact: true });
    const start = panel.getByRole('button', { name: '开启浏览器演示', exact: true });
    const dark = panel.getByRole('button', { name: '遮住光感', exact: true });
    const bright = panel.getByRole('button', { name: '恢复光照', exact: true });
    const scene = page.getByTestId('deskpet3d-scene');
    const moduleURL = await page.evaluate(() => performance.getEntriesByType('resource').find((entry) => entry.name.includes('/src/features/hardware/useHardwareStore.js')).name);
    async function hardwareState() {
      return page.evaluate(async (url) => (await import(url)).useHardwareStore.getState(), moduleURL);
    }
    async function resources() {
      return page.evaluate(() => ({ timers: window.demoAudit.timers.size, listeners: window.demoAudit.listeners.size, usb: window.demoAudit.usb }));
    }
    async function learning() {
      return page.evaluate(async () => {
        const url = performance.getEntriesByType('resource').find((entry) => entry.name.includes('/src/stores/useLearningStore.js')).name;
        const state = (await import(url)).useLearningStore.getState();
        return { routes: state.routes, routeId: state.routeId, runtime: state.runtime, debugProgress: state.debugProgress, unlockedLevels: state.unlockedLevels, completedLevels: state.completedLevels, storage: { ...localStorage } };
      });
    }
    await expect(panel).toBeVisible();
    await expect(scene).toBeVisible();
    await expect(dark).toBeDisabled();
    expect(await resources()).toEqual({ timers: 0, listeners: 0, usb: 0 });
    const before = await learning();
    await start.click();
    await expect(hardware.getByTestId('hardware-light')).toHaveText('300');
    await expect(panel.getByRole('status')).toContainText('浏览器模拟数据');
    await expect(scene).toHaveAttribute('data-sleeping', 'false');
    expect((await hardwareState()).source).toBe('demo');
    expect(await resources()).toEqual({ timers: 1, listeners: 1, usb: 0 });
    await expect(hardware.getByRole('button', { name: '连接真实 ESP32', exact: true })).toBeDisabled();
    await expect(hardware.getByRole('button', { name: '连接虚拟光感', exact: true })).toBeDisabled();
    expect(await page.evaluate(async (url) => {
      const { hardwareConnection } = await import(url);
      return [await hardwareConnection.connect(), await hardwareConnection.connectVirtual()];
    }, moduleURL)).toEqual([false, false]);
    await dark.click();
    await expect(hardware.getByTestId('hardware-light')).toHaveText('50');
    await expect(scene).toHaveAttribute('data-sleeping', 'true');
    await panel.screenshot({ path: `test-results/browser-demo-${width}-dark.png` });
    await bright.click();
    await expect(hardware.getByTestId('hardware-light')).toHaveText('300');
    await expect(scene).toHaveAttribute('data-sleeping', 'false');
    await expect(hardware.getByTestId('hardware-temp')).toHaveText('—');
    expect(await learning()).toEqual(before);
    expect(streamRequests).toEqual([]);
    if (width === 320) await expect(panel.locator('.browser-demo-indicator')).toHaveCSS('animation-name', 'none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await panel.screenshot({ path: `test-results/browser-demo-${width}-bright.png` });
    await panel.getByRole('button', { name: '结束浏览器演示', exact: true }).click();
    await expect(hardware.getByTestId('hardware-light')).toHaveText('—');
    await expect.poll(resources).toEqual({ timers: 0, listeners: 0, usb: 0 });
    const stoppedCount = (await hardwareState()).receivedCount;
    await page.waitForTimeout(1200);
    expect((await hardwareState()).receivedCount).toBe(stoppedCount);
    const cycles = width === 1440 ? 20 : 3;
    await page.evaluate(async ({ url, cycles }) => {
      const { hardwareConnection, useHardwareStore } = await import(url);
      for (let index = 0; index < cycles; index++) {
        if (!await hardwareConnection.connectDemo()) throw Error('Demo did not connect');
        hardwareConnection.setDemoLight(index % 2 ? 50 : 300);
        await hardwareConnection.disconnect();
        if (window.demoAudit.timers.size || window.demoAudit.listeners.size) throw Error('Demo resources retained');
        if (useHardwareStore.getState().hardwareData !== null) throw Error('Telemetry retained');
      }
      for (let index = 0; index < 5; index++) {
        const pending = hardwareConnection.connectDemo();
        await Promise.resolve();
        await hardwareConnection.disconnect();
        await pending;
        if (window.demoAudit.timers.size || window.demoAudit.listeners.size) throw Error('Cancelled startup retained resources');
      }
    }, { url: moduleURL, cycles });
    await start.click(); await expect(hardware.getByTestId('hardware-light')).toHaveText('300');
    await dark.click(); await expect(scene).toHaveAttribute('data-sleeping', 'true');
    await page.getByRole('button', { name: '学习仪表盘', exact: true }).click();
    await expect.poll(resources).toEqual({ timers: 0, listeners: 0, usb: 0 });
    await expect(scene).toHaveAttribute('data-sleeping', 'false');
    expect((await hardwareState()).hardwareData).toBe(null);
    expect(await learning()).toEqual(before);
    await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
    // Existing Node bridge remains a separate, explicitly selected regression fixture.
    device = await startVirtualEsp32({ port: 0, output: { write() {} } });
    await hardware.getByLabel('虚拟光感端口', { exact: true }).fill(String(device.port));
    await hardware.getByRole('button', { name: '连接虚拟光感', exact: true }).click();
    await expect(hardware.getByTestId('hardware-light')).toHaveText('300');
    expect((await hardwareState()).source).toBe('virtual');
    await expect(start).toBeDisabled();
    expect(await page.evaluate(async (url) => (await import(url)).hardwareConnection.connectDemo(), moduleURL)).toBe(false);
    device.setLight(50);
    await expect(hardware.getByTestId('hardware-light')).toHaveText('50');
    await expect(scene).toHaveAttribute('data-sleeping', 'true');
    await hardware.getByRole('button', { name: '断开硬件连接', exact: true }).click();
    await expect(hardware.getByTestId('hardware-light')).toHaveText('—');
    await device.close(); device = null;
    expect(await learning()).toEqual(before);
    expect(errors).toEqual([]);
    report.push({ width, cycles, cancelledStartups: 5, closedResources: await resources(), closedLoop: '300 -> 50/sleep -> 300/wake', learningUnchanged: true, bridgeRegression: 'passed', errors });
    await context.close();
    console.log(`PASS browser demo ${width}px: stream, companion, exclusivity, cancellation and cleanup`);
  } finally {
    await device?.close();
    await browser.close();
  }
}
await writeFile('test-results/browser-demo-check.json', JSON.stringify(report, null, 2));
