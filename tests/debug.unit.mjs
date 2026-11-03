import test from 'node:test';
import assert from 'node:assert/strict';
import { hardwareRoutes } from '../src/data/hardwareRoutes.js';
test('每路线两题、ID 唯一、题目仅有一根错线且保留正确配对', () => {
  for (const route of hardwareRoutes) {
    assert.equal(route.faultyCircuits.length, 2);
    assert.equal(new Set(route.faultyCircuits.map((f) => f.id)).size, 2);
    for (const fault of route.faultyCircuits) {
      assert.notEqual(fault.target, fault.wrongTarget);
      assert.equal(fault.wires.filter((w) => w.source === fault.source).length, 1);
      assert.equal(fault.wires.find((w) => w.source === fault.source).target, fault.target);
      assert.equal(new Set(fault.wires.map((w) => w.source)).size, fault.wires.length);
    }
  }
});
test('舵机电源故障修复指向独立 EXT5V；经典数据线为 I2S SD 示例', () => {
  const dog = hardwareRoutes.find((r) => r.id === 'quadruped');
  assert.equal(dog.faultyCircuits[0].target, 'EXT5V');
  const mic = hardwareRoutes.find((r) => r.id === 'classic');
  assert.equal(mic.faultyCircuits[1].source, 'SD');
  assert.match(mic.faultyCircuits[1].hint, /I2S/);
});
