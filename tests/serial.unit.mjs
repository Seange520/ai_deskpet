import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSerialConnection,
  createTelemetryDecoder,
} from '../src/features/hardware/serialConnection.js';

const encode = (text) => new TextEncoder().encode(text);
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
function port() {
  let controller;
  return {
    opened: 0,
    closed: 0,
    baudRate: null,
    readable: new ReadableStream({
      start(c) {
        controller = c;
      },
    }),
    async open(options) {
      this.opened++;
      this.baudRate = options.baudRate;
    },
    async close() {
      assert.equal(this.readable.locked, false);
      this.closed++;
    },
    send: (text) => controller.enqueue(encode(text)),
    end: () => controller.close(),
    fail: () => controller.error(new Error('unplugged')),
  };
}
function fixture(requestPort) {
  let state = {};
  const data = [],
    invalid = [];
  const listeners = new Set();
  const serial = {
    requestPort,
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
  };
  const client = createSerialConnection({
    getSerial: () => serial,
    onState: (patch) => {
      state = { ...state, ...patch };
    },
    onData: (value) => {
      data.push(value);
      state.hardwareData = value;
    },
    onInvalid: (message) => invalid.push(message),
  });
  return { client, data, invalid, state: () => state, listeners };
}

test('JSON行解码：分包、UTF-8/CRLF边界、多行、坏行与超长行恢复', () => {
  const data = [],
    invalid = [];
  const parser = createTelemetryDecoder(
    (value) => data.push(value),
    (message) => invalid.push(message),
  );
  const bytes = encode('{"temp":25,"light":300,"note":"温度"}\r\n');
  for (const byte of bytes) parser.push(new Uint8Array([byte]));
  parser.push(encode('boot log\nnull\n{"temp":"25","light":300}\n{"temp":0,"light":0}\n'));
  parser.push(encode('x'.repeat(8193)));
  parser.push(encode('more\n{"temp":-5,"light":10}\n{"temp":26,"light":301}'));
  parser.finish();
  assert.deepEqual(
    data.map(({ temp, light }) => ({ temp, light })),
    [
      { temp: 25, light: 300 },
      { temp: 0, light: 0 },
      { temp: -5, light: 10 },
      { temp: 26, light: 301 },
    ],
  );
  assert.equal(invalid.length, 4);
});

test('不支持与授权拒绝不会抛出或打开串口，拒绝后可再次尝试', async () => {
  let state;
  const unsupported = createSerialConnection({
    getSerial: () => null,
    onState: (s) => {
      state = s;
    },
    onData() {},
    onInvalid() {},
  });
  assert.equal(await unsupported.connect(), false);
  assert.match(state.message, /不支持/);
  const f = fixture(async () => {
    throw new DOMException('denied', 'NotAllowedError');
  });
  assert.equal(await f.client.connect(), false);
  assert.match(f.state().message, /授权/);
  assert.equal(await f.client.connect(), false);
});

test('连接只由显式调用开始，按默认波特率读取并在断开后释放锁和监听', async () => {
  const device = port();
  let requests = 0;
  const f = fixture(async () => {
    requests++;
    return device;
  });
  assert.equal(requests, 0);
  assert.equal(await f.client.connect(), true);
  assert.equal(device.baudRate, 115200);
  assert.equal(await f.client.connect(), false);
  assert.equal(requests, 1);
  device.send('{"temp":25,"light":300}\n');
  await tick();
  assert.equal(f.data.length, 1);
  assert.equal(f.state().status, 'connected');
  assert.equal(f.listeners.size, 1);
  await f.client.disconnect();
  assert.equal(device.closed, 1);
  assert.equal(device.readable.locked, false);
  assert.equal(f.listeners.size, 0);
  assert.equal(f.state().status, 'idle');
  assert.equal(f.state().hardwareData, null);
});

test('读取异常与正常EOF均会关闭串口，不保留过期遥测', async () => {
  for (const fail of [false, true]) {
    const device = port();
    const f = fixture(async () => device);
    await f.client.connect();
    device.send('{"temp":25,"light":300}\n');
    await tick();
    if (fail) device.fail();
    else device.end();
    await tick();
    await tick();
    assert.equal(device.closed, 1);
    assert.equal(f.state().status, fail ? 'error' : 'idle');
    assert.equal(f.state().hardwareData, null);
    assert.equal(f.listeners.size, 0);
  }
});

test('取消尚未完成的选择：迟到的端口不会被打开', async () => {
  let choose;
  const device = port();
  const f = fixture(
    () =>
      new Promise((resolve) => {
        choose = resolve;
      }),
  );
  const connecting = f.client.connect();
  await f.client.disconnect();
  choose(device);
  assert.equal(await connecting, false);
  assert.equal(device.opened, 0);
  assert.equal(f.state().status, 'idle');
});

test('取消正在打开的端口：打开完成后关闭，迟到回调不覆盖新连接', async () => {
  let opened;
  const old = port();
  old.open = () =>
    new Promise((resolve) => {
      opened = resolve;
    });
  const next = port();
  let calls = 0;
  const f = fixture(async () => (calls++ === 0 ? old : next));
  const connecting = f.client.connect();
  await tick();
  await f.client.disconnect();
  await f.client.connect({ baudRate: 9600 });
  opened();
  assert.equal(await connecting, false);
  assert.equal(old.closed, 1);
  assert.equal(next.baudRate, 9600);
  assert.equal(f.state().status, 'connected');
  next.send('{"temp":20,"light":100}\n');
  await tick();
  assert.equal(f.data.length, 1);
  await f.client.disconnect();
});

test('物理断开事件取消待决读取，关闭一次并显示错误', async () => {
  const device = port();
  const f = fixture(async () => device);
  await f.client.connect();
  for (const listener of f.listeners) listener({ port: device });
  await tick();
  await tick();
  assert.equal(device.closed, 1);
  assert.equal(f.state().status, 'error');
  assert.match(f.state().message, /设备已断开/);
  assert.equal(f.listeners.size, 0);
});

test('关闭失败也被捕获，UI收到可恢复错误而非未处理异常', async () => {
  const device = port();
  device.close = () => {
    throw new Error('close failed');
  };
  const f = fixture(async () => device);
  await f.client.connect();
  await f.client.disconnect();
  assert.equal(f.state().status, 'error');
  assert.match(f.state().message, /关闭失败/);
});
