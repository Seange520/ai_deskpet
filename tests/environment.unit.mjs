import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isNightHour,
  useEnvironmentStore,
} from '../src/features/environment/useEnvironmentStore.js';

test('本地小时边界：19:00 起、06:00 前为夜间', () => {
  for (const hour of [0, 1, 5, 19, 23]) assert.equal(isNightHour(hour), true);
  for (const hour of [6, 12, 18]) assert.equal(isNightHour(hour), false);
});
test('手动覆盖保持独立，恢复自动使用最新本地小时', () => {
  const env = useEnvironmentStore.getState();
  env.setMode('auto');
  env.syncClock(20);
  assert.equal(useEnvironmentStore.getState().night, true);
  env.setMode('day');
  env.syncClock(22);
  assert.equal(useEnvironmentStore.getState().night, false);
  env.setMode('auto');
  assert.equal(useEnvironmentStore.getState().night, true);
  env.syncClock(6);
  assert.equal(useEnvironmentStore.getState().night, false);
  const previous = useEnvironmentStore.getState();
  env.setMode('invalid');
  assert.equal(useEnvironmentStore.getState(), previous);
});
test('闲置状态与昼夜独立、重复活动不产生状态更新、无学习字段', () => {
  const env = useEnvironmentStore.getState();
  env.setMode('night');
  env.setIdleSleeping(true);
  assert.equal(useEnvironmentStore.getState().idleSleeping, true);
  env.setIdleSleeping(false);
  assert.equal(useEnvironmentStore.getState().night, true);
  const previous = useEnvironmentStore.getState();
  env.setIdleSleeping(false);
  assert.equal(useEnvironmentStore.getState(), previous);
  for (const key of ['routes', 'xp', 'runtime', 'progress', 'persist'])
    assert.equal(key in previous, false);
});
