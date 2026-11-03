import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Explicit virtual Serial API only in this browser test. Never imported by the app.
const baseURL = process.env.SPARKMATE_SERIAL_URL || 'http://127.0.0.1:5242';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
const results = [];
try {
  for (const mode of ['unsupported', 'denied', 'cancelled', 'open-error', 'stream']) {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: mode === 'unsupported' ? 320 : 1440, height: 1080 },
    });
    try {
      await context.addInitScript((mode) => {
        const state = {
          requests: 0,
          opens: [],
          closes: 0,
          cancels: 0,
          writes: 0,
          activation: [],
          listeners: 0,
        };
        window.serialMock = state;
        if (mode === 'unsupported') {
          Object.defineProperty(navigator, 'serial', { configurable: true, value: undefined });
          return;
        }
        const serial = new EventTarget();
        const add = serial.addEventListener.bind(serial),
          remove = serial.removeEventListener.bind(serial);
        serial.addEventListener = (...args) => {
          state.listeners++;
          add(...args);
        };
        serial.removeEventListener = (...args) => {
          state.listeners--;
          remove(...args);
        };
        serial.requestPort = async () => {
          state.requests++;
          state.activation.push(navigator.userActivation.isActive);
          if (mode === 'denied') throw new DOMException('denied', 'NotAllowedError');
          if (mode === 'cancelled') throw new DOMException('cancelled', 'NotFoundError');
          let input;
          const port = {
            readable: new ReadableStream({
              start(controller) {
                input = controller;
              },
              cancel() {
                state.cancels++;
              },
            }),
            async open(options) {
              if (mode === 'open-error') throw new DOMException('busy', 'NetworkError');
              state.opens.push(options.baudRate);
            },
            async close() {
              if (this.readable.locked) throw Error('reader still locked');
              state.closes++;
            },
            get writable() {
              state.writes++;
              throw Error('read only');
            },
          };
          state.send = (text) => input.enqueue(new TextEncoder().encode(text));
          state.fail = () => input.error(new DOMException('disconnected', 'NetworkError'));
          state.unplug = () => {
            const event = new Event('disconnect');
            Object.defineProperty(event, 'port', { value: port });
            serial.dispatchEvent(event);
          };
          return port;
        };
        Object.defineProperty(navigator, 'serial', { configurable: true, value: serial });
      }, mode);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.goto(baseURL);
      await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
      const panel = page.getByRole('region', { name: '真实硬件连接', exact: true });
      const connect = panel.getByRole('button', { name: '连接真实 ESP32', exact: true });
      await expect(panel).toBeVisible();
      expect(await page.evaluate(() => window.serialMock.requests)).toBe(0);
      const snapshot = () =>
        page.evaluate(async () => {
          const { useLearningStore } = await import('/src/stores/useLearningStore.js');
          return {
            learning: JSON.stringify(useLearningStore.getState()),
            storage: Object.fromEntries(
              Object.keys(localStorage)
                .sort()
                .map((key) => [key, localStorage.getItem(key)]),
            ),
          };
        });
      const before = await snapshot();
      if (mode === 'unsupported') {
        await expect(connect).toBeDisabled();
        await expect(panel).toContainText('不支持硬件连接');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      } else {
        await connect.click();
        if (mode !== 'stream') {
          const text = {
            denied: '未获得串口授权',
            cancelled: '已取消串口选择',
            'open-error': '无法打开串口',
          }[mode];
          await expect(panel.getByTestId('hardware-connection-status')).toContainText(text);
          await expect(connect).toBeEnabled();
          expect(await page.evaluate(() => window.serialMock.opens)).toEqual([]);
        } else {
          await expect(panel).toContainText('串口已连接');
          expect(await page.evaluate(() => window.serialMock.opens)).toEqual([115200]);
          await page.evaluate(() => window.serialMock.send('{"temp":2'));
          await expect(panel.getByTestId('hardware-temp')).toHaveText('—');
          await page.evaluate(() =>
            window.serialMock.send('5,"light":300}\r\n{"temp":26,"light":301}\n'),
          );
          await expect(panel.getByTestId('hardware-temp')).toHaveText('26');
          await expect(panel.getByTestId('hardware-light')).toHaveText('301');
          await expect(panel.getByTestId('hardware-received')).toHaveText('2 条');
          await page.evaluate(() =>
            window.serialMock.send('ESP32 boot\n{"temp":"bad","light":300}\n'),
          );
          await expect(panel).toContainText('已忽略无效数据');
          await expect(panel.getByTestId('hardware-temp')).toHaveText('26');
          await page.evaluate(() =>
            window.serialMock.send('x'.repeat(9000) + '\n{"temp":27,"light":302}\n'),
          );
          await expect(panel.getByTestId('hardware-temp')).toHaveText('27');
          const telemetry = await page.evaluate(async () => {
            const moduleURL = performance
              .getEntriesByType('resource')
              .find((entry) =>
                entry.name.includes('/src/features/hardware/useHardwareStore.js'),
              ).name;
            return (await import(moduleURL)).useHardwareStore.getState();
          });
          expect(telemetry.hardwareData.temp).toBe(27);
          expect(telemetry.hardwareData.light).toBe(302);
          expect(telemetry.invalidLineCount).toBe(3);
          expect(await snapshot()).toEqual(before);
          await mkdir('test-results', { recursive: true });
          await panel.screenshot({ path: 'test-results/web-serial-mock-connected.png' });
          await panel.getByRole('button', { name: '断开硬件连接', exact: true }).click();
          await expect(connect).toBeEnabled();
          await expect(panel.getByTestId('hardware-temp')).toHaveText('—');
          expect(await page.evaluate(() => window.serialMock.closes)).toBe(1);
          expect(await page.evaluate(() => window.serialMock.cancels)).toBe(1);
          expect(await page.evaluate(() => window.serialMock.listeners)).toBe(0);
          await panel.getByLabel('串口波特率', { exact: true }).selectOption('9600');
          await connect.click();
          await expect(panel).toContainText('串口已连接');
          await page.evaluate(() => window.serialMock.fail());
          await expect(panel).toContainText('串口读取中断');
          expect(await page.evaluate(() => window.serialMock.closes)).toBe(2);
          await connect.click();
          await expect(panel).toContainText('串口已连接');
          await page.evaluate(() => window.serialMock.unplug());
          await expect(panel).toContainText('设备已断开');
          expect(await page.evaluate(() => window.serialMock.closes)).toBe(3);
          await connect.click();
          await expect(panel).toContainText('串口已连接');
          await page.getByRole('button', { name: '学习仪表盘', exact: true }).click();
          await expect.poll(() => page.evaluate(() => window.serialMock.closes)).toBe(4);
          expect(await page.evaluate(() => window.serialMock.listeners)).toBe(0);
          await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
          await expect(panel.getByTestId('hardware-temp')).toHaveText('—');
          expect(await page.evaluate(() => window.serialMock.opens)).toEqual([
            115200, 9600, 9600, 9600,
          ]);
          expect(await page.evaluate(() => window.serialMock.writes)).toBe(0);
        }
        expect((await page.evaluate(() => window.serialMock.activation)).every(Boolean)).toBe(true);
      }
      expect(await snapshot()).toEqual(before);
      expect(errors).toEqual([]);
      results.push({ mode, status: 'PASS', learningAndStorageUnchanged: true, errors });
      console.log(`PASS serial ${mode}`);
    } finally {
      await context.close();
    }
  }
  await mkdir('test-results', { recursive: true });
  await writeFile('test-results/web-serial-check.json', JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
