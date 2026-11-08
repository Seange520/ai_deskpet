import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  DETECTION,
  distance,
  patrolAt,
  intersectsBox,
  visible,
  noiseLevel,
  heard,
} from '../src/features/raid/patrol.mjs';
import {
  RAID_KEY,
  LOOT,
  CODE_MODULE,
  ROOMS,
  hashSeed,
  seedFor,
  rng,
  createRun,
  transition,
  effects,
  alarmEvent,
  cutPower,
  kitAction,
  measure,
  solve,
  lootChoices,
  takeLoot,
  rebuild,
  answerCode,
  activateSkill,
  tick,
  freshSave,
  restoreSave,
  settle,
} from '../src/features/raid/raid.mjs';
import { createRaidStore } from '../src/features/raid/raidStore.js';
const start = (seed = 1) => transition(transition(createRun(seed), 'entering'), 'running');
const scanned = (s) => kitAction(s, { type: 'scanner' });
function clearRoom(s, id) {
  if (s.room === 2) s = cutPower(s);
  s = kitAction(s, { type: 'mode', mode: ROOMS[s.room].mode });
  if (!s.kit.scanner) s = scanned(s);
  s = measure(s, s.rooms[s.room].correct);
  s = solve(s, s.rooms[s.room].correct);
  return takeLoot(s, id || s.rooms[s.room].pool[0]);
}
function checkpoint() {
  let s = start();
  for (let i = 0; i < 3; i++) s = clearRoom(s);
  return s;
}
function extracted() {
  return transition(transition(rebuild(checkpoint()), 'extracting'), 'extracted');
}
test('seed includes date uid and run index', () => {
  assert.equal(seedFor('2026-11-09', 'a', 1), seedFor('2026-11-09', 'a', 1));
  assert.notEqual(seedFor('2026-11-09', 'a', 1), seedFor('2026-11-09', 'a', 2));
  assert.notEqual(hashSeed('a'), hashSeed('b'));
});
test('deterministic RNG and exact layout replay', () => {
  const a = rng(5),
    b = rng(5);
  for (let i = 0; i < 100; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
  assert.deepEqual(createRun(8), createRun(8));
});
test('fixed rooms and three distinct choices', () => {
  const s = createRun(9);
  assert.equal(s.rooms.length, 3);
  for (const r of s.rooms) {
    assert.equal(new Set(r.pool).size, 3);
    assert.ok(r.correct >= 0 && r.correct < 3);
  }
  assert.ok(s.rooms[0].pool.every((id) => LOOT.find((m) => m.id === id).core));
});
test('illegal transitions do nothing', () => {
  const s = createRun(1);
  assert.equal(transition(s, 'extracted'), s);
  assert.equal(transition(start(), 'checkpoint').state, 'running');
});
test('three rooms cannot be skipped', () => {
  const s = start();
  assert.equal(takeLoot(s, 'shield'), s);
  assert.equal(solve(s, s.rooms[0].correct), s);
});
test('P0 scanner and focus gate reused', () => {
  let s = start();
  assert.equal(measure(s, 0).measurements.length, 0);
  s = scanned(s);
  s = measure(s, 0);
  assert.equal(s.kit.focus, 88);
  assert.equal(s.measurements.length, 1);
  s = { ...s, kit: { ...s.kit, focus: 11 } };
  assert.equal(measure(s, 0).measurements.length, 1);
});
test('P0 focus recovery exactly 6/s with scanner off', () => {
  let s = { ...start(), kit: { ...start().kit, focus: 70 } };
  s = tick(s, 2);
  assert.equal(s.kit.focus, 82);
  s = scanned(s);
  s = tick(s, 2);
  assert.equal(s.kit.focus, 82);
});
test('continuity safety interlock and room3 offline requirement', () => {
  let s = { ...scanned(start()), room: 2 };
  s = kitAction(s, { type: 'mode', mode: 'continuity' });
  s = measure(s, s.rooms[2].correct);
  assert.equal(s.reading.blocked, true);
  assert.equal(solve(s, s.rooms[2].correct).rooms[2].solved, false);
  s = cutPower(s);
  s = measure(s, s.rooms[2].correct);
  assert.equal(s.reading.blocked, false);
  assert.equal(s.reading.value, 0.04);
  assert.equal(solve(s, s.rooms[2].correct).rooms[2].solved, true);
});
test('wrong mode is not evidence', () => {
  let s = kitAction(scanned(cutPower(start())), { type: 'mode', mode: 'continuity' });
  s = measure(s, s.rooms[0].correct);
  assert.equal(s.reading.valid, false);
  assert.equal(solve(s, s.rooms[0].correct), s);
});
test('wrong measured candidate sparks alarm +10', () => {
  let s = scanned(start());
  const bad = (s.rooms[0].correct + 1) % 3;
  s = measure(s, bad);
  s = solve(s, bad);
  assert.equal(s.alarm, 10);
});
test('real measurement produces probe mode reading evidence', () => {
  let s = scanned(start());
  s = measure(s, s.rooms[0].correct);
  assert.equal(s.reading.value, 23.6);
  assert.equal(s.reading.mode, 'voltage');
  assert.equal(s.reading.probe, s.rooms[0].correct);
  s = solve(s, s.rooms[0].correct);
  assert.equal(lootChoices(s).length, 3);
});
test('loot grants one core and advances once', () => {
  let s = clearRoom(start(), 'shield');
  assert.equal(s.cores, 1);
  assert.equal(s.room, 1);
  assert.equal(s.noiseCharges, 1);
  assert.equal(takeLoot(s, 'shield'), s);
});
test('loose contact stays measurable and increases drops', () => {
  let s = { ...scanned(start()), mods: ['loose'] };
  s.rooms[0].loose = s.rooms[0].correct;
  s = measure(s, s.rooms[0].correct);
  assert.equal(s.reading.loose, true);
  s = takeLoot(solve(s, s.rooms[0].correct), 'thick');
  assert.equal(s.materials, 11);
  assert.equal(effects(s).dropFactor, 0.5);
});
test('all six modifiers expose specified effects', () => {
  const s = { ...start(), mods: LOOT.map((m) => m.id) };
  assert.deepEqual(effects(s), {
    dropFactor: 0.5,
    speedFactor: 0.9,
    cooldownFactor: 0.8,
    shortFactor: 0.4,
    powerFrequency: 2,
    eyeText: false,
    compute: 20,
  });
});
test('patrol follows fixed loop at configured speed', () => {
  assert.deepEqual(
    patrolAt(
      [
        [0, 0],
        [10, 0],
      ],
      2,
      2,
    ).position,
    [4, 0],
  );
  assert.deepEqual(
    patrolAt(
      [
        [0, 0],
        [10, 0],
      ],
      2,
      12,
    ).position,
    [4, 0],
  );
  assert.equal(DETECTION.viewRange, 9);
  assert.equal(DETECTION.fovDeg, 70);
  assert.equal(DETECTION.hearRange, 6);
});
test('view cone rejects behind and out of range', () => {
  const d = { position: [0, 0], heading: 0 };
  assert.equal(visible(d, [8, 0]), true);
  assert.equal(visible(d, [-1, 0]), false);
  assert.equal(visible(d, [10, 0]), false);
  assert.equal(visible(d, [4, 4]), false);
});
test('analytic occlusion blocks view including parallel slabs', () => {
  const b = { min: [2, -1], max: [3, 1] },
    d = { position: [0, 0], heading: 0 };
  assert.equal(intersectsBox([0, 0], [5, 0], b), true);
  assert.equal(visible(d, [5, 0], [b]), false);
  assert.equal(intersectsBox([0, 3], [5, 3], b), false);
});
test('crouch and stationary noise multiply', () => {
  assert.equal(noiseLevel({ crouched: true }), 0.5);
  assert.equal(noiseLevel({ stationary: true }), 0.3);
  assert.equal(noiseLevel({ crouched: true, stationary: true }), 0.15);
  assert.equal(noiseLevel({ silent: true }), 0);
});
test('hearing limited to six metres', () => {
  const d = { position: [0, 0] };
  assert.equal(heard(d, [6, 0]), 1);
  assert.equal(heard(d, [6.01, 0]), 0);
});
test('distance corrected sight exposure and alarm', () => {
  const s = tick(start(), 1, { player: [4.5, 0], drone: { position: [0, 0], heading: 0 } });
  assert.equal(s.exposure, 30);
  assert.equal(s.alarm, 30);
});
test('hearing adds 8 per event and shield absorbs once', () => {
  const input = {
    player: [-1, 0],
    drone: { position: [0, 0], heading: 0 },
    footstep: true,
    stationary: false,
  };
  let s = tick(start(), 0.1, input);
  assert.equal(s.alarm, 8);
  s = tick({ ...start(), noiseCharges: 1 }, 0.1, input);
  assert.equal(s.alarm, 0);
  assert.equal(s.noiseCharges, 0);
  assert.equal(tick(s, 0.1, input).alarm, 8);
});
test('cut power freezes patrol and detection exactly eight seconds, once', () => {
  let s = cutPower(start());
  const original = s;
  assert.equal(cutPower(s), s);
  const input = { player: [1, 0], drone: { position: [0, 0], heading: 0 } };
  s = tick(s, 8, input);
  assert.equal(s.alarm, 0);
  assert.equal(s.rooms[0].patrolClock, 0);
  s = tick(s, 1, input);
  assert.ok(s.alarm > 0);
  assert.equal(s.rooms[0].patrolClock, 1);
  const split = tick(original, 9, input);
  assert.equal(split.alarm, s.alarm);
});
test('alarm cap fails run and terminal state is immutable', () => {
  let s = start();
  for (let i = 0; i < 10; i++) s = alarmEvent(s, 'spark');
  assert.equal(s.state, 'failed');
  assert.equal(s.alarm, 100);
  assert.equal(tick(s, 1), s);
  assert.equal(alarmEvent(s, 'spark'), s);
});
test('timeout 720 seconds clamps remaining time', () => {
  const s = tick(start(), 800);
  assert.equal(s.state, 'failed');
  assert.equal(s.failure, 'timeout');
  assert.equal(s.timeLeft, 0);
});
test('short protection reduces material loss but alarm remains +10', () => {
  const a = alarmEvent({ ...start(), materials: 10 }, 'short');
  const b = alarmEvent({ ...start(), materials: 10, mods: ['fuse'] }, 'short');
  assert.equal(a.materials, 5);
  assert.equal(b.materials, 8);
  assert.equal(b.alarm, 10);
});
test('checkpoint only after three measured rooms, two rebuilds', () => {
  let s = checkpoint();
  assert.equal(s.state, 'checkpoint');
  assert.equal(s.cores, 3);
  s = rebuild(rebuild(s));
  assert.equal(s.rebuilds, 0);
  assert.equal(rebuild(s), s);
  assert.equal(s.skillUnlocked, true);
});
test('code quiz answer graded once with correct passive', () => {
  const s = checkpoint(),
    id = CODE_MODULE[s.question].id;
  const correct = answerCode(s, id);
  assert.deepEqual(correct.modules, [id]);
  assert.equal(answerCode(correct, id), correct);
  const wrong = answerCode(s, CODE_MODULE[(s.question + 1) % 3].id);
  assert.deepEqual(wrong.modules, []);
  assert.equal(answerCode(wrong, id), wrong);
});
test('silent skill lasts five seconds with thirty second cooldown', () => {
  let s = activateSkill({ ...rebuild(checkpoint()), mods: [] });
  assert.equal(s.silentUntil, 5);
  assert.equal(s.readyAt, 30);
  assert.equal(activateSkill(s), s);
  s = { ...s, elapsed: 30 };
  assert.equal(activateSkill(s).readyAt, 60);
  s = { ...s, mods: ['capacitor'] };
  assert.equal(activateSkill(s).readyAt, 54);
});
test('extraction requires three cores and checkpoint unlock', () => {
  const s = checkpoint();
  assert.equal(transition(s, 'extracting'), s);
  const e = transition(rebuild(s), 'extracting');
  assert.equal(transition({ ...e, cores: 2 }, 'extracted').state, 'extracting');
  assert.equal(transition(e, 'extracted').state, 'extracted');
});
test('failure floors retained materials and keeps permanent knowledge', () => {
  const run = {
    ...checkpoint(),
    state: 'failed',
    materials: 19,
    modules: ['watchdog'],
    lore: ['measurement'],
  };
  const save = settle(freshSave(), run, 'a');
  assert.equal(save.meta.materials, 5);
  assert.ok(save.meta.unlockedMods.length > 0);
  assert.deepEqual(save.meta.lore, ['measurement']);
  assert.equal(save.meta.failed, 1);
});
test('first clear reward and repeated settlement are idempotent', () => {
  const run = extracted(),
    a = settle(freshSave(), run, 'one');
  assert.equal(settle(a, run, 'one'), a);
  const b = settle(a, run, 'two');
  assert.deepEqual(b.rewards, { xp: 100, prisms: 1 });
  assert.equal(b.meta.extracted, 2);
  assert.equal(b.meta.materials, run.materials * 2);
});
test('restore schema rejects corrupt or future saves', () => {
  assert.deepEqual(restoreSave('broken'), freshSave());
  assert.deepEqual(restoreSave('{"version":2}'), freshSave());
  const s = settle(freshSave(), extracted(), 'one');
  assert.deepEqual(restoreSave(JSON.stringify(s)), s);
  assert.deepEqual(restoreSave({ ...s, meta: { ...s.meta, materials: -1 } }), freshSave());
});
test('store persists only dedicated key, never active run', () => {
  const writes = [],
    data = new Map(),
    storage = {
      getItem: (k) => data.get(k),
      setItem: (k, v) => {
        writes.push(k);
        data.set(k, v);
      },
    };
  const store = createRaidStore(storage, () => '2026-11-09T00:00:00.000Z');
  store.getState().start();
  store.getState().dispatch({ type: 'enter' });
  store.getState().dispatch({ type: 'begin' });
  assert.equal(writes.length, 0);
  const replay = createRaidStore(storage, () => '2026-11-09T00:00:00.000Z');
  replay.getState().start();
  assert.equal(replay.getState().run.seed, store.getState().run.seed);
  store.getState().dispatch({ type: 'abandon' });
  assert.deepEqual(writes, [RAID_KEY]);
  assert.equal(JSON.parse(data.get(RAID_KEY)).run, undefined);
  assert.equal(createRaidStore(storage).getState().run, null);
});
test('storage failure keeps result in session and reports error', () => {
  const store = createRaidStore({
    getItem: () => null,
    setItem: () => {
      throw Error('quota');
    },
  });
  store.getState().start();
  store.getState().dispatch({ type: 'enter' });
  store.getState().dispatch({ type: 'abandon' });
  assert.equal(store.getState().storageError, true);
  assert.equal(store.getState().save.meta.failed, 1);
});
test('new runtime has no forbidden truth dialogue, new text is UTF8', () => {
  const files = readdirSync('src/features/raid').filter((p) => /\.(mjs|js|jsx)$/.test(p));
  for (const f of files) {
    const text = readFileSync('src/features/raid/' + f, 'utf8');
    assert.equal(/第七校验|第一编译者|未捕获之渊|熵/.test(text), false, f);
    assert.equal(text.includes('\uFFFD'), false, f);
    assert.equal(text.includes('?'.repeat(2)), false, f);
  }
});
