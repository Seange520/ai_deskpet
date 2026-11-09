import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMission,
  transition,
  scoreMission,
  inRange,
} from '../src/features/mission/mission.mjs';
import { ORDERS, POINTS, objective, STEP_LABELS } from '../src/features/mission/missionData.mjs';

const run = (state, type, extra = {}, now = 1000) => transition(state, { type, ...extra }, now);
function at(state, point) {
  const p = POINTS.find((p) => p.id === point);
  return run(run(state, 'move', { position: [p.position[0], p.position[2] + 1] }), 'interact', {
    point,
  });
}
function start(track = 'validation', orderIndex = 0) {
  return run(run(createMission({ track, orderIndex }), 'accept', {}, 1000), 'begin');
}
function record(state) {
  return run(run(state, 'measure'), 'record');
}
function isolate(state) {
  state = at(state, 'switch');
  if (ORDERS[state.orderIndex].live) state = record(state);
  return run(state, 'isolate');
}
function repair(state, evidence = true) {
  state = at(state, ORDERS[state.orderIndex].target);
  state = run(state, 'inspect');
  if (evidence) state = record(state);
  return run(state, 'repair');
}
function finish(state, evidence = true) {
  if (evidence) state = record(state);
  state = run(state, 'verify');
  return run(at(state, 'switch'), 'energize', {}, 121000);
}

test('three distinct, complete commissions and four interaction points', () => {
  assert.equal(ORDERS.length, 3);
  assert.equal(POINTS.length, 4);
  assert.equal(new Set(ORDERS.map((o) => o.target)).size, 3);
  assert.deepEqual(
    ORDERS.map((o) => o.live),
    [false, false, true],
  );
  ORDERS.forEach((order) => {
    for (const key of ['title', 'symptom', 'fault', 'repair', 'before', 'after', 'feedback'])
      assert.ok(order[key]);
  });
  Object.keys(STEP_LABELS).forEach((step) => assert.ok(objective({ ...createMission(), step })));
});
for (let index = 0; index < 3; index++) {
  test(`validation commission ${ORDERS[index].id}: full legal sequence and evidence yields 100`, () => {
    let s = start('validation', index);
    assert.equal(s.step, 'powered');
    s = isolate(s);
    assert.equal(s.step, 'isolated');
    s = repair(s);
    assert.equal(s.step, 'repaired');
    s = finish(s);
    assert.equal(s.step, 'scored');
    assert.equal(s.result.score, 100);
    assert.equal(s.result.elapsedSeconds, 120);
    assert.deepEqual(s.result.components, {
      correctness: 100,
      evidence: 100,
      time: 100,
      safety: 100,
    });
  });
  test(`experience commission ${ORDERS[index].id}: no fault measurements required`, () => {
    const s = finish(repair(isolate(start('experience', index)), false), false);
    assert.equal(s.step, 'scored');
    assert.ok(s.result.score <= 70);
  });
}
test('distance and selection prevent remote actions', () => {
  let s = start();
  s = run(s, 'move', { position: [8, 6] });
  const invalid = run(s, 'interact', { point: 'switch' });
  assert.equal(invalid.selected, null);
  assert.match(invalid.message, /距离太远/);
  assert.equal(run(invalid, 'isolate').step, 'powered');
  s = at(s, 'switch');
  s = run(s, 'move', { position: [5, 6] });
  assert.equal(s.selected, null);
  assert.equal(run(s, 'isolate').step, 'powered');
  assert.equal(inRange([0, 0], 'missing'), false);
});
test('illegal skips and unknown events never complete the mission', () => {
  for (const step of ['idle', 'briefed', 'powered', 'isolated', 'located']) {
    const s = at({ ...createMission(), step }, 'switch');
    assert.equal(run(s, 'energize').step, step);
    assert.equal(run(s, 'nonsense'), s);
  }
});
test('unsafe wiring and prying enter violated and deduct safety', () => {
  for (const type of ['pry', 'repair']) {
    const s = run(at(start(), 'meter'), type);
    assert.equal(s.step, 'violated');
    assert.equal(s.safety, 80);
    assert.equal(s.failures, 1);
    const retry = run(s, 'retry');
    assert.equal(retry.step, 'retry');
    assert.equal(run(retry, 'resume').step, 'powered');
  }
});
test('three failures restart only the current commission and preserve penalties', () => {
  let s = start('validation', 1);
  for (let i = 0; i < 3; i++) {
    s = run(at(s, 'joint'), 'pry');
    assert.equal(s.failures, i + 1);
    s = run(s, 'retry');
    if (i < 2) s = run(s, 'resume');
  }
  assert.equal(s.step, 'briefed');
  assert.equal(s.orderIndex, 1);
  assert.equal(s.restarts, 1);
  assert.equal(s.failures, 0);
  assert.equal(s.safety, 40);
  assert.equal(s.evidence.length, 0);
});
test('premature energizing causes relapse and the third relapse requires restart', () => {
  let s = start();
  for (let i = 0; i < 3; i++) {
    if (i === 0) s = isolate(s);
    s = repair(s);
    s = run(at(s, 'switch'), 'energize');
    assert.equal(s.step, i === 2 ? 'violated' : 'isolated');
    assert.equal(s.evidence.filter((e) => e.key === 'post').length, 0);
  }
  assert.equal(run(s, 'retry').step, 'briefed');
});
test('validation gates require separate pre and post records; records deduplicate', () => {
  let s = at(isolate(start()), 'meter');
  s = run(s, 'inspect');
  assert.equal(run(s, 'repair').step, 'located');
  s = record(s);
  s = run(s, 'record');
  assert.equal(s.evidence.length, 1);
  s = run(s, 'repair');
  assert.equal(run(s, 'verify').step, 'repaired');
  s = run(s, 'measure');
  assert.equal(run(s, 'verify').step, 'repaired');
  s = run(s, 'record');
  assert.equal(run(s, 'verify').step, 'verified');
});
test('C forbids power cuts and requires recorded supply confirmation before shielding', () => {
  let s = at(start('experience', 2), 'switch');
  assert.equal(run(s, 'disconnect').step, 'violated');
  assert.equal(run(s, 'isolate').step, 'powered');
  s = run(s, 'measure');
  assert.equal(run(s, 'isolate').step, 'powered');
  s = run(s, 'record');
  s = run(s, 'isolate');
  assert.equal(s.protected, true);
  assert.equal(s.step, 'isolated');
});
test('wrong suspects provide feedback without advancing; normal readings cannot be forged', () => {
  const s = at(isolate(start()), 'joint');
  assert.equal(run(s, 'inspect').step, 'isolated');
  assert.equal(run(s, 'measure').reading, null);
  assert.equal(run(s, 'record').evidence.length, 0);
});
test('weighted score, time penalty, caps, and stable final elapsed time', () => {
  const s = {
    ...createMission({ track: 'validation' }),
    correctness: 50,
    safety: 50,
    evidence: [{ key: 'pre' }],
    startedAt: 0,
  };
  assert.equal(scoreMission(s, 0).score, 60);
  assert.equal(scoreMission(s, 900000).components.time, 0);
  assert.equal(scoreMission({ ...s, correctness: -10, safety: 500 }, 0).components.safety, 100);
  assert.equal(scoreMission({ ...s, correctness: -10 }, 0).components.correctness, 0);
  const scored = finish(repair(isolate(start())));
  assert.deepEqual(scoreMission(scored, 99999999), scored.result);
  assert.equal(scoreMission({ ...scored, track: 'experience' }, 99999999).score, 70);
});
test('next order preserves history, resets local evidence and cannot skip or overflow', () => {
  let s = start();
  assert.equal(run(s, 'next'), s);
  for (let i = 0; i < 3; i++) {
    s = finish(repair(isolate(s)));
    if (i < 2) {
      s = run(s, 'next');
      assert.equal(s.orderIndex, i + 1);
      assert.equal(s.history.length, i + 1);
      assert.equal(s.step, 'idle');
      assert.equal(s.evidence.length, 0);
      s = run(run(s, 'accept'), 'begin');
    }
  }
  assert.equal(run(s, 'next'), s);
});

