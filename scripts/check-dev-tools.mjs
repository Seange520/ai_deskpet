import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { startVirtualEsp32 } from './virtual-esp32.mjs';
import { revealDevTools } from './dev-tools-fixture.mjs';

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
    await context.addInitScript((width) => {
      window.devToolsUsbRequests = 0;
      Object.defineProperty(navigator, 'serial', {
        configurable: true,
        value:
          width === 320
            ? undefined
            : {
                requestPort() {
                  window.devToolsUsbRequests++;
                  throw new DOMException('Unexpected USB request', 'NotAllowedError');
                },
              },
      });
    }, width);
    const page = await context.newPage(),
      errors = [],
      knownDependencyWarnings = [],
      streams = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const text = message.text();
      // Existing LiquidGlass emits this React development-only SVG property warning.
      // Keep it explicit and counted; every other console error still fails below.
      if (
        text.startsWith(
          'Warning: Invalid DOM property `%s`. Did you mean `%s`?%s lighting-color lightingColor',
        ) &&
        text.includes('/node_modules/.vite/deps/@khvicha_react-liquid-glass.js')
      ) {
        knownDependencyWarnings.push(text);
      } else errors.push(text);
    });
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/stream') streams.push(request.url());
    });
    await page.goto(baseURL);
    await page.getByRole('button', { name: '誊写房', exact: true }).click();
    const hardware = page.getByRole('region', { name: '真实硬件连接', exact: true });
    const demo = hardware.getByRole('region', { name: '浏览器光感演示', exact: true });
    const dev = hardware.getByRole('region', { name: '开发者调试', exact: true });
    const title = hardware.getByRole('button', { name: '硬件面板标题', exact: true });
    const light = hardware.getByTestId('hardware-light');
    const scene = page.getByTestId('deskpet3d-scene');
    const snapshot = () =>
      page.evaluate(async () => {
        const url = performance
          .getEntriesByType('resource')
          .find((entry) => entry.name.includes('/src/stores/useLearningStore.js')).name;
        return {
          learning: JSON.stringify((await import(url)).useLearningStore.getState()),
          storage: { ...localStorage },
        };
      });
    const before = await snapshot();
    async function cleanDefault() {
      await expect(dev).toHaveCount(0);
      await expect(hardware.getByLabel('虚拟光感端口', { exact: true })).toHaveCount(0);
      await expect(hardware.getByRole('button', { name: '连接虚拟光感', exact: true })).toHaveCount(
        0,
      );
      await expect(hardware).not.toContainText('Node');
      await expect(hardware).not.toContainText('8765');
      await expect(hardware.locator('.has-error')).toHaveCount(0);
      await expect(demo).toBeVisible();
      expect(
        await demo.evaluate((node) =>
          node.previousElementSibling.classList.contains('hardware-connection-heading'),
        ),
      ).toBe(true);
    }
    await cleanDefault();
    expect(streams).toEqual([]);
    await page.getByRole('button', { name: '誊写房', exact: true }).focus();
    await page.keyboard.press('Control+Shift+D');
    await expect(dev).toHaveCount(0);
    for (let index = 0; index < 4; index++) await title.click();
    await expect(dev).toHaveCount(0);
    await page.waitForTimeout(1600);
    await title.click();
    await expect(dev).toHaveCount(0);
    for (let index = 0; index < 4; index++) await title.click();
    await expect(dev).toBeVisible();
    await dev.getByRole('button', { name: '关闭开发者调试', exact: true }).click();
    await expect(title).toBeFocused();
    await title.dispatchEvent('keydown', {
      key: 'D',
      ctrlKey: true,
      shiftKey: true,
      repeat: true,
      bubbles: true,
    });
    await expect(dev).toHaveCount(0);
    await page.keyboard.press('Control+Shift+D');
    await expect(dev).toBeVisible();
    // Invalid port is rejected locally, without a failed network request or decoder change.
    await dev.getByLabel('虚拟光感端口', { exact: true }).fill('1023');
    await dev.getByRole('button', { name: '连接虚拟光感', exact: true }).click();
    await expect(dev.getByTestId('dev-tools-status')).toContainText('本地虚拟光感不可用');
    await expect(dev.locator('.has-error')).toHaveCount(1);
    await expect(hardware.getByTestId('hardware-connection-status')).not.toContainText('虚拟');
    await dev.getByRole('button', { name: '关闭开发者调试', exact: true }).click();
    await cleanDefault();
    expect(streams).toEqual([]);
    await page.reload();
    await page.getByRole('button', { name: '誊写房', exact: true }).click();
    await cleanDefault();
    expect(await snapshot()).toEqual(before);

    await demo.getByRole('button', { name: '开启浏览器演示', exact: true }).click();
    await expect(light).toHaveText('300');
    await demo.getByRole('button', { name: '遮住光感', exact: true }).click();
    await expect(scene).toHaveAttribute('data-sleeping', 'true');
    await demo.getByRole('button', { name: '恢复光照', exact: true }).click();
    await expect(scene).toHaveAttribute('data-sleeping', 'false');
    await revealDevTools(hardware);
    await expect(dev.getByRole('button', { name: '连接虚拟光感', exact: true })).toBeDisabled();
    await dev.getByRole('button', { name: '关闭开发者调试', exact: true }).click();
    await expect(light).toHaveText('300');
    await demo.getByRole('button', { name: '结束浏览器演示', exact: true }).click();
    await expect(light).toHaveText('—');
    await hardware.screenshot({ path: `test-results/dev-tools-${width}-default.png` });

    device = await startVirtualEsp32({ port: 0, output: { write() {} } });
    await title.focus();
    await page.keyboard.press('Control+Shift+D');
    await expect(dev).toBeVisible();
    await dev.getByLabel('虚拟光感端口', { exact: true }).fill(String(device.port));
    await dev.getByRole('button', { name: '连接虚拟光感', exact: true }).click();
    await expect(light).toHaveText('300');
    await expect(dev.getByTestId('dev-tools-status')).toContainText('接收');
    await expect(demo.getByRole('button', { name: '开启浏览器演示', exact: true })).toBeDisabled();
    await expect(
      hardware.getByRole('button', { name: '连接真实 ESP32', exact: true }),
    ).toBeDisabled();
    device.setLight(50);
    await expect(light).toHaveText('50');
    await expect(scene).toHaveAttribute('data-sleeping', 'true');
    device.setLight(300);
    await expect(light).toHaveText('300');
    await expect(scene).toHaveAttribute('data-sleeping', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await dev.screenshot({ path: `test-results/dev-tools-${width}-bridge.png` });
    await dev.getByRole('button', { name: '关闭开发者调试', exact: true }).click();
    await expect(light).toHaveText('—');
    await expect(demo.getByRole('button', { name: '开启浏览器演示', exact: true })).toBeEnabled();
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const url = performance
            .getEntriesByType('resource')
            .find((entry) =>
              entry.name.includes('/src/features/hardware/useHardwareStore.js'),
            ).name;
          const state = (await import(url)).useHardwareStore.getState();
          return { status: state.status, data: state.hardwareData, notice: state.notice };
        }),
      )
      .toEqual({ status: 'idle', data: null, notice: '' });
    await device.close();
    device = null;
    await cleanDefault();
    await demo.getByRole('button', { name: '开启浏览器演示', exact: true }).click();
    await expect(light).toHaveText('300');
    await demo.getByRole('button', { name: '结束浏览器演示', exact: true }).click();
    await expect(light).toHaveText('—');
    await revealDevTools(hardware);
    await page.reload();
    await page.getByRole('button', { name: '誊写房', exact: true }).click();
    await cleanDefault();
    expect(await page.evaluate(() => window.devToolsUsbRequests)).toBe(0);
    expect(await snapshot()).toEqual(before);
    expect(knownDependencyWarnings).toHaveLength(width === 1440 ? 3 : 0);
    expect(errors).toEqual([]);
    expect(streams).toHaveLength(1);
    report.push({
      width,
      defaultHidden: true,
      scopedShortcut: true,
      fiveClickGate: true,
      refreshResets: true,
      nodeErrorsContained: true,
      bridgeLoop: '300 -> 50/sleep -> 300/wake',
      closeDisconnectsBridge: true,
      browserDemoPreserved: true,
      learningAndStorageUnchanged: true,
      nodeStreamRequests: streams.length,
      usbRequests: 0,
      knownDependencyWarnings,
      errors,
    });
    console.log(
      `PASS DevTools ${width}px: hidden entry, scoped unlock, clean UX, Node loop and cleanup`,
    );
    await context.close();
  } finally {
    await device?.close();
    await browser.close();
  }
}
await writeFile('test-results/dev-tools-check.json', JSON.stringify(report, null, 2));
