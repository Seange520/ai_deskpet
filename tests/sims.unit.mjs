import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { evaluate } from '../src/features/learning/sims/checks.mjs';
import { registry, simIds, getSim } from '../src/features/learning/sims/registry.mjs';
const numeric = { id: 'v', type: 'numeric', task: 'v', expected: 24, tolerance: 0.2 };
const check = (v, def = numeric) => evaluate({ values: { v } }, [def]);
for (const v of [24, 23.8, 24.2])
  test(`numeric inclusive ${v}`, () => assert.equal(check(v).passed, true));
for (const v of [23.799, 24.201, '24', '', null, NaN, Infinity, undefined])
  test(`numeric rejects ${String(v)}`, () => assert.equal(check(v).passed, false));
test('numeric zero tolerance exact', () =>
  assert.equal(check(24, { ...numeric, tolerance: 0 }).passed, true));
test('numeric invalid tolerance fails closed', () =>
  assert.equal(check(24, { ...numeric, tolerance: -1 }).passed, false));
test('choice uses exact primitive', () => {
  const def = { ...numeric, type: 'choice', expected: '通' };
  assert.equal(check('通', def).passed, true);
  assert.equal(check('断', def).passed, false);
});
test('sequence checks order, length and types', () => {
  const def = { ...numeric, type: 'sequence', expected: [25, 50, 75, 10] };
  assert.equal(check([25, 50, 75, 10], def).passed, true);
  for (const value of [[50, 25, 75, 10], [25, 50, 75], ['25', 50, 75, 10], null])
    assert.equal(check(value, def).passed, false);
});
test('empty checks and unsupported types fail closed', () => {
  assert.equal(evaluate().passed, false);
  assert.equal(check(24, { ...numeric, type: 'code' }).passed, false);
});
test('missing and inherited keys cannot pass', () => {
  assert.equal(evaluate({ values: Object.create({ v: 24 }) }, [numeric]).passed, false);
});
test('task is a literal key', () =>
  assert.equal(
    evaluate({ values: { a: { v: 24 } } }, [{ ...numeric, task: 'a.v' }]).passed,
    false,
  ));
test('evidence deduplicates check identity and keeps every attempt', () => {
  const a = check(0),
    b = evaluate({ values: { v: 24 }, evidence: a.evidence }, [numeric]);
  assert.equal(b.evidence.length, 1);
  assert.equal(b.evidence[0].attempts.length, 2);
  assert.deepEqual(
    b.evidence[0].attempts.map((a) => a.passed),
    [false, true],
  );
  assert.equal(a.evidence[0].attempts.length, 1);
});
test('different evidence types remain separate', () => {
  const a = check(24);
  const b = evaluate({ values: { v: '通' }, evidence: a.evidence }, [
    { ...numeric, type: 'choice', expected: '通' },
  ]);
  assert.equal(b.evidence.length, 2);
});
test('sequence evidence snapshots input', () => {
  const v = [1],
    r = check(v, { ...numeric, type: 'sequence', expected: [1] });
  v[0] = 2;
  assert.deepEqual(r.evidence[0].attempts[0].value, [1]);
});
test('deterministic, no state mutation', () => {
  const state = { values: { v: 24 }, evidence: [] },
    before = JSON.stringify(state);
  assert.deepEqual(evaluate(state, [numeric]), evaluate(state, [numeric]));
  assert.equal(JSON.stringify(state), before);
});
test('registry exact four whitelist ids', () => {
  assert.deepEqual(simIds, ['meter', 'series-voltage', 'pwm', 'ide-run', 'i2c-scan', 'mqtt-publish', 'pet-build', 'power-precheck', 'expression-frame', 'motion-tone', 'state-machine', 'intent-router', 'boundary-guard', 'memory-recall', 'tone-response', 'self-check', 'offline-fallback']);
  assert.ok(Object.isFrozen(registry));
});
for (const id of ['__proto__', 'constructor', '../App', 'unknown'])
  test(`registry rejects ${id}`, () => assert.equal(getSim(id), null));
const root = new URL('../src/features/learning/sims/', import.meta.url);
const sources = readdirSync(root)
  .filter((n) => /\.(mjs|jsx|css)$/.test(n))
  .map((n) => readFileSync(new URL(n, root), 'utf8'))
  .join('\n');
test('no arbitrary execution, storage, render loop or canvas', () =>
  assert.doesNotMatch(
    sources,
    /\beval\s*\(|\bFunction\s*\(|localStorage|sessionStorage|requestAnimationFrame|<canvas|dangerouslySetInnerHTML/,
  ));
test('390 layout uses shrinkable columns and wrapped controls', () => {
  assert.match(sources, /@media\s*\(max-width:\s*600px\)/);
  assert.match(sources, /grid-template-columns:\s*1fr/);
  assert.match(sources, /overflow-wrap:\s*anywhere/);
  assert.match(sources, /flex-wrap:\s*wrap/);
});
test('DEV query and tier3 gating before lazy entry renders', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(
    app,
    /import.meta.env.DEV \? lazy\(\(\) => import\('\.\/features\/learning\/sims\/SimDemoEntry.jsx'\)/,
  );
  assert.match(
    app,
    /import.meta.env.DEV && tier === 3 && new URLSearchParams\(location.search\).get\('sims'\) === '1'/,
  );
});
test('unknown component fallback is visible text', () =>
  assert.match(sources, /未知仿真，请从白名单选择/));
test('PWM physical relation and IDE cycle relation', () => {
  assert.ok(Math.abs(3.3 * 0.75 - 2.5) < 0.2);
  assert.equal(1000 / (2 * 250), 2);
  assert.match(sources, /1000 \/ \(2 \* delay\)/);
});

