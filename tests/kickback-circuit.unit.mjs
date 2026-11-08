import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KICKBACK,
  LENSES,
  freshKickback,
  currentAt,
  dischargeCurrentAt,
  openingEvent,
  rippleRms,
  actKickback,
  advanceKickback,
  serializeKickback,
  restoreKickback,
} from '../src/features/street/kickback.mjs';
const act = (s, type, fields = {}) => actKickback(s, { type, ...fields });
function learned() {
  let s = act(freshKickback(), 'enter');
  s = advanceKickback(s, 30);
  return act(s, 'lesson', { answer: 'release' });
}
function measure(s, id, mode) {
  s = { ...s, scanner: true };
  s = act(s, 'mode', { mode });
  return act(s, 'measure', { id });
}
function diagnosed() {
  let s = act(learned(), 'hypotheses', { values: ['supply', 'transient'] });
  s = advanceKickback(act(s, 'cycle'), 1.2);
  s = measure(s, 'K1', 'voltage');
  s = measure(s, 'U1', 'ac');
  s = act(s, 'energize');
  s = measure(s, 'M2', 'current');
  s = advanceKickback(act(s, 'isolate'), 1);
  s = measure(s, 'K1', 'continuity');
  s = measure(s, 'M2', 'resistance');
  s = measure(s, 'D1', 'diode');
  return act(s, 'diagnose', { cause: 'back-emf' });
}
function repaired(part = 'diode') {
  return act(diagnosed(), 'install', { part, polarity: 'cathode-positive' });
}
function verified(part = 'diode') {
  let s = act(act(repaired(part), 'energize'), 'verify');
  for (let i = 0; i < 10; i++) s = advanceKickback(s, 1.2);
  return s;
}

