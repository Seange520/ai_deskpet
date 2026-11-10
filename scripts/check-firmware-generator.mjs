import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { ESP32_FIRMWARE } from '../src/features/hardware/esp32Firmware.js';

const url = process.env.SPARKMATE_FIRMWARE_URL || 'http://127.0.0.1:5232';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
const report = {};
try {
  for (const mode of ['success', 'rejected', 'missing']) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1080 },
      reducedMotion: 'reduce',
    });
    await context.addInitScript((mode) => {
      window.firmwareCopied = null;
      window.firmwareSerialRequests = 0;
      window.firmwareStorageWrites = 0;
      const save = Storage.prototype.setItem;
      Storage.prototype.setItem = function (...args) {
        window.firmwareStorageWrites++;
        return save.apply(this, args);
      };
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value:
          mode === 'missing'
            ? undefined
            : {
                async writeText(text) {
                  if (mode === 'rejected') throw new DOMException('Denied', 'NotAllowedError');
                  window.firmwareCopied = text;
                },
              },
      });
      Object.defineProperty(navigator, 'serial', {
        configurable: true,
        value: {
          async requestPort() {
            window.firmwareSerialRequests++;
            throw new Error('Unexpected serial access');
          },
        },
      });
    }, mode);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(url);
    await page.getByRole('button', { name: '誊写房', exact: true }).click();
    const panel = page.getByTestId('firmware-generator');
    const business = () =>
      page.evaluate(async () => ({
        state: JSON.stringify(
          (await import('/src/stores/useLearningStore.js')).useLearningStore.getState(),
        ),
        save: localStorage.getItem('sparkmate.routes.v2'),
        writes: window.firmwareStorageWrites,
      }));
    const before = await business();
    expect(await panel.evaluate((node) => node.open)).toBe(false);
    await panel.locator('summary').focus();
    await page.keyboard.press('Enter');
    const code = page.getByLabel('ESP32 Arduino 固件代码', { exact: true });
    await expect(code).toBeVisible();
    expect(await code.textContent()).toBe(ESP32_FIRMWARE);
    await expect(panel).toContainText(
      '1. 复制代码到 Arduino IDE；2. 烧录到 ESP32；3. 连接 USB；4. 在上方点击连接。',
    );
    await panel.getByRole('button', { name: '一键复制固件代码', exact: true }).click();
    if (mode === 'success') {
      await expect(panel.getByRole('status')).toContainText('固件代码已复制');
      expect(await page.evaluate(() => window.firmwareCopied)).toBe(ESP32_FIRMWARE);
    } else {
      await expect(panel.getByRole('status')).toContainText('自动复制不可用');
      await expect(code).toBeFocused();
      // Browser text selection omits the final line break of a preformatted block.
      expect(await page.evaluate(() => window.getSelection().toString())).toBe(
        ESP32_FIRMWARE.trimEnd(),
      );
    }
    expect(await business()).toEqual(before);
    expect(await page.evaluate(() => window.firmwareSerialRequests)).toBe(0);
    if (mode === 'success') {
      await mkdir('test-results', { recursive: true });
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 1080 });
        await panel.scrollIntoViewIfNeeded();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await panel.screenshot({ path: `test-results/firmware-generator-${width}.png` });
      }
    }
    await panel.locator('summary').click();
    await expect(code).not.toBeVisible();
    await page.getByRole('button', { name: '校验册', exact: true }).click();
    await expect(page.getByRole('heading', { name: /每个伟大的创造/ })).toBeVisible();
    expect(errors).toEqual([]);
    report[mode] =
      'PASS: exact template, clipboard outcome, keyboard disclosure, no serial/learning/storage side effects, navigation';
    await context.close();
  }
  await writeFile('test-results/firmware-generator-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
