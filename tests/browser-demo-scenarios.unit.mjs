import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserDemoSerialProvider } from '../src/features/hardware/browserDemoSerial.js';
import { createSerialConnection } from '../src/features/hardware/serialConnection.js';
const tick = () => new Promise((resolve) => setImmediate(resolve));
function fixture() {
  const pending = new Map(); let now = 0, id = 0;
  const timers = {
    setTimeout(fn, delay) { pending.set(++id, { fn, at: now + delay }); return id; },
    clearTimeout(key) { pending.delete(key); },
    async advance(ms) {
      const end = now + ms;
      while (true) {
        const first = [...pending.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (!first || first[1].at > end) break;
        now = first[1].at; pending.delete(first[0]); first[1].fn(); await tick();
      }
      now = end; await tick();
    },
  };
  const visibility = new EventTarget(); visibility.hidden = false;
  const provider = createBrowserDemoSerialProvider({ timers, visibility });
  const data = [], invalid = []; let state = {};
  const client = createSerialConnection({ getSerial: () => provider,
    onState: (patch) => { state = { ...state, ...patch }; },
    onData: (value) => { data.push(value); state.hardwareData = value; },
    onInvalid: (message) => invalid.push(message),
  });
  return { provider, client, data, invalid, timers, pending, visibility, state: () => state,
    async open() { const connect = client.connect(); await tick(); await timers.advance(300); assert.equal(await connect, true); } };
}
test('paused demo retains connection and last reading through controls and visibility changes', async () => {
  const f = fixture(); await f.open();
  f.provider.setLight(50); await tick();
  assert.equal(f.provider.setPaused(true), true);
  assert.equal(f.pending.size, 0);
  f.provider.setLight(300);
  f.visibility.hidden = true; f.visibility.dispatchEvent(new Event('visibilitychange'));
  f.visibility.hidden = false; f.visibility.dispatchEvent(new Event('visibilitychange'));
  await f.timers.advance(60000);
  assert.equal(f.state().status, 'connected');
  assert.equal(f.state().hardwareData.light, 50);
  assert.deepEqual(f.data.map((d) => d.light), [300, 50]);
  assert.equal(f.provider.injectInvalidLine(), false);
  assert.equal(f.provider.setPaused(false), true); await tick();
  assert.equal(f.data.at(-1).light, 300); assert.equal(f.pending.size, 1);
  await f.client.disconnect(); assert.equal(f.pending.size, 0);
});
test('dirty bytes hit the unchanged decoder, preserve last telemetry, then recover on the ordinary next sample', async () => {
  const f = fixture(); await f.open();
  assert.equal(f.provider.injectInvalidLine(), true); await tick();
  assert.equal(f.invalid.length, 1); assert.match(f.invalid[0], /已忽略无效数据/);
  assert.equal(f.state().status, 'connected'); assert.equal(f.data.length, 1);
  assert.equal(f.data.at(-1).light, 300);
  await f.timers.advance(999); assert.equal(f.data.length, 1);
  await f.timers.advance(1); assert.equal(f.data.length, 2);
  assert.equal(f.data.at(-1).light, 300); assert.equal(f.invalid.length, 1);
  await f.client.disconnect(); assert.equal(f.pending.size, 0);
});
test('shared disconnect during dirty-data recovery cancels scheduled samples and permits a clean new source', async () => {
  const f = fixture(); await f.open();
  f.provider.injectInvalidLine(); await tick();
  const port = await f.provider.requestPort();
  await f.client.disconnect(); assert.equal(f.pending.size, 0);
  assert.equal(port.readable.locked, false); assert.equal(f.state().hardwareData, null);
  await f.timers.advance(10000); assert.equal(f.data.length, 1);
  assert.equal(f.provider.setPaused(false), false); assert.equal(f.provider.injectInvalidLine(), false);
  const second = fixture(); await second.open(); assert.equal(second.data[0].light, 300);
  await second.client.disconnect(); assert.equal(second.pending.size, 0);
});
