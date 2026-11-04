import test from 'node:test';
import assert from 'node:assert/strict';
import { createSerialDemoSession } from '../src/features/hardware/serialDemoSession.js';

function fixture(source = 'demo') {
  let state = { source, status: 'connecting', hardwareData: null, receivedCount: 0, invalidLineCount: 0, notice: '' };
  const listeners = new Set();
  const store = {
    getState: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    patch(patch) { const previous = state; state = { ...state, ...patch }; for (const fn of listeners) fn(state, previous); },
  };
  let snapshot = { samples: [], events: [] };
  const session = createSerialDemoSession(store, (next) => { snapshot = next; });
  return { store, session, listeners, snapshot: () => snapshot };
}

test('demo session captures every decoded packet with bounded 60/40 buffers, including equal readings', () => {
  const f = fixture();
  f.store.patch({ status: 'connected' });
  for (let count = 1; count <= 200; count++) {
    f.store.patch({ hardwareData: { light: 50, receivedAt: count }, receivedCount: count });
    assert.ok(f.snapshot().samples.length <= 60);
    assert.ok(f.snapshot().events.length <= 40);
  }
  assert.equal(f.snapshot().samples.length, 60);
  assert.equal(f.snapshot().samples[0].receivedAt, 141);
  assert.equal(f.snapshot().samples.at(-1).receivedAt, 200);
  assert.equal(f.snapshot().events.length, 40);
  assert.ok(f.snapshot().events.every((event) => event.kind === 'telemetry'));
  assert.equal(f.snapshot().events[0].at, 161);
  const before = f.snapshot();
  f.store.patch({ message: 'same packet, different display message' });
  assert.equal(f.snapshot(), before);
  f.session.dispose();
  assert.equal(f.listeners.size, 0);
});

test('demo events distinguish commands, decoded telemetry and actual warnings without adding fake samples', () => {
  const f = fixture();
  f.store.patch({ status: 'connected' });
  f.session.recordCommand(50, true);
  assert.equal(f.snapshot().events.at(-1).kind, 'simulator');
  assert.match(f.snapshot().events.at(-1).message, /模拟发送/);
  f.store.patch({ hardwareData: { light: 50, receivedAt: 123 }, receivedCount: 1 });
  assert.equal(f.snapshot().events.at(-1).kind, 'telemetry');
  f.store.patch({ notice: '无效 JSON 已忽略', invalidLineCount: 1 });
  assert.equal(f.snapshot().events.at(-1).kind, 'warning');
  f.store.patch({ status: 'error', message: '演示连接异常' });
  assert.equal(f.snapshot().events.at(-1).message, '演示连接异常');
  assert.equal(f.snapshot().samples.length, 1);
  f.session.dispose();
});

test('switching to real/Node sources clears session UI and never records their telemetry', () => {
  for (const source of ['serial', 'virtual']) {
    const f = fixture();
    f.store.patch({ status: 'connected', hardwareData: { light: 300, receivedAt: 1 }, receivedCount: 1 });
    f.store.patch({ source, hardwareData: { light: 999, receivedAt: 2 }, receivedCount: 2 });
    assert.deepEqual(f.snapshot(), { samples: [], events: [] });
    f.session.recordCommand(50, true);
    f.store.patch({ hardwareData: { light: 888, receivedAt: 3 }, receivedCount: 3 });
    assert.deepEqual(f.snapshot(), { samples: [], events: [] });
    f.session.dispose();
    assert.equal(f.listeners.size, 0);
  }
});

test('disconnect and restart discard previous history; disposed subscriptions cannot publish', () => {
  const f = fixture();
  f.store.patch({ status: 'connected', hardwareData: { light: 50, receivedAt: 1 }, receivedCount: 1 });
  f.store.patch({ status: 'disconnecting', hardwareData: null });
  assert.deepEqual(f.snapshot(), { samples: [], events: [] });
  f.store.patch({ status: 'requesting', receivedCount: 0 });
  f.store.patch({ status: 'connected', hardwareData: { light: 300, receivedAt: 2 }, receivedCount: 1 });
  assert.equal(f.snapshot().samples.length, 1);
  assert.equal(f.snapshot().samples[0].light, 300);
  const saved = f.snapshot();
  f.session.dispose();
  f.store.patch({ hardwareData: { light: 50, receivedAt: 3 }, receivedCount: 2 });
  f.session.recordCommand(50, true);
  assert.equal(f.snapshot(), saved);
  assert.equal(f.listeners.size, 0);
});
