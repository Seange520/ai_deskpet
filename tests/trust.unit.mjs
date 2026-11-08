import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  freshTrust,
  reduceTrust,
  restoreTrust,
  validTrust,
  levelFor,
  ACTS,
  prismCount,
  weekFor,
  localDay,
  canReachSeventh,
} from '../src/features/trust/trust.mjs';
import {
  freshForge,
  actForge,
  advanceForge,
  SCRAPS,
  isTorch,
  wireLamp,
} from '../src/features/trust/forge.mjs';
import { hasChip } from '../src/features/trust/chipEffects.mjs';
import { reservedUnlocks } from '../src/features/trust/trust.mjs';

test('trust 初档ISO时间、礼物历史不一致视为坏档', () => {
  const s = points(1);
  assert.ok(Number.isFinite(Date.parse(s.updatedAt)));
  s.gifts.total = 0.5;
  assert.equal(validTrust(s), false);
  assert.equal(restoreTrust(JSON.stringify(s)).trustPoints, 0);
});
test('trust 高级预留标记与七级真结局门控', () => {
  const s = { trustPoints: 12 };
  assert.deepEqual(reservedUnlocks(s), { stealthSupport: true, hiddenOptions: true });
  assert.equal(canReachSeventh(s, false), false);
  assert.equal(canReachSeventh(s, true), true);
});

test('trust 非调试路径可逐步解锁三幕', () => {
  let s = freshTrust();
  for (const e of [
    { type: 'case', caseId: 'kickback' },
    { type: 'value', id: 'listen-first' },
    { type: 'value', id: 'respect-tools' },
  ])
    s = reduceTrust(s, e);
  for (let i = 0; i < 3; i++) {
    assert.equal(s.invites[ACTS[i]].state, 'available');
    s = reduceTrust(s, {
      type: 'value',
      id: ['furnace-terminal', 'torch-return', 'lamp-respect'][i],
    });
    s = finish(s, i);
  }
  assert.equal(s.chipUnlocked, true);
  assert.equal(s.trustPoints, 8);
});
test('trust 不点灯也完成并保留选择，无额外奖惩', () => {
  let s = points();
  s = finish(finish(s, 0), 1);
  s = apply(s, { type: 'start', id: ACTS[2] });
  s = apply(s, { type: 'choice', id: 'unlit', act: ACTS[2], optionId: '1', text: '不点亮' });
  s = apply(s, {
    type: 'complete',
    id: ACTS[2],
    result: { verified: true, voltage: 24, isolated: true, lit: false },
  });
  assert.equal(s.invites[ACTS[2]].result.lit, false);
  assert.equal(s.chipUnlocked, true);
  assert.equal(prismCount(s), 3);
});
const date = new Date(2026, 10, 9, 12),
  next = new Date(2026, 10, 16, 12);
