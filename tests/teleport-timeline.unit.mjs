import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleTeleport, TELEPORT_SECONDS } from '../src/features/world/teleportTimeline.js';
test('three-stage teleport preserves continuity at both joins and arrives intact', () => {
  assert.equal(sampleTeleport(0).phase, 'charge');
  assert.equal(sampleTeleport(0.5).phase, 'dash');
  assert.equal(sampleTeleport(1).phase, 'settle');
  for (const time of [0.28, 0.83])
    for (const key of ['distance', 'fov', 'dissolve'])
      assert.ok(
        Math.abs(sampleTeleport(time - 1e-7)[key] - sampleTeleport(time + 1e-7)[key]) < 1e-4,
      );
  const end = sampleTeleport(TELEPORT_SECONDS + 1);
  assert.equal(end.distance, 1);
  assert.equal(end.dissolve, 0);
  assert.equal(end.fov, 0);
  for (let t = 0; t < TELEPORT_SECONDS; t += 0.005) {
    const s = sampleTeleport(t);
    assert.ok(s.distance >= 0 && s.distance <= 1);
    assert.ok(s.dissolve >= 0 && s.dissolve <= 1);
  }
});
