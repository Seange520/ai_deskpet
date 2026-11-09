import test from 'node:test';
import assert from 'node:assert/strict';
import { daylightAt, readRenderSettings } from '../src/features/render/renderSettings.mjs';

test('R1 links restore time, outline and optional DOF without accepting nonfinite times', () => {
  assert.deepEqual(readRenderSettings(''), { hour: 10, outline: true, dof: false });
  assert.deepEqual(readRenderSettings('?time=18.25&outline=0&dof=1'), {
    hour: 18.25,
    outline: false,
    dof: true,
  });
  for (const value of ['NaN', 'Infinity', '-Infinity', 'invalid']) {
    assert.equal(readRenderSettings(`?time=${value}`).hour, 10);
  }
  assert.equal(readRenderSettings('?time=-10').hour, 0);
  assert.equal(readRenderSettings('?time=40').hour, 24);
});

test('daylight stays continuous at sunrise and sunset with matching midnight endpoints', () => {
  assert.equal(daylightAt(0), daylightAt(24));
  assert.equal(daylightAt(12), 1);
  assert.equal(daylightAt(6), 0);
  assert.ok(daylightAt(18) < 1e-12);
  for (const hour of [0, 3, 21, 24]) assert.equal(daylightAt(hour), 0);
  for (let hour = 0; hour <= 24; hour += 0.25) {
    assert.ok(daylightAt(hour) >= 0 && daylightAt(hour) <= 1);
    if (hour > 0) assert.ok(Math.abs(daylightAt(hour) - daylightAt(hour - 0.25)) < 0.066);
  }
});
