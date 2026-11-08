import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  ENV_KEY,
  ENV_CLUES,
  EVIDENCE,
  CASE_SEVEN_LAMPS,
  freshEnv,
  runtime,
  actEnv,
  advanceCase,
  restoreEnv,
  measureEnvClue,
  lampBrightness,
  rememberLine,
  npcReaction,
  MEMORY_LIMIT,
} from '../src/features/env/env.mjs';
import { pinClue, addHypothesis, validateCase } from '../src/features/env/caseBoard.mjs';
const act = (s, e) => actEnv(s, e, 1000 + s.save.history.length);
const measure = (s, id, mode, probe) => act(s, { type: 'measure', id, mode, probe });
function evidence() {
  let s = runtime();
  s = measure(s, 'L8', 'voltage', 'socket');
  s = act(s, { type: 'isolate' });
  for (const l of CASE_SEVEN_LAMPS.lamps) s = measure(s, l.id, 'continuity', 'ground');
  s = measure(s, 'L2', 'resistance', 'chain');
  s = measure(s, 'L8', 'inspect', 'terminal');
  return s;
}
function repaired() {
  let s = act(evidence(), { type: 'wire' });
  s = measure(s, 'L8', 'continuity', 'ground');
  s = act(s, { type: 'power' });
  for (const l of CASE_SEVEN_LAMPS.lamps) s = measure(s, l.id, 'voltage', 'socket');
  return s;
}
test('schema固定与单一新键', () => {
  assert.equal(ENV_KEY, 'sparkmate.seventh-checksum.envstory.v1');
  assert.deepEqual(Object.keys(freshEnv()), [
    'version',
    'updatedAt',
    'clues',
    'case',
    'board',
    'npcReactions',
    'eagleEye',
    'rewards',
    'history',
  ]);
});
test('五条现象有工程解释和学习行为', () => {
  assert.equal(ENV_CLUES.length, 5);
  for (const c of ENV_CLUES)
    for (const key of ['id', 'probe', 'explanation', 'hint', 'learning']) assert.ok(c[key]);
});
test('五条真实测量可记录，错误测点不给证据', () => {
  for (const c of ENV_CLUES) {
    let s = measure(runtime(), c.id, c.mode, c.probe);
    assert.equal(s.save.clues[c.id].value, c.value);
    assert.equal(s.save.history.length, 1);
    assert.equal(measureEnvClue(c.id, 'wrong', c.mode, s).ok, false);
  }
});
test('周期与漂移教学采样可核', () => {
  assert.deepEqual(measureEnvClue('clue_clock_drift', '钟楼控制柜', 'voltage', runtime()).samples, [
    { t: 0, value: 0 },
    { t: 86400, value: -0.7 },
  ]);
});
test('带电通断电阻拆检均联锁', () => {
  for (const [mode, probe] of [
    ['continuity', 'ground'],
    ['resistance', 'chain'],
    ['inspect', 'terminal'],
  ])
    assert.equal(measure(runtime(), 'L8', mode, probe).save.case.evidence.length, 0);
});
test('带电接线被拦截', () => {
  const s = act(runtime(), { type: 'wire' });
  assert.equal(s.save.case.fixApplied, false);
  assert.match(s.message, /联锁/);
});
test('未逐盏测量不发通断证据', () => {
  let s = act(runtime(), { type: 'isolate' });
  s = measure(s, 'L8', 'continuity', 'ground');
  assert.ok(!s.save.case.evidence.includes('ground_break'));
});
test('四类证据只由测量产生', () => {
  assert.deepEqual(new Set(evidence().save.case.evidence), new Set(EVIDENCE));
});
test('证据不全不能修复或结案', () => {
  let s = act(runtime(), { type: 'isolate' });
  s = act(s, { type: 'wire' });
  s = act(s, { type: 'close' });
  assert.equal(s.save.rewards.granted, false);
  assert.equal(s.save.case.fixApplied, false);
});
test('送电要求离线复核', () => {
  let s = act(evidence(), { type: 'wire' });
  s = act(s, { type: 'power' });
  assert.equal(s.powered, false);
  assert.equal(s.verifying, false);
});
test('修复后七灯压差≤0.3V与10秒验收', () => {
  let s = repaired();
  s = advanceCase(s, 9.9);
  assert.equal(act(s, { type: 'close' }).save.rewards.granted, false);
  s = advanceCase(s, 0.1);
  assert.equal(act(s, { type: 'close' }).save.rewards.xp, 100);
});
test('缺少负载测量不能计时', () => {
  let s = act(evidence(), { type: 'wire' });
  s = measure(s, 'L8', 'continuity', 'ground');
  s = act(s, { type: 'power' });
  assert.equal(advanceCase(s, 20).save.case.verifiedSeconds, 0);
});
test('断电重置连续观察', () => {
  const s = act(advanceCase(repaired(), 5), { type: 'isolate' });
  assert.equal(s.save.case.verifiedSeconds, 0);
  assert.equal(advanceCase(s, 10).save.case.verifiedSeconds, 0);
});
test('确定性时间轴东至西', () => {
  assert.ok(lampBrightness('L8', 1) < lampBrightness('L2', 1));
  assert.equal(lampBrightness('L8', 1), lampBrightness('L8', 15));
  assert.equal(lampBrightness('L8', 3, true), 1);
});
test('粗细时间步等价与非法dt', () => {
  let s = repaired(),
    fine = s;
  for (let i = 0; i < 100; i++) fine = advanceCase(fine, 0.1);
  assert.ok(
    Math.abs(advanceCase(s, 10).save.case.verifiedSeconds - fine.save.case.verifiedSeconds) < 1e-8,
  );
  assert.equal(advanceCase(s, NaN), s);
});
test('pin只允许已测现象、坐标限幅、幂等', () => {
  let s = freshEnv();
  assert.equal(pinClue(s.board, s.clues, ENV_CLUES[0].id, 0, 0), s.board);
  s.clues[ENV_CLUES[0].id] = { found: true };
  let b = pinClue(s.board, s.clues, ENV_CLUES[0].id, 2, -1);
  b = pinClue(b, s.clues, ENV_CLUES[0].id, 2, -1);
  assert.equal(b.pins.length, 1);
  assert.equal(b.pins[0].x, 1);
});
test('假设只接受预设且去重', () => {
  let b = freshEnv().board;
  for (const id of ['h1', 'h1', 'h2', 'h3', 'evil']) b = addHypothesis(b, id);
  assert.equal(b.hypotheses.length, 3);
});
test('验证仅给缺失类别，不给答案', () => {
  assert.deepEqual(validateCase({}, ['ground_break']).missing, [
    'shared_ground',
    'drop_abnormal',
    'terminal_rust',
  ]);
});
test('奖励幂等与刷新恢复', () => {
  let s = act(advanceCase(repaired(), 10), { type: 'close' });
  const saved = s.save;
  s = act(s, { type: 'close' });
  assert.deepEqual(s.save.rewards, saved.rewards);
  assert.deepEqual(restoreEnv(JSON.stringify(saved)), saved);
});
test('坏档与未来schema保守回退', () => {
  for (const raw of [
    '{',
    '{}',
    JSON.stringify({ ...freshEnv(), version: 2 }),
    JSON.stringify({ ...freshEnv(), rewards: { xp: 100, prisms: 1, granted: true } }),
  ])
    assert.equal(restoreEnv(raw).rewards.granted, false);
});
test('鹰眼记忆有上限且去重', () => {
  let lines = [];
  for (let i = 0; i < 100; i++) lines = rememberLine(lines, 'line' + i);
  assert.equal(lines.length, MEMORY_LIMIT);
  assert.equal(rememberLine(lines, 'line99').length, MEMORY_LIMIT);
});
test('NPC同一触发24小时去重，不同触发独立', () => {
  const m = { ok: true, category: 'voltage', target: 'L2' },
    p = npcReaction(null, m, 0);
  assert.equal(npcReaction(p, m, 86399999), null);
  assert.ok(npcReaction(p, m, 86400000));
  const q = npcReaction(p, { ...m, target: 'L3' }, 1);
  assert.equal(npcReaction(q, m, 2), null);
});
test('存档写入仅env键、bridge使用只读事件', () => {
  const code = readFileSync('src/features/env/envStore.js', 'utf8');
  assert.equal((code.match(/localStorage.setItem/g) || []).length, 1);
  assert.match(code, /setItem\(ENV_KEY/);
  assert.match(code, /readOnly:\s*true/);
});
test('新模块文案禁词与编码扫描', () => {
  for (const f of readdirSync('src/features/env')) {
    const text = readFileSync('src/features/env/' + f, 'utf8');
    for (const term of ['第七校验', '熵', '第一编译者', '残响', '\ufffd'])
      assert.ok(!text.includes(term), f + ':' + term);
  }
});
test('错误档位与溢出不给证据', () => {
  const s = act(runtime(), {
    type: 'measure',
    id: 'L8',
    mode: 'voltage',
    probe: 'socket',
    max: 0.2,
  });
  assert.equal(s.save.case.evidence.length, 0);
  assert.equal(measureEnvClue('L2', 'ground', 'ac', runtime()).ok, false);
});

test('长会话历史压缩保留四类测量凭据', () => {
  let s = evidence();
  for (let i = 0; i < 600; i++) s = measure(s, 'L2', 'continuity', 'ground');
  assert.ok(s.save.history.length <= 512);
  assert.deepEqual(restoreEnv(JSON.stringify(s.save)).case.evidence, s.save.case.evidence);
});

async function loadStore(suffix) {
  const source = readFileSync('src/features/env/envStore.js', 'utf8')
    .replace("'zustand'", JSON.stringify(import.meta.resolve('zustand')))
    .replace(
      "'./env.mjs'",
      JSON.stringify(new URL('../src/features/env/env.mjs', import.meta.url).href),
    )
    .replace(
      "'./caseBoard.mjs'",
      JSON.stringify(new URL('../src/features/env/caseBoard.mjs', import.meta.url).href),
    )
    .replace(
      "'../resonance/resonanceBridge.mjs'",
      JSON.stringify('data:text/javascript,export function emitSyncEvent(){}'),
    );
  return (
    await import(
      'data:text/javascript;base64,' + Buffer.from(source + '\n//' + suffix).toString('base64')
    )
  ).useEnv;
}
test('实际Store防抖隔离、初始化不写旧键', async () => {
  const oldKeys = [
    'sparkmate.routes.v2',
    ...['street', 'kickback', 'resonance', 'assembly', 'trust'].map(
      (k) => 'sparkmate.seventh-checksum.' + k + '.v1',
    ),
  ];
  const values = new Map(oldKeys.map((k) => [k, 'old-bytes:' + k])),
    writes = [];
  globalThis.localStorage = {
    getItem: (k) => values.get(k) || null,
    setItem: (k, v) => {
      writes.push(k);
      values.set(k, v);
    },
  };
  try {
    const store = await loadStore('isolation');
    assert.equal(writes.length, 0);
    for (const c of ENV_CLUES)
      store.getState().dispatch({ type: 'measure', id: c.id, probe: c.probe, mode: c.mode });
    assert.equal(writes.length, 0);
    store.getState().flush();
    assert.deepEqual(writes, [ENV_KEY]);
    assert.deepEqual(
      oldKeys.map((k) => values.get(k)),
      oldKeys.map((k) => 'old-bytes:' + k),
    );
    assert.equal(Object.keys(JSON.parse(values.get(ENV_KEY)).clues).length, 5);
  } finally {
    delete globalThis.localStorage;
  }
});
test('实际Store存储不可写仅会话降级', async () => {
  globalThis.localStorage = {
    getItem() {
      throw Error('denied');
    },
    setItem() {
      throw Error('denied');
    },
  };
  try {
    const store = await loadStore('unavailable'),
      c = ENV_CLUES[0];
    store.getState().dispatch({ type: 'measure', id: c.id, probe: c.probe, mode: c.mode });
    store.getState().flush();
    assert.equal(store.getState().storageError, true);
    assert.equal(store.getState().save.clues[c.id].found, true);
  } finally {
    delete globalThis.localStorage;
  }
});