test('RL current approaches V/R and diode discharge cannot reverse current', () => {
  assert.equal(currentAt(0), 0);
  assert.ok(Math.abs(currentAt(0.1) - 1) < 1e-6);
  assert.ok(Math.abs(dischargeCurrentAt(0) - 1) < 1e-12);
  assert.ok(dischargeCurrentAt(0.001) < 1);
  assert.equal(dischargeCurrentAt(1), 0);
});
test('unclamped peak and stored energy follow explicit deterministic parameters', () => {
  const e = openingEvent(freshKickback());
  assert.equal(e.peak, 264);
  assert.equal(e.energy, 0.06);
  assert.ok(Math.abs(e.coupledPeak - 6.44) < 1e-12);
  assert.equal(e.failed, true);
  assert.deepEqual(openingEvent(freshKickback()), e);
});
test('missing and failed-open diode both lack a discharge path', () => {
  assert.equal(openingEvent({ ...freshKickback(), diodeFault: 'failed-open' }).peak, 264);
});
test('diode and RC paths stay below both switch and controller limits', () => {
  for (const repair of ['diode', 'rc']) {
    const e = openingEvent({ ...freshKickback(), repair });
    assert.ok(e.peak < 60);
    assert.ok(e.coupledPeak < 5.8);
    assert.equal(e.failed, false);
  }
  assert.equal(openingEvent({ ...freshKickback(), repair: 'diode' }).peak, 24.7);
});
test('three abnormal openings accumulate protection energy and stop further cycles', () => {
  let s = learned();
  for (let i = 0; i < 3; i++) s = advanceKickback(act(s, 'cycle'), 1.2);
  assert.equal(s.resets, 3);
  assert.ok(s.stressEnergy >= KICKBACK.protectionEnergy);
  assert.equal(s.protected, true);
  assert.equal(s.powered, false);
  assert.equal(act(s, 'cycle').cycleTime, null);
});
test('lesson needs real elapsed thirty seconds and correct single-choice answer', () => {
  let s = act(freshKickback(), 'enter');
  s = advanceKickback(s, 29.9);
  assert.equal(act(s, 'lesson', { answer: 'release' }).lessonPassed, false);
  s = advanceKickback(s, 0.2);
  assert.equal(act(s, 'lesson', { answer: 'vanish' }).lessonPassed, false);
  assert.equal(act(s, 'lesson', { answer: 'release' }).lessonPassed, true);
  assert.equal(act(freshKickback(), 'cycle').cycleTime, null);
});
test('hypotheses require two or three distinct known statements and receive no grade', () => {
  let s = learned();
  assert.deepEqual(act(s, 'hypotheses', { values: ['supply', 'supply', 'bad'] }).hypotheses, []);
  s = act(s, 'hypotheses', { values: ['return', 'supply'] });
  assert.deepEqual(s.hypotheses, ['return', 'supply']);
  assert.match(s.message, /不评判/);
  assert.equal(s.diagnosed, false);
});
test('six lenses each offer multiple explicit ranges with unrecognized values rejected', () => {
  assert.equal(LENSES.length, 6);
  let s = learned();
  for (const lens of LENSES) {
    assert.ok(lens.ranges.length >= 2);
    s = act(s, 'mode', { mode: lens.id });
    const before = s.range;
    assert.equal(act(s, 'range', { range: 'invalid' }).range, before);
  }
});
test('voltage overflow supplies no evidence; the correct range captures the peak', () => {
  let s = advanceKickback(act(learned(), 'cycle'), 1.2);
  s = { ...s, scanner: true };
  s = act(s, 'range', { range: '20V' });
  s = act(s, 'measure', { id: 'K1' });
  assert.equal(s.reading.status, 'overflow');
  assert.equal(s.evidence['K1:voltage'], undefined);
  s = act(s, 'range', { range: '600V' });
  s = act(s, 'measure', { id: 'K1' });
  assert.equal(s.evidence['K1:voltage'].value, 264);
});
test('live continuity, resistance and diode tests are interlocked without evidence', () => {
  for (const mode of ['continuity', 'resistance', 'diode']) {
    const s = measure(learned(), 'D1', mode);
    assert.equal(s.reading.status, 'blocked');
    assert.deepEqual(s.evidence, {});
  }
});
test('disconnected but charged circuits remain locked until discharge', () => {
  let s = act(learned(), 'isolate');
  assert.equal(measure(s, 'M2', 'resistance').reading.status, 'blocked');
  s = advanceKickback(s, 1);
  assert.equal(measure(s, 'M2', 'resistance').reading.value, 24);
});
test('current misconnection or insufficient range opens only the instrument fuse', () => {
  let s = measure(learned(), 'K1', 'current');
  assert.equal(s.meterFuse, 'blown');
  assert.equal(s.powered, true);
  assert.ok(s.reactions.includes('short'));
  assert.ok(s.reactions.includes('overcurrent'));
  assert.equal(s.xp, 0);
  s = act(learned(), 'mode', { mode: 'current' });
  s = { ...s, scanner: true };
  s = act(s, 'range', { range: '200mA' });
  s = act(s, 'measure', { id: 'M2' });
  assert.equal(s.meterFuse, 'blown');
  assert.equal(act(s, 'replaceMeterFuse').meterFuse, 'blown');
  s = advanceKickback(act(s, 'isolate'), 1);
  assert.equal(act(s, 'replaceMeterFuse').meterFuse, 'intact');
});
test('measurement penalty is bounded and focus cannot become negative', () => {
  let s = learned();
  for (let i = 0; i < 12; i++) {
    s = { ...s, scanner: true, focus: 100, meterFuse: 'intact' };
    s = measure(s, 'K1', 'current');
  }
  assert.equal(s.penalty, 12);
  assert.equal(s.xp, 0);
  s = advanceKickback({ ...s, scanner: true, focus: 1 }, 2);
  assert.equal(s.focus, 0);
  assert.equal(s.scanner, false);
  assert.equal(s.blurSeconds, 3);
});
test('diagnosis needs hypotheses and all six measurements, not a guessed answer', () => {
  assert.equal(act(learned(), 'diagnose', { cause: 'back-emf' }).diagnosed, false);
  assert.equal(diagnosed().diagnosed, true);
  const s = diagnosed();
  const evidence = { ...s.evidence };
  delete evidence['D1:diode'];
  assert.equal(
    act({ ...s, diagnosed: false, evidence }, 'diagnose', { cause: 'back-emf' }).diagnosed,
    false,
  );
});
test('live installation and reverse diode polarity are rejected without changing repair', () => {
  const s = diagnosed();
  assert.equal(
    act({ ...s, powered: true }, 'install', { part: 'diode', polarity: 'cathode-positive' }).repair,
    'none',
  );
  assert.equal(act(s, 'install', { part: 'diode', polarity: 'cathode-return' }).repair, 'none');
  assert.equal(act(s, 'install', { part: 'diode', polarity: 'cathode-positive' }).repair, 'diode');
});
test('both repair paths require ten consecutive valid openings before any reward', () => {
  for (const part of ['diode', 'rc']) {
    let s = act(act(repaired(part), 'energize'), 'verify');
    for (let i = 0; i < 9; i++) s = advanceKickback(s, 1.2);
    assert.equal(s.completed, false);
    assert.equal(s.xp, 0);
    s = advanceKickback(s, 1.2);
    assert.equal(s.verified, 10);
    assert.equal(s.completed, true);
    assert.equal(s.xp, 100);
    assert.equal(s.prisms, 1);
    assert.ok(Math.abs(s.absorbedEnergy - 0.6) < 1e-9);
  }
});
test('interruption or a new breakdown resets consecutive verification', () => {
  let s = act(act(repaired(), 'energize'), 'verify');
  s = advanceKickback(s, 1.2);
  assert.equal(s.verified, 1);
  assert.equal(act(s, 'isolate').verified, 0);
  s = advanceKickback({ ...s, repair: 'none' }, 1.2);
  assert.equal(s.verified, 0);
  assert.equal(s.verifying, false);
  assert.equal(s.xp, 0);
});
test('versioned saves round-trip hypotheses, lesson and a fixed idempotent reward', () => {
  const s = verified();
  const raw = serializeKickback(s);
  const r = restoreKickback(raw);
  assert.equal(r.lessonPassed, true);
  assert.deepEqual(r.hypotheses, ['supply', 'transient']);
  assert.equal(r.completed, true);
  assert.equal(r.xp, 100);
  assert.equal(r.prisms, 1);
  assert.equal(advanceKickback(r, 100).xp, 100);
  assert.equal(act(r, 'verify').verifying, false);
  assert.ok(JSON.parse(raw).lessons.includes('lesson:back-emf'));
});
test('corrupt, future and forged incomplete saves do not invent progress or rewards', () => {
  for (const raw of [
    'bad',
    'null',
    '[]',
    '{"schemaVersion":2,"completed":true}',
    '{"schemaVersion":1,"completed":true,"rewardClaimed":true,"verified":10,"xp":999999}',
  ]) {
    const s = restoreKickback(raw);
    assert.equal(s.completed, false);
    assert.equal(s.xp, 0);
  }
});

