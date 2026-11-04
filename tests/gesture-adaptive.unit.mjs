import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdaptiveRecognizer } from '../src/features/interaction/gestureDelegate.js';
import { requestGestureCamera } from '../src/features/interaction/gestureCamera.js';
import { createGestureGate } from '../src/features/interaction/gestureGate.js';

test('GPU 成功才上报 GPU，无 GPU 能力直接 CPU', async () => {
  for (const preferred of [true, false]) {
    const calls = [],
      recognizer = {};
    const result = await createAdaptiveRecognizer(async (delegate) => {
      calls.push(delegate);
      return recognizer;
    }, preferred);
    assert.deepEqual(calls, [preferred ? 'GPU' : 'CPU']);
    assert.equal(result.delegate, calls[0]);
    assert.equal(result.recognizer, recognizer);
    assert.equal(result.fallback, false);
  }
});
test('GPU 初始化失败重试 CPU，两者均失败则交由 Worker 的原错误降级处理', async () => {
  const calls = [];
  const result = await createAdaptiveRecognizer(async (delegate) => {
    calls.push(delegate);
    if (delegate === 'GPU') throw Error('GPU unavailable');
    return {};
  }, true);
  assert.deepEqual(calls, ['GPU', 'CPU']);
  assert.equal(result.delegate, 'CPU');
  assert.equal(result.fallback, true);
  await assert.rejects(
    createAdaptiveRecognizer(async () => {
      throw Error('unavailable');
    }, true),
  );
});
test('0.65 置信度和 150ms 边界，持续持有仍只触发一次', () => {
  const gate = createGestureGate();
  assert.equal(gate.update('Open_Palm', 0.64, 0), null);
  assert.equal(gate.update('Open_Palm', 0.65, 100), null);
  assert.equal(gate.update('Open_Palm', 0.65, 249), null);
  assert.equal(gate.update('Open_Palm', 0.65, 250), 'jump');
  assert.equal(gate.update('Open_Palm', 0.9, 2000), null);
});
test('摄像头优先前置、10 FPS、禁音；约束不兼容才退到通用视频', async () => {
  const calls = [],
    stream = {};
  const media = {
    async getUserMedia(options) {
      calls.push(options);
      if (calls.length === 1) throw { name: 'OverconstrainedError' };
      return stream;
    },
  };
  assert.equal(await requestGestureCamera(media, () => true), stream);
  assert.deepEqual(calls[0].video.facingMode, { ideal: 'user' });
  assert.equal(calls[0].video.frameRate.max, 10);
  assert.equal(calls[0].audio, false);
  assert.deepEqual(calls[1], { video: true, audio: false });
});
test('拒绝权限或取消会话不会再次申请摄像头', async () => {
  for (const [name, live] of [
    ['NotAllowedError', true],
    ['OverconstrainedError', false],
  ]) {
    let calls = 0;
    await assert.rejects(
      requestGestureCamera(
        {
          async getUserMedia() {
            calls++;
            throw { name };
          },
        },
        () => live,
      ),
    );
    assert.equal(calls, 1);
  }
});
