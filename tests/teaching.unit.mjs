import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as L from '../src/features/learning/learning.mjs';
import { codecheck, codeSpec } from '../src/features/learning/codecheck.mjs';
const g = JSON.parse(
  readFileSync(
    new URL(
      '../src/features/learning/data/knowledge-graph.v1.json',
      import.meta.url,
    ),
  ),
);
const now = '2026-11-09T00:00:00.000Z',
  fresh = () => L.freshProfile(g, now);
const evidence = ['quiz', 'sim-task', 'measurement'].map((type) => ({
  type,
  score: 1,
  at: now,
}));
function mastered(p, id) {
  p.kps[id] = { ...p.kps[id], mastery: 1, evidence };
  return L.reconcile(g, p);
}
const result = { runId: 'run', checkScore: 1, transferScore: 1, evidence };
test('fresh independent profile schema', () => {
  const p = fresh();
  assert.equal(p.version, 1);
  assert.equal(Object.keys(p.kps).length, g.kps.length);
  assert.deepEqual(p.schedule, { due: [], streakDays: 0, lastDay: null });
});
test('only new key named', () =>
  assert.equal(L.PROFILE_KEY, 'sparkmate.checksum.profile.v1'));
test('corrupt JSON recovers', () =>
  assert.equal(L.restoreProfile(g, 'bad').version, 1));
test('unknown version resets', () =>
  assert.equal(L.restoreProfile(g, { version: 99 }).history.length, 0));
test('serialized roundtrip retains mastery and evidence', () => {
  const p = mastered(fresh(), 'K0-01');
  assert.deepEqual(L.restoreProfile(g, JSON.stringify(p)), p);
});
test('all graph prereqs required', () => {
  const p = fresh();
  assert.equal(
    L.available(
      g,
      p,
      g.kps.find((k) => k.id === 'K1-01'),
    ),
    false,
  );
  assert.equal(mastered(p, 'K0-02').kps['K1-01'].status, 'open');
});
test('gate requires three distinct pillars', () => {
  let p = fresh();
  for (const id of ['K0-01', 'K0-04', 'K0-06']) p = mastered(p, id);
  assert.equal(L.gatePassed(g, p, g.gates[0].id), false);
  for (const id of ['K1-01', 'K3-01']) p = mastered(p, id);
  assert.equal(L.gatePassed(g, p, g.gates[0].id), true);
});
test('gate threshold driven by data', () => {
  const graph = { ...g, gates: [{ ...g.gates[0], requiresMinPillars: 1 }] };
  const p = mastered(fresh(), 'K0-01');
  assert.equal(L.gatePassed(graph, p, g.gates[0].id), true);
});
test('mastery weighted formula', () =>
  assert.ok(Math.abs(L.mastery(0.8, 0.5) - 0.68) < 1e-9));
test('mastery clamp and bonus limit', () => {
  assert.equal(L.mastery(1, 1, 0.5), 1);
  assert.equal(L.mastery(0, 0, 0.5), 0.08);
  assert.equal(L.mastery(-1, -1), 0);
});
test('three passing evidence types required', () => {
  assert.equal(
    L.isMastered({ mastery: 1, evidence: evidence.slice(0, 2) }),
    false,
  );
  assert.equal(L.isMastered({ mastery: 0.7, evidence }), true);
});
test('self explanation does not grant scored evidence', () =>
  assert.equal(
    L.isMastered({
      mastery: 1,
      evidence: [...evidence.slice(0, 2), { type: 'explain', score: 1 }],
    }),
    false,
  ));
test('locked begin rejected', () => {
  const p = fresh();
  assert.equal(L.beginLesson(g, p, 'K1-04', now), p);
});
test('attempts increment on real starts', () =>
  assert.equal(
    L.beginLesson(g, fresh(), 'K0-01', now).kps['K0-01'].attempts,
    1,
  ));
