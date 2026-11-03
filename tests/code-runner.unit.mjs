import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProgram, executeProgram, DEFAULT_PROGRAM } from '../src/lib/codeRunner.js';

test('示例、单/双引号、注释和分隔符按顺序解析并执行', () => {
  assert.equal(parseProgram(DEFAULT_PROGRAM).length, 3);
  const seen = [];
  executeProgram('/* start */ move(\'backward\'); light("off")\n// sound\nplay("success")', {
    move: (x) => seen.push(['move', x]),
    light: (x) => seen.push(['light', x]),
    play: (x) => seen.push(['play', x]),
  });
  assert.deepEqual(seen, [
    ['move', 'backward'],
    ['light', 'off'],
    ['play', 'success'],
  ]);
});
test('错误代码整段拒绝，不执行前面的有效指令或任意 JS', () => {
  const invalid = [
    'move("forward"); window.alert("oops")',
    'while(true) {}',
    'move("forward"); light("bad")',
    'move("forward")light("on")',
    'move("forward"); globalThis.runnerInjected = true',
    'play("success"); fetch("/")',
    'light("on") + play("success")',
    'move("for"+"ward")',
    'light("on"); /* unterminated',
    'play("success")["constructor"]("return window")()',
    'move("forward");' + String.fromCharCode(96) + 'anything' + String.fromCharCode(96),
    'light("on"); // comment\n throw new Error("x")',
  ];
  let effects = 0;
  for (const source of invalid) {
    assert.throws(() =>
      executeProgram(source, {
        move: () => effects++,
        light: () => effects++,
        play: () => effects++,
      }),
    );
  }
  assert.equal(effects, 0);
  assert.equal(globalThis.runnerInjected, undefined);
});
test('空代码、边界与错误行号', () => {
  assert.throws(() => parseProgram('// only comments'), /还没有/);
  assert.throws(() => parseProgram('x'.repeat(8193)), /8192/);
  assert.equal(parseProgram('light("on");'.repeat(32)).length, 32);
  assert.throws(() => parseProgram('light("on");'.repeat(33)), /32/);
  assert.throws(() => parseProgram('move("forward");\nlight("bad");'), /第 2 行/);
});
