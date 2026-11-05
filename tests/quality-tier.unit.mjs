import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readQualityOverride,
  deviceQualityTier,
  detectedQualityTier,
  QUALITY_BUDGETS,
} from '../src/lib/visualCapabilities.js';
test('quality URL accepts only dom or integer tiers 0–3', () => {
  for (const [input, expected] of [
    ['dom', 0],
    ['0', 0],
    ['1', 1],
    ['2', 2],
    ['3', 3],
    ['4', null],
    ['-1', null],
    ['2.0', null],
    ['', null],
    ['DOM', null],
  ])
    assert.equal(readQualityOverride('?quality=' + input), expected);
  assert.equal(readQualityOverride(''), null);
});
test('device constraints choose DOM; desktop defaults to 2', () => {
  assert.equal(deviceQualityTier({}), 2);
  for (const key of ['lowPower', 'coarse', 'narrow', 'noHover'])
    assert.equal(deviceQualityTier({ [key]: true }), 0);
});
test('GPU detection can lower but cannot promote constrained devices or auto-enable Tier 3', () => {
  assert.equal(detectedQualityTier(0, { tier: 3, type: 'BENCHMARK' }), 0);
  assert.equal(detectedQualityTier(2, { tier: 3, type: 'BENCHMARK' }), 2);
  assert.equal(detectedQualityTier(2, { tier: 1, type: 'BENCHMARK' }), 1);
  assert.equal(detectedQualityTier(2, { tier: 0, type: 'BLOCKLISTED' }), 0);
  assert.equal(detectedQualityTier(2, { tier: 1, type: 'FALLBACK' }), 2);
  assert.deepEqual(
    Object.values(QUALITY_BUDGETS).map((b) => b.maxDpr),
    [1, 1, 1.25, 1.5],
  );
});
