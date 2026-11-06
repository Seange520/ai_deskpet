import test from 'node:test';
import assert from 'node:assert/strict';
import { advancedQualityEffects } from '../src/stores/useQualityStore.js';

test('M2 features stay off in Tier 0/1/2 for every adaptive step', () => {
  for (const tier of [0, 1, 2])
    for (const step of [0, 1, 2, 3, 4])
      assert.ok(Object.values(advancedQualityEffects(tier, step)).every((value) => !value));
});

test('Tier 3 retires flight effects, then SSR, then contact AO and selective bloom', () => {
  assert.deepEqual(advancedQualityEffects(3, 0), {
    ssr: true,
    gtao: true,
    selectiveBloom: true,
    motionBlur: true,
    dissolve: true,
  });
  assert.deepEqual(advancedQualityEffects(3, 1), {
    ssr: true,
    gtao: true,
    selectiveBloom: true,
    motionBlur: false,
    dissolve: false,
  });
  assert.deepEqual(advancedQualityEffects(3, 2), {
    ssr: false,
    gtao: true,
    selectiveBloom: true,
    motionBlur: false,
    dissolve: false,
  });
  assert.ok(Object.values(advancedQualityEffects(3, 3)).every((value) => !value));
});