test('completed run is idempotent', () => {
  const p = L.completeLesson(
    g,
    L.beginLesson(g, fresh(), 'K0-01', now),
    'K0-01',
    result,
    now,
  );
  assert.equal(L.completeLesson(g, p, 'K0-01', result, now), p);
});
test('first completion schedules one day', () => {
  const p = L.completeLesson(g, fresh(), 'K0-01', result, now);
  assert.equal(p.schedule.due[0].dueAt, '2026-11-10T00:00:00.000Z');
});
test('retention 1 3 7 21 days bounded', () => {
  let p = L.completeLesson(g, fresh(), 'K0-01', result, now);
  for (const d of [1, 3, 7, 21])
    p = L.completeLesson(
      g,
      p,
      'K0-01',
      { ...result, runId: 'r' + d },
      new Date(Date.parse(now) + d * L.DAY).toISOString(),
    );
  assert.deepEqual(p.kps['K0-01'].reviews, [1, 3, 7, 21]);
  assert.equal(p.schedule.due.length, 0);
});
test('same day retry grants no retention', () => {
  let p = L.completeLesson(g, fresh(), 'K0-01', result, now);
  p = L.completeLesson(g, p, 'K0-01', { ...result, runId: 'retry' }, now);
  assert.deepEqual(p.kps['K0-01'].reviews, []);
});
test('due recommendation first and time controls count', () => {
  const p = fresh();
  p.schedule.due = [{ kpId: 'K0-04', dueAt: now }];
  assert.equal(L.recommendations(g, p, 15, Date.parse(now))[0], 'K0-04');
  assert.equal(L.recommendations(g, p, 30).length, 2);
});
test('star four states', () =>
  assert.deepEqual(Object.values(L.STATES), ['迷雾', '微光', '点亮', '常亮']));
test('spoiler gate excludes future scenes', () => {
  assert.equal(L.visibleStory({ spoilerLevel: 2, storyScene: 'secret' }), null);
  assert.equal(
    L.visibleStory({ spoilerLevel: 1, storyScene: 'public' }),
    'public',
  );
});
test('measurement tolerance boundary and invalid strings', () => {
  const c = { expected: 5, tolerance: 0.1 };
  assert.equal(L.measurementPass(c, '5.1'), true);
  assert.equal(L.measurementPass(c, '5.2'), false);
  assert.equal(L.measurementPass({ expected: 0, tolerance: 0 }, ''), false);
});
test('code whitelist accepts only frozen correct id', () => {
  const spec = {
    options: [
      { id: 'good', correct: true },
      { id: 'bad', correct: false },
    ],
  };
  assert.equal(codecheck(spec, 'good').passed, true);
  assert.equal(codecheck(spec, 'bad').passed, false);
  assert.equal(codecheck(spec, 'globalThis.alert(1)').passed, false);
});
test('reset creates no previous evidence', () => {
  const p = fresh();
  assert.equal(p.history.length, 0);
  assert.equal(p.kps['K0-01'].evidence.length, 0);
});
test('score uses check weights and separate transfer', () => {
  const l = {
    checks: [
      { type: 'quiz', weight: 0.2 },
      { type: 'measurement', weight: 0.8 },
    ],
  };
  assert.equal(
    L.lessonResult(l, { hook: 0, verify: 1, transfer: 0.5 }, [], 'x')
      .checkScore,
    0.8,
  );
});

test('late single review grants one interval only', () => {
  let p = L.completeLesson(g, fresh(), 'K0-01', result, now);
  p = L.completeLesson(
    g,
    p,
    'K0-01',
    { ...result, runId: 'late' },
    new Date(Date.parse(now) + 30 * L.DAY).toISOString(),
  );
  assert.deepEqual(p.kps['K0-01'].reviews, [1]);
});
test('all code checks have a structured whitelist', () => {
  for (const k of g.kps) {
    const v1Url = new URL(
      '../src/features/learning/data/lessons/' + k.id + '.lesson.json',
      import.meta.url,
    );
    if (!existsSync(v1Url)) {
      assert.ok(
        existsSync(
          new URL(
            '../src/features/learning/data/lessons-v2/' + k.id + '.v2.json',
            import.meta.url,
          ),
        ),
        k.id + ' 既无 v1 也无 v2 课节',
      );
      continue;
    }
    const l = JSON.parse(readFileSync(v1Url));
    if (l.checks.some((c) => c.type === 'code')) {
      const spec = codeSpec(l);
      assert.ok(spec.options.length >= 3, k.id);
      assert.equal(spec.options.filter((o) => o.correct).length, 1);
      assert.equal(codecheck(spec, 'untrusted').score, 0);
    }
  }
});