test('三单进度持久化：记录完成、拒绝非法 id、读取容错', async () => {
  const { readMissionProgress, markMissionCompleted, nextOrderIndex, MISSION_PROGRESS_KEY } =
    await import('../src/features/mission/missionProgress.mjs');
  const memory = new Map();
  const storage = {
    getItem: (k) => (memory.has(k) ? memory.get(k) : null),
    setItem: (k, v) => memory.set(k, String(v)),
  };

  assert.deepEqual(readMissionProgress(storage).completed, []);
  assert.equal(nextOrderIndex(readMissionProgress(storage)), 0);

  markMissionCompleted('A', storage);
  assert.deepEqual(readMissionProgress(storage).completed, ['A']);
  assert.equal(nextOrderIndex(readMissionProgress(storage)), 1);

  markMissionCompleted('A', storage);
  assert.deepEqual(readMissionProgress(storage).completed, ['A'], '重复完成不重复记录');

  markMissionCompleted('Z', storage);
  assert.deepEqual(readMissionProgress(storage).completed, ['A'], '非法 id 不写入');

  markMissionCompleted('B', storage);
  markMissionCompleted('C', storage);
  assert.equal(nextOrderIndex(readMissionProgress(storage)), 0, '三单完成后回到 A 供重玩');

  storage.setItem(MISSION_PROGRESS_KEY, '{bad json');
  assert.deepEqual(readMissionProgress(storage).completed, [], '坏档回退为空进度');
});
