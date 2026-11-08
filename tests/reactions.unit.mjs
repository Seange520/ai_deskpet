import test from 'node:test';
import assert from 'node:assert/strict';
import { REACTIONS, detectReactions } from '../src/features/street/reactions.mjs';
test('canonical table has twelve distinct reactions and exactly four active rows', () => {
  assert.equal(REACTIONS.length, 12);
  assert.equal(new Set(REACTIONS.map((r) => r.id)).size, 12);
  assert.deepEqual(
    REACTIONS.filter((r) => r.active)
      .map((r) => r.id)
      .sort(),
    ['back-emf', 'overcurrent', 'overvoltage', 'short'],
  );
});
test('catalogue exports phenomena and conditions without repair answers', () => {
  for (const r of REACTIONS) {
    assert.ok(r.condition.length > 8);
    assert.ok(r.phenomenon.length > 6);
    assert.equal(r.solution, undefined);
    assert.equal(r.answer, undefined);
    assert.equal(r.countermeasure, undefined);
  }
});
test('no reaction is available before the observation lesson', () => {
  assert.deepEqual(
    detectReactions(
      {
        inductiveOpening: true,
        clamped: false,
        peak: 264,
        breakdown: 60,
        shortCircuit: true,
        meterFuseTripped: true,
      },
      false,
    ),
    [],
  );
});
test('threshold and clamp separate inductive kick from a normal opening', () => {
  assert.deepEqual(
    detectReactions({ inductiveOpening: true, clamped: false, peak: 60, breakdown: 60 }, true),
    [],
  );
  assert.deepEqual(
    detectReactions({ inductiveOpening: true, clamped: false, peak: 264, breakdown: 60 }, true),
    ['back-emf', 'overvoltage'],
  );
  assert.deepEqual(
    detectReactions({ inductiveOpening: true, clamped: true, peak: 24.7, breakdown: 60 }, true),
    [],
  );
});
test('instrument protection activates only short and overcurrent, never inactive rows', () => {
  assert.deepEqual(
    detectReactions(
      { shortCircuit: true, meterFuseTripped: true, thermal: true, avalanche: true },
      true,
    ),
    ['short', 'overcurrent'],
  );
});
