import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserDemoSerialProvider } from '../src/features/hardware/browserDemoSerial.js';
import { createSerialConnection } from '../src/features/hardware/serialConnection.js';

const tick = () => new Promise((resolve) => setImmediate(resolve));
class Clock {
  time = 0;
  nextId = 1;
  pending = new Map();
  setTimeout(fn, delay) {
    const id = this.nextId++;
    this.pending.set(id, { fn, at: this.time + delay });
    return id;
  }
  clearTimeout(id) { this.pending.delete(id); }
  async advance(duration) {
    const end = this.time + duration;
    while (true) {
      const next = [...this.pending.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      this.time = next[1].at;
      this.pending.delete(next[0]);
      next[1].fn();
      await tick();
    }
    this.time = end;
    await tick();
  }
}
class Visibility extends EventTarget {
  hidden = false;
  listeners = new Set();
  addEventListener(type, fn) { this.listeners.add(fn); super.addEventListener(type, fn); }
  removeEventListener(type, fn) { this.listeners.delete(fn); super.removeEventListener(type, fn); }
  hide(hidden) { this.hidden = hidden; this.dispatchEvent(new Event('visibilitychange')); }
}
function fixture() {
  const timers = new Clock(), visibility = new Visibility();
  const provider = createBrowserDemoSerialProvider({ timers, visibility });
  const data = [], invalid = [];
  let state = {};
  const client = createSerialConnection({
    getSerial: () => provider,
    onState: (patch) => { state = { ...state, ...patch }; },
    onData: (value) => data.push(value),
    onInvalid: (value) => invalid.push(value),
  });
  return { provider, timers, visibility, client, data, invalid, state: () => state };
}

test('browser demo: real byte stream is decoded by the shared reader; controls and close clean up', async () => {
  const f = fixture();
  const connecting = f.client.connect();
  await tick();
  assert.equal(f.state().status, 'connecting');
  await f.timers.advance(299);
  assert.equal(f.data.length, 0);
  await f.timers.advance(1);
  assert.equal(await connecting, true);
  assert.equal(f.data.at(-1).light, 300);
  assert.equal(f.data.at(-1).temp, null);
  assert.ok(Number.isFinite(f.data.at(-1).receivedAt));
  assert.equal(f.visibility.listeners.size, 1);
  assert.equal(f.timers.pending.size, 1);
  for (const light of [50, 300]) {
    assert.equal(f.provider.setLight(light), true);
    await tick();
    assert.equal(f.data.at(-1).light, light);
  }
  assert.equal(f.provider.setLight(100), false);
  await f.timers.advance(1000);
  assert.deepEqual(f.data.map((value) => value.light), [300, 50, 300, 300]);
  assert.deepEqual(f.invalid, []);
  const port = await f.provider.requestPort();
  assert.equal('writable' in port, false);
  await f.client.disconnect();
  assert.equal(port.readable.locked, false);
  assert.equal(f.state().hardwareData, null);
  assert.equal(f.timers.pending.size, 0);
  assert.equal(f.visibility.listeners.size, 0);
  const count = f.data.length;
  await f.timers.advance(10000);
  assert.equal(f.data.length, count);
  assert.equal(f.provider.setLight(50), false);
});

test('browser demo: cancel during initialization settles the open and leaves no timer/listener', async () => {
  const f = fixture();
  const connecting = f.client.connect();
  await tick();
  assert.equal(f.timers.pending.size, 1);
  await f.client.disconnect();
  assert.equal(await connecting, false);
  await f.timers.advance(10000);
  assert.equal(f.state().status, 'idle');
  assert.equal(f.data.length, 0);
  assert.equal(f.timers.pending.size, 0);
  assert.equal(f.visibility.listeners.size, 0);
});

test('browser demo: hidden pages pause sampling and resume with one fresh reading, no backlog', async () => {
  const f = fixture();
  const connecting = f.client.connect();
  await tick(); await f.timers.advance(300); await connecting;
  f.visibility.hide(true);
  assert.equal(f.timers.pending.size, 0);
  f.provider.setLight(50);
  await f.timers.advance(60000);
  assert.deepEqual(f.data.map((value) => value.light), [300]);
  f.visibility.hide(false);
  await tick();
  assert.deepEqual(f.data.map((value) => value.light), [300, 50]);
  assert.equal(f.timers.pending.size, 1);
  await f.client.disconnect();
  assert.equal(f.visibility.listeners.size, 0);
  assert.equal(f.timers.pending.size, 0);
});

test('browser demo: slow readers have a bounded queue and stream cancellation releases resources', async () => {
  const f = fixture(), port = await f.provider.requestPort();
  const opening = port.open(); await f.timers.advance(300); await opening;
  await f.timers.advance(20000);
  f.provider.setLight(50);
  const reader = port.readable.getReader();
  assert.equal(JSON.parse(new TextDecoder().decode((await reader.read()).value)).light, 300);
  f.provider.setLight(50);
  assert.equal(JSON.parse(new TextDecoder().decode((await reader.read()).value)).light, 50);
  await reader.cancel(); reader.releaseLock(); await port.close(); f.provider.dispose();
  assert.equal(f.timers.pending.size, 0);
  assert.equal(f.visibility.listeners.size, 0);
});

test('browser demo: a cancelled session cannot emit into a later connection', async () => {
  const first = fixture(), second = fixture(), readings = [];
  let provider = first.provider, state = {};
  const client = createSerialConnection({
    getSerial: () => provider,
    onState: (patch) => { state = { ...state, ...patch }; },
    onData: (data) => readings.push(data.light),
    onInvalid: () => assert.fail('valid demo JSON'),
  });
  const oldConnection = client.connect(); await tick(); await client.disconnect();
  provider = second.provider;
  const newConnection = client.connect(); await tick();
  await first.timers.advance(10000); await second.timers.advance(300);
  assert.equal(await oldConnection, false);
  assert.equal(await newConnection, true);
  assert.equal(state.status, 'connected');
  assert.deepEqual(readings, [300]);
  assert.equal(first.provider.setLight(50), false);
  await client.disconnect();
  assert.equal(first.timers.pending.size + second.timers.pending.size, 0);
  assert.equal(first.visibility.listeners.size + second.visibility.listeners.size, 0);
});
