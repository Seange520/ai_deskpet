import test from 'node:test';
import assert from 'node:assert/strict';
import { challengePassed, restoreLevels } from '../src/data/learningLevels.js';
import { parseProgram } from '../src/lib/codeRunner.js';
test('挑战不跨次继承状态且必须达到最终状态', () => {
  assert.equal(challengePassed('L1', parseProgram('move("forward"); light("on")')), true);
  assert.equal(challengePassed('L1', parseProgram('light("on")')), false);
  assert.equal(
    challengePassed('L1', parseProgram('move("forward"); light("on"); light("off")')),
    false,
  );
  assert.equal(challengePassed('L2', parseProgram('move("backward"); light("on")')), false);
  assert.equal(
    challengePassed('L3', parseProgram('move("stop"); move("forward"); light("off")')),
    false,
  );
  assert.equal(
    challengePassed('L3', parseProgram('move("forward"); move("stop"); light("off")')),
    true,
  );
});
test('新记录默认 L1、旧记录访问权迁移、损坏数据前缀清洗', () => {
  const routes = Object.fromEntries(
    ['classic', 'quadruped', 'tracked', 'spherical'].map((id) => [
      id,
      { materials: false, wiring: false, code: false },
    ]),
  );
  assert.deepEqual(restoreLevels(null, routes, 'classic').unlockedLevels, ['L1']);
  assert.deepEqual(restoreLevels({}, routes, 'spherical').unlockedLevels, ['L1', 'L2', 'L3', 'L4']);
  for (const value of [null, {}, 'L1L4', ['L1', 'L4']]) {
    assert.deepEqual(
      restoreLevels({ levelVersion: 1, unlockedLevels: value }, routes, 'classic').unlockedLevels,
      ['L1'],
    );
  }
});
