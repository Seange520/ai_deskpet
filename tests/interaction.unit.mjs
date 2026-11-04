import test from 'node:test';
import assert from 'node:assert/strict';
import { startVirtualEsp32 } from '../scripts/virtual-esp32.mjs';
import { createTelemetryDecoder } from '../src/features/hardware/serialConnection.js';
import { createGestureGate } from '../src/features/interaction/gestureGate.js';
import { usePetActions } from '../src/features/interaction/usePetActions.js';
import { createGestureEngine } from '../src/features/interaction/gestureEngine.js';

test('手势稳定门限、低置信度、持续手势去重和冷却', () => {
  const gate = createGestureGate();
  assert.equal(gate.update('Open_Palm', 0.9, 0), null);
  assert.equal(gate.update('Open_Palm', 0.9, 250), 'jump');
  assert.equal(gate.update('Open_Palm', 0.9, 2000), null);
  assert.equal(gate.update('Closed_Fist', 0.9, 2100), null);
  assert.equal(gate.update('Closed_Fist', 0.9, 2400), 'sleep');
  assert.equal(gate.update('', 0, 2500), null);
  assert.equal(gate.update('', 0, 2900), null);
  assert.equal(gate.update('Open_Palm', 0.9, 3000), null);
  assert.equal(gate.update('Open_Palm', 0.9, 3300), null);
  assert.equal(gate.update('Open_Palm', 0.9, 3700), 'jump');
  assert.equal(gate.update('Closed_Fist', 0.2, 5000), null);
});

test('动作仅有临时状态：暗光优先、恢复亮度或断开自动醒来', () => {
  const actions = usePetActions.getState();
  actions.trigger('wake');
  actions.setLight(99);
  assert.equal(usePetActions.getState().dark, true);
  actions.trigger('jump', 'gesture');
  assert.equal(usePetActions.getState().dark, true);
  actions.trigger('sleep', 'gesture');
  actions.setLight(100);
  assert.equal(usePetActions.getState().dark, false);
  assert.equal(usePetActions.getState().sleeping, false);
  const id = usePetActions.getState().event.id;
  actions.setLight(300);
  assert.equal(usePetActions.getState().event.id, id);
  actions.setLight(50);
  actions.setLight(null);
  assert.equal(usePetActions.getState().dark, false);
  assert.equal('routes' in usePetActions.getState(), false);
});

test('Node桥接实际每秒JSON、light-only解析、暗光与唤醒，拒绝外站Origin', async () => {
  const output = [];
  const device = await startVirtualEsp32({
    port: 0,
    output: { write: (line) => output.push(line) },
  });
  const response = await fetch(`http://127.0.0.1:${device.port}/stream`);
  const reader = response.body.getReader();
  const readings = [];
  const parser = createTelemetryDecoder(
    (data) => {
      readings.push(data);
      usePetActions.getState().setLight(data.light);
    },
    () => assert.fail('valid light-only JSON'),
  );
  try {
    parser.push((await reader.read()).value);
    assert.equal(readings.at(-1).light, 300);
    assert.equal(readings.at(-1).temp, null);
    device.setLight(50);
    while (readings.at(-1).light !== 50) parser.push((await reader.read()).value);
    assert.equal(usePetActions.getState().dark, true);
    device.setLight(300);
    while (readings.at(-1).light !== 300) parser.push((await reader.read()).value);
    assert.equal(usePetActions.getState().dark, false);
    assert.equal(
      (
        await fetch(`http://127.0.0.1:${device.port}/health`, {
          headers: { Origin: 'https://unrelated.example' },
        })
      ).status,
      403,
    );
    assert.ok(output.length >= 2);
    assert.ok(output.every((line) => Number.isFinite(JSON.parse(line).light)));
  } finally {
    await reader.cancel();
    reader.releaseLock();
    await device.close();
  }
});

test('Worker引擎初始化/帧请求及中止会释放Worker与待决帧', async () => {
  const OriginalWorker = globalThis.Worker;
  let worker;
  class FakeWorker {
    terminated = false;
    constructor() {
      worker = this;
    }
    postMessage(data) {
      if (data.type === 'init') queueMicrotask(() => this.onmessage({ data: { type: 'ready' } }));
    }
    terminate() {
      this.terminated = true;
    }
  }
  globalThis.Worker = FakeWorker;
  try {
    const abort = new AbortController();
    const engine = await createGestureEngine({ modelURL: 'local.task', signal: abort.signal });
    const pending = engine.recognize({ close() {} }, 1);
    const rejected = assert.rejects(pending);
    abort.abort();
    await rejected;
    assert.equal(worker.terminated, true);
    engine.close();
  } finally {
    globalThis.Worker = OriginalWorker;
  }
});

test('推理无响应时释放Worker并拒绝待决帧，供摄像头Hook降级', async () => {
  const OriginalWorker = globalThis.Worker;
  let worker;
  globalThis.Worker = class {
    constructor() {
      worker = this;
    }
    postMessage(data) {
      if (data.type === 'init') queueMicrotask(() => this.onmessage({ data: { type: 'ready' } }));
    }
    terminate() {
      this.terminated = true;
    }
  };
  try {
    const engine = await createGestureEngine({
      modelURL: 'local.task',
      signal: new AbortController().signal,
      frameTimeoutMs: 20,
    });
    await assert.rejects(engine.recognize({ close() {} }, 1));
    assert.equal(worker.terminated, true);
  } finally {
    globalThis.Worker = OriginalWorker;
  }
});