test('AC lens holds the defined reset envelope RMS rather than a fabricated DC peak', () => {
  const bad = openingEvent(freshKickback());
  const duty = KICKBACK.resetSeconds / KICKBACK.cycleSeconds;
  assert.ok(Math.abs(rippleRms(bad) - 5 * Math.sqrt(duty * (1 - duty))) < 1e-12);
  assert.ok(rippleRms(bad) > 0.2);
  assert.ok(rippleRms(openingEvent({ ...freshKickback(), repair: 'diode' })) < 0.2);
});
test('capacitance and reverse diode readings cannot impersonate forward diode evidence', () => {
  let s = diagnosed();
  const evidence = { ...s.evidence };
  delete evidence['D1:diode'];
  s = { ...s, evidence, diagnosed: false };
  s = act(s, 'mode', { mode: 'diode' });
  s = act(s, 'range', { range: '2000uF' });
  s = act({ ...s, scanner: true, focus: 100 }, 'measure', { id: 'D1' });
  assert.ok(s.evidence['D1:capacitance']);
  assert.equal(act(s, 'diagnose', { cause: 'back-emf' }).diagnosed, false);
  s = act(act(s, 'range', { range: '2Vd' }), 'leads', { value: 'reverse' });
  s = act(s, 'measure', { id: 'D1' });
  assert.ok(s.evidence['D1:diode-reverse']);
  assert.equal(act(s, 'diagnose', { cause: 'back-emf' }).diagnosed, false);
});
test('RC capacitance overflows the small range and restored completed lamps stay supplied', () => {
  let s = act(repaired('rc'), 'mode', { mode: 'diode' });
  s = act(s, 'range', { range: '200uF' });
  s = act({ ...s, scanner: true, focus: 100 }, 'measure', { id: 'D1' });
  assert.equal(s.reading.status, 'overflow');
  s = act(s, 'range', { range: '2000uF' });
  s = act(s, 'measure', { id: 'D1' });
  assert.equal(s.reading.value, 470);
  const r = restoreKickback(serializeKickback(verified('rc')));
  assert.equal(r.powered, true);
  assert.equal(r.closed, true);
});
