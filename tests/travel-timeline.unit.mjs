import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleTravel, TRAVEL_SECONDS } from '../src/features/space/travelTimeline.js';

const sample = (seconds) => sampleTravel(seconds, {});

test('flight uses five continuous phases over 2.4 seconds', () => {
  assert.equal(TRAVEL_SECONDS, 2.4);
  assert.deepEqual(
    [0, 0.28, 0.83, 1.73, 2.08].map((seconds) => sample(seconds).stage),
    ['charge', 'launch', 'cruise', 'brake', 'settle'],
  );
  for (const boundary of [0.28, 0.83, 1.73, 2.08]) {
    const before = sample(boundary - 1e-6);
    const after = sample(boundary);
    assert.ok(Math.abs(before.distance - after.distance) < 1e-5);
    assert.ok(Math.abs(before.fov - after.fov) < 1e-5);
  }
});

test('launch accelerates cubically and brake overshoots by six percent before exact settle', () => {
  assert.ok(Math.abs(sample(0.555).distance - (0.035 + 0.295 / 8)) < 1e-9);
  assert.equal(sample(0.83).fov, 12);
  assert.equal(sample(2.08).distance, 1.06);
  assert.equal(sample(2.08).fov, -4);
  assert.equal(sample(TRAVEL_SECONDS).distance, 1);
  assert.equal(sample(TRAVEL_SECONDS).fov, 0);
});