const apply = (s, e, d = date) => reduceTrust(s, e, d);
function points(n = 4) {
  let s = freshTrust();
  for (let i = 0; i < n; i++) s = apply(s, { type: 'debug', id: 'd' + i });
  return s;
}
function finish(s, i) {
  s = apply(s, { type: 'start', id: ACTS[i] });
  s = apply(s, { type: 'choice', id: 'c' + i, act: ACTS[i], optionId: '0', text: '我来试试' });
  return apply(s, {
    type: 'complete',
    id: ACTS[i],
    result: {
      verified: true,
      ...[
        { elapsed: 7, inBand: 4, resistance: 12 },
        { item: '亡徒焊枪', length: 2, resistance: 0.2 },
        { voltage: 24, isolated: true, lit: true },
      ][i],
    },
  });
}
test('trust 等级与14点边界', () => {
  assert.deepEqual([-2, 0, 1, 2, 8, 14, 99].map(levelFor), [0, 0, 0, 1, 4, 7, 7]);
});
test('trust 本期获取封顶8点、schema固定', () => {
  const s = points(10);
  assert.equal(s.trustPoints, 8);
  assert.equal(s.levelCap, 4);
  assert.ok(validTrust(s));
  assert.equal(canReachSeventh(s), false);
});
test('trust 工程案件每案只发一次', () => {
  let s = apply(freshTrust(), { type: 'case', caseId: 'kickback' });
  s = apply(s, { type: 'case', caseId: 'kickback' });
  assert.equal(s.trustPoints, 2);
  assert.equal(apply(s, { type: 'case', caseId: 'other' }).trustPoints, 2);
});
test('trust 价值观白名单与幂等', () => {
  let s = apply(freshTrust(), { type: 'value', id: 'listen-first' });
  assert.equal(apply(s, { type: 'value', id: 'listen-first' }).trustPoints, 1);
  assert.equal(apply(s, { type: 'value', id: 'fake' }).trustPoints, 1);
});
test('trust 无工程基础不能送礼', () => {
  assert.equal(apply(freshTrust(), { type: 'gift' }).gifts.total, 0);
});
test('trust 每周半点、整数点取整与分周重置', () => {
  let s = points(1);
  s = apply(s, { type: 'gift' });
  assert.equal(s.gifts.total, 0.5);
  assert.equal(s.trustPoints, 2);
  assert.deepEqual(apply(s, { type: 'gift' }), s);
  s = apply(s, { type: 'gift' }, next);
  assert.equal(s.gifts.total, 1);
  assert.equal(s.trustPoints, 3);
  assert.ok(s.gifts.total <= 0.4 * s.history.reduce((n, h) => n + h.gain, 0));
});
test('trust 礼物40%上限阻止后续周刷取', () => {
  let s = points(1);
  for (let i = 0; i < 20; i++) s = apply(s, { type: 'gift' }, new Date(2026, 10, 9 + i * 7, 12));
  assert.equal(s.gifts.total, 1);
});
test('trust 本地日期与ISO跨年周', () => {
  assert.equal(localDay(date), '2026-11-09');
  assert.equal(weekFor(new Date(2027, 0, 1)), '2026-W53');
});
test('trust 完整存档恢复', () => {
  const s = finish(points(), 0);
  assert.deepEqual(restoreTrust(JSON.stringify(s)), s);
});
test('trust 坏档/未来版本/缺字段回退', () => {
  for (const raw of [
    '{',
    'null',
    JSON.stringify({ version: 2 }),
    JSON.stringify({ ...freshTrust(), trustPoints: 0.5 }),
    JSON.stringify({ ...freshTrust(), invites: {} }),
  ])
    assert.equal(restoreTrust(raw).trustPoints, 0);
});
test('trust 每日问候同日一次，次日可用', () => {
  let s = apply(points(1), { type: 'greet' });
  assert.deepEqual(apply(s, { type: 'greet' }), s);
  s = apply(s, { type: 'greet' }, next);
  assert.equal(s.dailyGreeting.lastSeenDay, localDay(next));
  assert.equal(s.history.filter((h) => h.kind === 'greeting').length, 2);
});
test('trust 三幕前置信任门槛', () => {
  for (let i = 0; i < 3; i++) {
    let s = freshTrust();
    s.trustPoints = (i + 2) * 2 - 1;
    s = restoreTrust(JSON.stringify(s));
    assert.equal(s.invites[ACTS[i]].state, 'locked');
    s.trustPoints++;
    s = restoreTrust(JSON.stringify(s));
    assert.equal(s.invites[ACTS[i]].state, 'available');
  }
});
test('trust 选择保留原话、同id不覆写', () => {
  let s = apply(points(), { type: 'start', id: ACTS[0] });
  s = apply(s, { type: 'choice', id: 'c', act: ACTS[0], optionId: '1', text: '先修端子' });
  s = apply(s, { type: 'choice', id: 'c', act: ACTS[0], optionId: '0', text: '改口' });
  assert.deepEqual(s.choices, [
    { id: 'c', act: ACTS[0], optionId: '1', text: '先修端子', at: date.toISOString() },
  ]);
});
test('trust 无验证或选择不可完成', () => {
  let s = apply(points(), { type: 'start', id: ACTS[0] });
  assert.equal(
    prismCount(apply(s, { type: 'complete', id: ACTS[0], result: { verified: true } })),
    0,
  );
});
test('trust 三幕奖励独立幂等，芯片条件', () => {
  let s = points();
  for (let i = 0; i < 3; i++) {
    s = finish(s, i);
    assert.equal(s.chipUnlocked, i === 2);
  }
  assert.equal(prismCount(s), 3);
  assert.equal(prismCount(finish(s, 0)), 3);
  assert.equal(hasChip({ getItem: () => JSON.stringify(s) }), true);
  assert.equal(hasChip({ getItem: () => null }), false);
});
test('forge 带电测量维修联锁', () => {
  const s = freshForge();
  assert.equal(actForge(s, 'measure').measured, false);
  assert.equal(actForge(s, 'terminal').repaired, false);
});
test('forge 断电测量、诊断、修复到7秒带内3秒', () => {
  let s = freshForge();
  for (const a of ['cut', 'measure', 'inspect', 'terminal', 'power']) s = actForge(s, a);
  s = advanceForge(s, 6.9);
  assert.equal(s.verified, false);
  s = advanceForge(s, 0.1);
  assert.equal(s.verified, true);
  assert.ok(s.inBand >= 3);
  assert.equal(s.temperature, 200);
});
test('forge 未修复曲线不通过、失败可重试、粗细步一致', () => {
  assert.equal(advanceForge(freshForge(), 7).verified, false);
  let s = freshForge();
  for (const a of ['cut', 'measure', 'inspect', 'crimp', 'power']) s = actForge(s, a);
  const coarse = advanceForge(s, 7);
  for (let i = 0; i < 70; i++) s = advanceForge(s, 0.1);
  assert.ok(Math.abs(coarse.inBand - s.inBand) < 1e-8);
  assert.equal(actForge(coarse, 'cut').elapsed, 0);
});
test('act2 电阻与线长筛选', () => {
  assert.deepEqual(SCRAPS.map(isTorch), [false, true, false]);
  assert.equal(isTorch({ length: 1, resistance: 0.2 }), false);
});
test('act3 断电联锁与24V窗口、两种选择合法', () => {
  assert.equal(wireLamp({ powered: true }).wired, undefined);
  assert.equal(wireLamp({ powered: false }, 48).wired, undefined);
  assert.equal(wireLamp({ powered: false }, 24).wired, true);
});
