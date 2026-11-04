import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const baseURL = process.env.SPARKMATE_INTERACTION_URL || 'http://127.0.0.1:5252';
const modelOnly = process.argv.includes('--model-only');
const production = process.argv.includes('--production');
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  args: ['--enable-unsafe-swiftshader'],
});
const results = [];
let simulator;
let simulatorPort;
try {
  if (!modelOnly) {
    simulator = spawn(process.execPath, ['scripts/virtual-esp32.mjs', '--port', '0'], {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let log = '';
    simulator.stderr.on('data', (chunk) => {
      log += chunk;
    });
    simulator.stdout.on('data', () => {});
    await expect
      .poll(() => {
        if (simulator.exitCode !== null) throw Error(log);
        simulatorPort = Number(log.match(/http:\/\/127\.0\.0\.1:(\d+)/)?.[1]);
        return Number.isInteger(simulatorPort) && simulatorPort > 0;
      })
      .toBe(true);
    if (!(await fetch(`http://127.0.0.1:${simulatorPort}/health`)).ok) throw Error(log);
    if (simulator.exitCode !== null) throw Error(log);
  }
  for (const mode of modelOnly
    ? ['real']
    : ['unsupported', 'denied', 'late', 'model-error', 'mock', 'real']) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1080 },
      reducedMotion: 'no-preference',
      hasTouch: true,
    });
    try {
      await context.addInitScript((mode) => {
        window.cameraMock = {
          requests: 0,
          stopped: 0,
          frames: 0,
          workers: 0,
          terminated: 0,
          category: '',
          score: 0.95,
          tracks: [],
        };
        const audit = window.cameraMock;
        if (mode === 'unsupported') {
          Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: undefined,
          });
          return;
        }
        function stream() {
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 240;
          const ctx = canvas.getContext('2d');
          let frame = 0;
          const draw = () => {
            ctx.fillStyle = ++frame % 2 ? '#d8e8df' : '#d9e9e0';
            ctx.fillRect(0, 0, 320, 240);
          };
          draw();
          const timer = setInterval(draw, 80);
          const stream = canvas.captureStream(12);
          for (const track of stream.getTracks()) {
            audit.tracks.push(track);
            const stop = track.stop.bind(track);
            track.stop = () => {
              clearInterval(timer);
              audit.stopped++;
              stop();
            };
          }
          return stream;
        }
        const getUserMedia = async (constraints) => {
          audit.requests++;
          if (constraints.audio !== false) throw Error('audio must be off');
          if (mode === 'denied') throw new DOMException('denied', 'NotAllowedError');
          if (mode === 'late')
            return new Promise((resolve) => {
              audit.grant = () => resolve(stream());
            });
          return stream();
        };
        Object.defineProperty(navigator, 'mediaDevices', {
          configurable: true,
          value: { getUserMedia },
        });
        const NativeWorker = window.Worker;
        if (mode === 'real') {
          window.Worker = class extends NativeWorker {
            constructor(...args) {
              super(...args);
              audit.workers++;
              this.addEventListener('message', ({ data }) => {
                if (data.type === 'result') audit.frames++;
              });
            }
            terminate() {
              audit.terminated++;
              super.terminate();
            }
          };
        } else {
          window.Worker = class {
            constructor() {
              audit.workers++;
            }
            postMessage(data) {
              data.bitmap?.close();
              if (data.type === 'init')
                setTimeout(
                  () =>
                    this.onmessage?.({
                      data: { type: mode === 'model-error' ? 'error' : 'ready' },
                    }),
                  0,
                );
              if (data.type === 'frame') {
                audit.frames++;
                setTimeout(
                  () =>
                    this.onmessage?.({
                      data: { type: 'result', category: audit.category, score: audit.score },
                    }),
                  0,
                );
              }
            }
            terminate() {
              audit.terminated++;
            }
          };
        }
      }, mode);
      const page = await context.newPage();
      const errors = [],
        requests = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('request', (r) => requests.push(r.url()));
      const panel = page.getByRole('region', { name: '桌宠动作与手势控制', exact: true });
      await page.goto(baseURL);
      await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
      await expect(panel).toBeVisible();
      expect(await page.evaluate(() => window.cameraMock.requests)).toBe(0);
      expect(
        requests.filter((url) => /gesture_recognizer.task|gesture.worker|vision_wasm/.test(url)),
      ).toEqual([]);
      const learning = () =>
        page.evaluate(async (production) => {
          const save = localStorage.getItem('sparkmate.routes.v2');
          if (production)
            return { save, xp: document.querySelector('.experience-text').textContent };
          const url = performance
            .getEntriesByType('resource')
            .find((entry) => entry.name.includes('/src/stores/useLearningStore.js')).name;
          return { state: JSON.stringify((await import(url)).useLearningStore.getState()), save };
        }, production);
      const before = await learning();
      const start = panel.getByRole('button', { name: '开启手势摄像头', exact: true });
      const close = panel.getByRole('button', { name: '关闭摄像头', exact: true });
      async function visual() {
        return page.evaluate(async () => {
          const url = performance
            .getEntriesByType('resource')
            .find((e) => e.name.includes('/@react-three_fiber.js'))?.name;
          if (!url) return null;
          const { _roots } = await import(url);
          const state = _roots.get(document.querySelector('.companion canvas'))?.store.getState();
          const body = state?.scene.getObjectByName('command-pet');
          if (!body) return null;
          const eyes = [];
          body.traverse((o) => {
            if (o.material?.name === 'command-eye')
              eyes.push({ scale: o.scale.y, brightness: o.material.emissiveIntensity });
          });
          return {
            y: body.position.y,
            rotation: body.rotation.y,
            head: state.scene.getObjectByName('command-head').rotation.x,
            eyes,
            geometries: state.gl.info.memory.geometries,
            roots: _roots.size,
          };
        });
      }
      if (mode === 'unsupported') {
        await expect(start).toBeDisabled();
        await expect(panel).toContainText('不支持');
      } else {
        await start.click();
        if (mode === 'late') {
          await expect(close).toBeVisible();
          await close.click();
          await page.evaluate(() => window.cameraMock.grant());
          await expect.poll(() => page.evaluate(() => window.cameraMock.stopped)).toBe(1);
          expect(await page.evaluate(() => window.cameraMock.workers)).toBe(0);
        } else if (['denied', 'model-error'].includes(mode)) {
          await expect(panel).toContainText(
            mode === 'denied' ? '未获摄像头授权' : '手势控制暂不可用',
          );
          await expect(start).toBeDisabled();
          expect(
            await page.evaluate(() =>
              window.cameraMock.tracks.every((t) => t.readyState === 'ended'),
            ),
          ).toBe(true);
        } else {
          await expect(panel).toContainText('识别中', { timeout: 40000 });
          await expect
            .poll(() => page.evaluate(() => window.cameraMock.frames), { timeout: 10000 })
            .toBeGreaterThan(0);
          if (!production) await expect.poll(visual).not.toBeNull();
          else await expect(page.locator('.companion canvas')).toBeVisible();
          if (mode === 'mock') {
            const scene = page.locator('.companion').getByTestId('deskpet3d-scene');
            await page.evaluate(() => {
              window.cameraMock.category = 'Open_Palm';
            });
            await expect(scene).toHaveAttribute('data-motion-request', 'jump');
            await expect
              .poll(async () => (await visual()).y, { intervals: [25, 50, 100] })
              .toBeGreaterThan(0.2);
            const actionId = await page.evaluate(async () => {
              const u = performance
                .getEntriesByType('resource')
                .find((e) => e.name.includes('/src/features/interaction/usePetActions.js')).name;
              return (await import(u)).usePetActions.getState().event.id;
            });
            await page.waitForTimeout(1400);
            expect(
              await page.evaluate(async () => {
                const u = performance
                  .getEntriesByType('resource')
                  .find((e) => e.name.includes('/src/features/interaction/usePetActions.js')).name;
                return (await import(u)).usePetActions.getState().event.id;
              }),
            ).toBe(actionId);
            await panel.getByRole('button', { name: '旋转一圈', exact: true }).click();
            await expect
              .poll(async () => (await visual()).rotation, { intervals: [25, 50, 100] })
              .toBeGreaterThan(1);
            await expect.poll(async () => (await visual()).rotation, { timeout: 5000 }).toBe(0);
            await page.evaluate(() => {
              window.cameraMock.category = 'Closed_Fist';
            });
            await expect(scene).toHaveAttribute('data-sleeping', 'true');
            await expect.poll(async () => (await visual()).eyes[0].scale).toBeLessThan(0.1);
            await expect.poll(async () => (await visual()).head).toBeGreaterThan(0.3);
            const sleeping = await visual();
            await expect
              .poll(async () => Math.abs((await visual()).y - sleeping.y), {
                intervals: [50, 100, 200],
              })
              .toBeGreaterThan(0.002);
            await close.click();
            const hardware = page.getByRole('region', { name: '真实硬件连接', exact: true });
            await hardware.getByLabel('虚拟光感端口', { exact: true }).fill(String(simulatorPort));
            await hardware.getByRole('button', { name: '连接虚拟光感', exact: true }).click();
            await expect(hardware.getByTestId('hardware-light')).toHaveText('300');
            simulator.stdin.write('d\n');
            await expect(hardware.getByTestId('hardware-light')).toHaveText('50');
            await expect(scene).toHaveAttribute('data-sleeping', 'true');
            await expect.poll(async () => (await visual()).eyes[0].scale).toBeLessThan(0.1);
            simulator.stdin.write('b\n');
            await expect(hardware.getByTestId('hardware-light')).toHaveText('300');
            await expect(scene).toHaveAttribute('data-sleeping', 'false');
            await expect.poll(async () => (await visual()).eyes[0].scale).toBeGreaterThan(1.59);
            await expect(hardware.getByTestId('hardware-temp')).toHaveText('—');
            await hardware.getByRole('button', { name: '断开硬件连接', exact: true }).click();
            expect((await visual()).geometries).toBe(11);
            expect((await visual()).roots).toBe(1);
            await mkdir('test-results', { recursive: true });
            await panel.screenshot({ path: 'test-results/phase4-gesture-controls.png' });
          } else {
            console.log(
              'PASS actual MediaPipe model: Worker initialized and processed synthetic video frames',
            );
            await close.click();
          }
          await expect(start).toBeVisible();
          expect(
            await page.evaluate(() =>
              window.cameraMock.tracks.every((t) => t.readyState === 'ended'),
            ),
          ).toBe(true);
          expect(await page.evaluate(() => window.cameraMock.terminated)).toBeGreaterThan(0);
        }
      }
      expect(await learning()).toEqual(before);
      expect(errors).toEqual([]);
      results.push({
        mode,
        status: 'PASS',
        realModel: mode === 'real',
        learningUnchanged: true,
        errors,
      });
      console.log(`PASS interaction ${mode}`);
    } finally {
      await context.close();
    }
  }
  await mkdir('test-results', { recursive: true });
  await writeFile(
    production
      ? 'test-results/phase4-model-production.json'
      : modelOnly
        ? 'test-results/phase4-model.json'
        : 'test-results/phase4-interaction.json',
    JSON.stringify(results, null, 2),
  );
} finally {
  simulator?.stdin.write('q\n');
  simulator?.stdin.end();
  await browser.close();
}
