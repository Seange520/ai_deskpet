import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.env.SPARKMATE_ADAPTIVE_URL || 'http://127.0.0.1:5232';
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  args: ['--enable-unsafe-swiftshader'],
});
const report = {};
try {
  await mkdir('test-results', { recursive: true });
  for (const mode of ['CPU', 'GPU', 'fallback']) {
    const mobile = mode === 'CPU';
    const context = await browser.newContext({
      viewport: { width: mobile ? 390 : 1440, height: mobile ? 844 : 1080 },
      deviceScaleFactor: 3,
      isMobile: mobile,
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    await context.addInitScript(
      ({ mode, mobile }) => {
        Object.defineProperty(navigator, 'serial', { configurable: true, value: undefined });
        if (!mobile)
          Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 2 });
        const audit = (window.adaptiveAudit = {
          requests: [],
          times: [],
          active: 0,
          peak: 0,
          stopped: 0,
          terminated: 0,
          category: 'Open_Palm',
          writes: 0,
        });
        const save = Storage.prototype.setItem;
        Storage.prototype.setItem = function (...args) {
          audit.writes++;
          return save.apply(this, args);
        };
        Object.defineProperty(navigator, 'mediaDevices', {
          configurable: true,
          value: {
            async getUserMedia(constraints) {
              audit.requests.push(constraints);
              if (mobile && audit.requests.length === 1)
                throw new DOMException('constraint unavailable', 'OverconstrainedError');
              const canvas = document.createElement('canvas');
              canvas.width = 320;
              canvas.height = 240;
              const ctx = canvas.getContext('2d');
              let frame = 0;
              const timer = setInterval(() => {
                ctx.fillStyle = ++frame % 2 ? '#abc' : '#def';
                ctx.fillRect(0, 0, 320, 240);
              }, 20);
              const stream = canvas.captureStream(30);
              for (const track of stream.getTracks()) {
                const stop = track.stop.bind(track);
                track.stop = () => {
                  audit.stopped++;
                  clearInterval(timer);
                  stop();
                };
              }
              return stream;
            },
          },
        });
        window.Worker = class {
          postMessage(data) {
            if (data.type === 'init')
              queueMicrotask(() =>
                this.onmessage?.({
                  data: {
                    type: 'ready',
                    delegate: mode === 'GPU' ? 'GPU' : 'CPU',
                    webgpuAvailable: mode !== 'CPU',
                    fallback: mode === 'fallback',
                  },
                }),
              );
            if (data.type !== 'frame') return;
            audit.times.push(data.timestamp);
            audit.active++;
            audit.peak = Math.max(audit.peak, audit.active);
            data.bitmap.close();
            this.timer = setTimeout(() => {
              audit.active--;
              this.onmessage?.({ data: { type: 'result', category: audit.category, score: 0.68 } });
            }, 15);
          }
          terminate() {
            clearTimeout(this.timer);
            audit.active = 0;
            audit.terminated++;
          }
        };
      },
      { mode, mobile },
    );
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(url);
    const learning = () =>
      page.evaluate(async () => ({
        state: JSON.stringify(
          (await import('/src/stores/useLearningStore.js')).useLearningStore.getState(),
        ),
        save: localStorage.getItem('sparkmate.routes.v2'),
        writes: window.adaptiveAudit.writes,
      }));
    const before = await learning();
    const noOverflow = async () =>
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    if (mobile) {
      for (const width of [320, 390, 768]) {
        await page.setViewportSize({ width, height: 844 });
        await noOverflow();
      }
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
    await noOverflow();
    await expect(page.getByRole('button', { name: '连接真实 ESP32', exact: true })).toBeDisabled();
    await expect(page.getByTestId('hardware-connection-status')).toContainText(
      '当前设备不支持 USB 连接，请在电脑端体验',
    );
    expect(await page.evaluate(() => window.adaptiveAudit.requests.length)).toBe(0);
    await page.getByRole('button', { name: '开启手势摄像头', exact: true }).click();
    await expect(page.getByTestId('gesture-engine-mode')).toHaveAttribute(
      'data-engine',
      mode === 'GPU' ? 'GPU' : 'CPU',
    );
    if (mode === 'fallback')
      await expect(page.getByText('GPU 初始化失败，已切换 CPU', { exact: true })).toBeVisible();
    await expect(page.getByTestId('gesture-current-name')).toHaveText('手势：Open_Palm');
    await expect(page.getByTestId('deskpet3d-scene')).toHaveAttribute(
      'data-motion-request',
      'jump',
    );
    await page.evaluate(() => {
      window.adaptiveAudit.category = 'Closed_Fist';
    });
    await expect(page.getByTestId('gesture-current-name')).toHaveText('手势：Closed_Fist');
    await expect(page.getByTestId('deskpet3d-scene')).toHaveAttribute('data-sleeping', 'true');
    await expect
      .poll(() => page.evaluate(() => window.adaptiveAudit.times.length))
      .toBeGreaterThan(12);
    const timing = await page.evaluate(() => {
      const a = window.adaptiveAudit;
      return {
        minGap: Math.min(...a.times.slice(1).map((t, i) => t - a.times[i])),
        peak: a.peak,
        requests: a.requests,
      };
    });
    expect(timing.minGap).toBeGreaterThanOrEqual(99.9);
    expect(timing.peak).toBe(1);
    expect(timing.requests[0].video.facingMode.ideal).toBe('user');
    if (mobile) expect(timing.requests[1]).toEqual({ video: true, audio: false });
    await page.getByRole('button', { name: '关闭摄像头', exact: true }).click();
    await expect(page.getByTestId('gesture-engine-mode')).toHaveAttribute('data-engine', 'idle');
    await expect(page.getByTestId('gesture-current-name')).toHaveText('手势：None');
    expect(await page.evaluate(() => window.adaptiveAudit.stopped)).toBe(1);
    expect(await page.evaluate(() => window.adaptiveAudit.terminated)).toBe(1);
    expect(await learning()).toEqual(before);
    if (mobile) {
      await page
        .getByRole('region', { name: '桌宠动作与手势控制', exact: true })
        .screenshot({ path: 'test-results/adaptive-mobile-controls.png' });
      await page.getByRole('button', { name: '唤醒', exact: true }).click();
    }
    // Read actual R3F camera and DPR, then send real browser touch events.
    const visual = () =>
      page.evaluate(async () => {
        const resource = performance
          .getEntriesByType('resource')
          .find((e) => e.name.includes('/@react-three_fiber.js'));
        if (!resource) return null;
        const { _roots } = await import(resource.name);
        const canvas = document.querySelector('.pet-focus-stage canvas, .companion canvas');
        const state = _roots.get(canvas)?.store.getState();
        if (!state) return null;
        return {
          camera: state.camera.position.toArray(),
          distance: state.camera.position.length(),
          dpr: state.viewport.dpr,
          width: canvas.getBoundingClientRect().width,
          roots: _roots.size,
        };
      });
    await page.getByTestId('deskpet-focus-button').click();
    await expect.poll(visual).not.toBeNull();
    await expect.poll(async () => (await visual()).width).toBeGreaterThan(mobile ? 300 : 700);
    expect((await visual()).dpr).toBe(1); // small screen or simulated low-power desktop
    expect((await visual()).roots).toBe(1);
    if (mobile) {
      const client = await context.newCDPSession(page);
      const rect = await page.locator('.pet-focus-stage canvas').boundingBox();
      const x = rect.x + rect.width / 2,
        y = rect.y + rect.height / 2;
      const touch = (type, points) =>
        client.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: points.map(([x, y, id]) => ({ x, y, id })),
        });
      const initial = await visual();
      await touch('touchStart', [[x, y, 1]]);
      for (let i = 1; i <= 8; i++) await touch('touchMove', [[x + i * 8, y + i, 1]]);
      await touch('touchEnd', []);
      await expect
        .poll(async () => JSON.stringify((await visual()).camera))
        .not.toBe(JSON.stringify(initial.camera));
      const rotated = await visual();
      await touch('touchStart', [
        [x - 20, y, 1],
        [x + 20, y, 2],
      ]);
      for (let i = 1; i <= 6; i++)
        await touch('touchMove', [
          [x - 20 - i * 4, y, 1],
          [x + 20 + i * 4, y, 2],
        ]);
      await touch('touchEnd', []);
      await expect.poll(async () => (await visual()).distance).toBeLessThan(rotated.distance - 0.1);
      for (const size of [
        { width: 320, height: 568 },
        { width: 844, height: 390 },
        { width: 320, height: 320 },
      ]) {
        await page.setViewportSize(size);
        const close = page.getByRole('button', { name: '关闭桌宠聚焦', exact: true });
        await close.scrollIntoViewIfNeeded();
        await expect(close).toBeInViewport();
        const pet = page.getByRole('button', { name: '摸摸头', exact: true });
        await pet.scrollIntoViewIfNeeded();
        await expect(pet).toBeInViewport();
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole('button', { name: '重置视角', exact: true }).click();
      await page.getByRole('dialog').evaluate((node) => {
        node.scrollTop = 0;
        node.scrollLeft = 0;
      });
      await expect.poll(async () => (await visual()).width).toBeLessThan(391);
      await page.getByRole('dialog').screenshot({ path: 'test-results/adaptive-mobile-focus.png' });
    }
    await page.getByRole('button', { name: '关闭桌宠聚焦', exact: true }).click();
    expect(await learning()).toEqual(before);
    expect(errors).toEqual([]);
    report[mode] = {
      status: 'PASS',
      minInferenceGapMs: timing.minGap,
      maxInFlight: timing.peak,
      mobileTouch: mobile ? 'rotate/pinch/scroll PASS' : 'low-power DPR PASS',
      note: 'Deterministic Worker results; real SDK inference is checked separately.',
    };
    await context.close();
  }
  await writeFile('test-results/adaptive-mobile-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
