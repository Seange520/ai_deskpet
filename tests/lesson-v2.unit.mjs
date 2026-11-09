import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simIds } from '../src/features/learning/sims/registry.mjs';

const root = new URL('../src/features/learning/data/lessons-v2/', import.meta.url);
const file = new URL('K1-01.v2.json', root);
const raw = readFileSync(file, 'utf8');
const lesson = JSON.parse(raw);
const ORDER = ['mission', 'observe', 'learn', 'do', 'prove', 'transfer', 'recap'];
const RED = ['玩家', '游戏', '网页', '第七校验', '熵', '残响', '第一编译者', '0x7F'];

test('v2 lesson：schema 与课程 ID', () => {
  assert.equal(lesson.schema, 'lesson.v2');
  assert.equal(lesson.lessonId, 'L-K1-01-v2');
  assert.equal(lesson.kp.id, 'K1-01');
  assert.equal(lesson.meta.template, 'mission-seven-v1');
  assert.ok(lesson.meta.estimatedMinutes <= 12);
});

test('v2 lesson：七段顺序齐全', () => {
  assert.deepEqual(
    lesson.segments.map((s) => s.id),
    ORDER,
  );
  for (const seg of lesson.segments) assert.ok(seg.seconds > 0);
  const total = lesson.segments.reduce((n, s) => n + s.seconds, 0);
  assert.ok(total <= 600, `总时长 ${total}s 超过 600s`);
});

test('v2 lesson：每段都有 narration，且单句 ≤24 字', () => {
  for (const seg of lesson.segments) {
    assert.ok(Array.isArray(seg.narration) && seg.narration.length >= 2, seg.id);
    for (const line of seg.narration) assert.ok(line.length <= 24, `${seg.id}: ${line}`);
  }
});

test('v2 lesson：do 段使用白名单仿真', () => {
  const doSeg = lesson.segments.find((s) => s.id === 'do');
  assert.ok(simIds.includes(doSeg.sim.id), doSeg.sim.id);
  assert.ok(doSeg.sim.task.length > 10);
  assert.ok(doSeg.sim.hints.length >= 2);
});

test('v2 lesson：prove 段检查带单位与容差', () => {
  const prove = lesson.segments.find((s) => s.id === 'prove');
  assert.ok(prove.checks.length >= 1);
  for (const c of prove.checks) {
    assert.equal(c.type, 'measurement');
    assert.ok(['V', 'mA', 'Ω'].includes(c.unit), c.unit);
    assert.ok(c.tolerance > 0);
    assert.equal(typeof c.expected, 'number');
  }
});

test('v2 lesson：迁移题有答案索引且正确项在范围内', () => {
  const transfer = lesson.segments.find((s) => s.id === 'transfer');
  assert.ok(transfer.options.length >= 2);
  assert.ok(transfer.answerIndex >= 0 && transfer.answerIndex < transfer.options.length);
  assert.ok(transfer.prompt.length >= 8);
});

test('v2 lesson：媒体路径存在且 ready', () => {
  const media = lesson.segments.flatMap((s) => s.media || []);
  assert.ok(media.length >= 1);
  for (const m of media) {
    assert.equal(m.status, 'ready');
    assert.ok(
      existsSync(new URL('../public/' + m.src, import.meta.url)),
      m.src,
    );
  }
});

test('v2 lesson：红线禁词不出现在 narration 与 recap', () => {
  const text = lesson.segments
    .map((s) => [...(s.narration || []), ...(s.lines || [])].join(''))
    .join('');
  for (const word of RED) assert.ok(!text.includes(word), word);
  assert.equal(lesson.redLines.aiDoesNotDecide, true);
});

test('v2 lesson：安全声明存在', () => {
  assert.equal(lesson.safety.powerOffBeforeWiring, true);
  assert.equal(lesson.safety.liveMeasurementBlocked, true);
  assert.ok(lesson.safety.note.length > 10);
});
