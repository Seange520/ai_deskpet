import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simIds } from '../src/features/learning/sims/registry.mjs';

const dir = new URL('../src/features/learning/data/lessons-v2/', import.meta.url);
const files = readdirSync(dir).filter((name) => name.endsWith('.v2.json')).sort();
const ORDER = ['mission', 'observe', 'learn', 'do', 'prove', 'transfer', 'recap'];
const RED = ['玩家', '游戏', '网页', '第七校验', '熵', '残响', '第一编译者', '0x7F'];
const UNITS = ['V', 'mA', 'Ω', 'Hz', 'ms', '次', 's', '°C'];

assert.ok(files.length >= 4, `至少 4 节 V2 课：${files.join(', ')}`);

const lessons = files.map((name) => {
  const raw = readFileSync(new URL(name, dir), 'utf8');
  return { name, lesson: JSON.parse(raw) };
});

test('v2 lesson：schema 与课程 ID', () => {
  for (const { name, lesson } of lessons) {
    assert.equal(lesson.schema, 'lesson.v2', name);
    assert.match(lesson.lessonId, /^L-.+-v2$/, name);
    assert.equal(lesson.kp.id, name.replace('.v2.json', ''), name);
    assert.equal(lesson.meta.template, 'mission-seven-v1', name);
    assert.ok(lesson.meta.estimatedMinutes <= 12, name);
  }
});

test('v2 lesson：七段顺序齐全', () => {
  for (const { name, lesson } of lessons) {
    assert.deepEqual(
      lesson.segments.map((s) => s.id),
      ORDER,
      name,
    );
    for (const seg of lesson.segments) assert.ok(seg.seconds > 0, `${name}/${seg.id}`);
    const total = lesson.segments.reduce((n, s) => n + s.seconds, 0);
    assert.ok(total <= 600, `${name} 总时长 ${total}s 超过 600s`);
  }
});

test('v2 lesson：每段都有 narration，且单句 ≤24 字', () => {
  for (const { name, lesson } of lessons) {
    for (const seg of lesson.segments) {
      assert.ok(
        Array.isArray(seg.narration) && seg.narration.length >= 2,
        `${name}/${seg.id}`,
      );
      for (const line of seg.narration) {
        assert.ok(line.length <= 24, `${name}/${seg.id}: ${line}`);
      }
    }
  }
});

test('v2 lesson：do 段使用白名单仿真', () => {
  for (const { name, lesson } of lessons) {
    const doSeg = lesson.segments.find((s) => s.id === 'do');
    assert.ok(simIds.includes(doSeg.sim.id), `${name}: ${doSeg.sim.id}`);
    assert.ok(doSeg.sim.task.length > 10, name);
    assert.ok(doSeg.sim.hints.length >= 2, name);
  }
});

test('v2 lesson：prove 段检查带单位与容差', () => {
  for (const { name, lesson } of lessons) {
    const prove = lesson.segments.find((s) => s.id === 'prove');
    assert.ok(prove.checks.length >= 1, name);
    for (const c of prove.checks) {
      assert.equal(c.type, 'measurement', name);
      assert.ok(UNITS.includes(c.unit), `${name}: ${c.unit}`);
      assert.ok(c.tolerance > 0, name);
      assert.equal(typeof c.expected, 'number', name);
    }
  }
});

test('v2 lesson：迁移题有答案索引且正确项在范围内', () => {
  for (const { name, lesson } of lessons) {
    const transfer = lesson.segments.find((s) => s.id === 'transfer');
    assert.ok(transfer.options.length >= 2, name);
    assert.ok(
      transfer.answerIndex >= 0 && transfer.answerIndex < transfer.options.length,
      name,
    );
    assert.ok(transfer.prompt.length >= 8, name);
  }
});

test('v2 lesson：媒体路径存在且 ready', () => {
  for (const { name, lesson } of lessons) {
    const media = lesson.segments.flatMap((s) => s.media || []);
    assert.ok(media.length >= 1, name);
    for (const m of media) {
      assert.equal(m.status, 'ready', name);
      assert.ok(
        existsSync(new URL('../public/' + m.src, import.meta.url)),
        `${name}: ${m.src}`,
      );
    }
  }
});

test('v2 lesson：红线禁词不出现在 narration 与 recap', () => {
  for (const { name, lesson } of lessons) {
    const text = lesson.segments
      .map((s) => [...(s.narration || []), ...(s.lines || [])].join(''))
      .join('');
    for (const word of RED) assert.ok(!text.includes(word), `${name}: ${word}`);
    assert.equal(lesson.redLines.aiDoesNotDecide, true, name);
  }
});

test('v2 lesson：安全声明存在', () => {
  for (const { name, lesson } of lessons) {
    assert.equal(lesson.safety.powerOffBeforeWiring, true, name);
    assert.equal(lesson.safety.liveMeasurementBlocked, true, name);
    assert.ok(lesson.safety.note.length > 10, name);
  }
});
