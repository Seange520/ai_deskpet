import test from 'node:test';
import assert from 'node:assert/strict';
import {
  freshCircuit,
  actCircuit,
  advanceCircuit,
  sampleCircuit,
} from '../src/features/street/circuit.mjs';
const measure = (s, id, mode = 'voltage') =>
  actCircuit({ ...s, scanner: true, mode }, { type: 'measure', id });
function diagnosed() {
  let s = freshCircuit();
  for (const id of ['lamp', 'return', 'motor']) s = measure(s, id);
  s = actCircuit(s, { type: 'diagnose', cause: 'surge' });
  s = actCircuit(s, { type: 'isolate' });
  s = measure(s, 'return', 'continuity');
  return actCircuit(s, { type: 'diagnose', cause: 'return' });
}
test('voltage dip repeats every seven seconds and disappears after both repairs', () => {
  const s = freshCircuit();
  assert.ok(
    sampleCircuit({ ...s, clock: 0.2 }).voltage < sampleCircuit({ ...s, clock: 2 }).voltage - 5,
  );
  assert.equal(
    sampleCircuit({ ...s, clock: 0.2 }).voltage,
    sampleCircuit({ ...s, clock: 7.2 }).voltage,
  );
  assert.equal(
    sampleCircuit({ ...s, returnFixed: true, softStart: true, clock: 0.2 }).voltage,
    sampleCircuit({ ...s, returnFixed: true, softStart: true, clock: 2 }).voltage,
  );
});
test('live continuity is blocked and costs focus without granting evidence', () => {
  const s = measure(freshCircuit(), 'return', 'continuity');
  assert.equal(s.focus, 88);
  assert.equal(s.evidence['return:continuity'], undefined);
  assert.match(s.reading.value, /禁止带电/);
  assert.equal(actCircuit(s, { type: 'diagnose', cause: 'return' }).diagnoses.length, 0);
});
test('repairs require measured diagnoses and an isolated power supply', () => {
  const s = freshCircuit();
  assert.equal(actCircuit(s, { type: 'repair', part: 'return' }).returnFixed, false);
  assert.equal(
    actCircuit({ ...s, powered: false }, { type: 'repair', part: 'return' }).returnFixed,
    false,
  );
  const n = diagnosed();
  assert.deepEqual(n.diagnoses.sort(), ['return', 'surge']);
  assert.equal(actCircuit(n, { type: 'repair', part: 'return' }).returnFixed, true);
});
test('short circuit progresses red → smoke → sparks → fire → fuse, then needs replacement', () => {
  let s = actCircuit(freshCircuit(), { type: 'jumper' });
  const seen = new Set([s.stage]);
  for (let i = 0; i < 50; i++) {
    s = advanceCircuit(s, 0.1);
    seen.add(s.stage);
  }
  assert.deepEqual([...seen], ['red', 'smoke', 'sparks', 'fire', 'tripped']);
  assert.equal(s.fuse, 'blown');
  assert.equal(sampleCircuit(s).current, 0);
  assert.equal(actCircuit(s, { type: 'verify' }).verifying, false);
  assert.equal(actCircuit({ ...s, powered: true }, { type: 'replaceFuse' }).fuse, 'blown');
  const replaced = actCircuit(s, { type: 'replaceFuse' });
  assert.equal(replaced.fuse, 'intact');
  assert.equal(replaced.powered, false);
  assert.equal(replaced.stage, 'idle');
});
test('repair validation requires a complete uninterrupted seven-second cycle', () => {
  let s = diagnosed();
  s = actCircuit(s, { type: 'repair', part: 'return' });
  assert.equal(actCircuit(s, { type: 'verify' }).verifying, false);
  s = actCircuit(s, { type: 'repair', part: 'surge' });
  s = actCircuit(s, { type: 'verify' });
  s = advanceCircuit(s, 6.9);
  assert.equal(s.completed, false);
  const isolated = actCircuit(s, { type: 'isolate' });
  assert.equal(isolated.verifiedSeconds, 0);
  s = advanceCircuit(s, 0.11);
  assert.equal(s.completed, true);
  assert.equal(actCircuit(s, { type: 'verify' }).verifying, false);
});
test('focus regenerates with scanner off and cannot go below zero', () => {
  let s = freshCircuit();
  for (let i = 0; i < 12; i++) s = measure(s, 'lamp');
  assert.equal(s.focus, 4);
  assert.equal(advanceCircuit(s, 2).focus, 4);
  assert.equal(advanceCircuit({ ...s, scanner: false }, 2).focus, 16);
});
