import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  diagnosticResult,
  applyDiagnostic,
  freshProfile,
  restoreProfile,
  isMastered,
  PROFILE_KEY,
} from '../src/features/learning/learning.mjs';

const base = fileURLToPath(new URL('../src/features/learning/data/', import.meta.url));
const graph = JSON.parse(readFileSync(base + 'knowledge-graph.v1.json', 'utf8'));
const diagnostic = JSON.parse(readFileSync(base + 'diagnostic.v1.json', 'utf8'));
const chapters = JSON.parse(readFileSync(base + 'chapters.v1.json', 'utf8'));

const answersAll = () => {
  const a = {};
  diagnostic.questions.forEach((q) => {
    a[q.id] = q.answerIndex;
  });
  return a;
};
const answersWrong = () => {
  const a = {};
  diagnostic.questions.forEach((q) => {
    a[q.id] = (q.answerIndex + 1) % q.options.length;
  });
  return a;
};
const answersNone = {};
const answersHalf = () => {
  const a = {};
  diagnostic.questions.slice(0, 6).forEach((q) => {
    a[q.id] = q.answerIndex;
  });
  return a;
};

test('diagnostic 数据完整：12 题，答案索引合法，KP 均存在', () => {
  assert.equal(diagnostic.questions.length, 12);
  assert.equal(new Set(diagnostic.questions.map((q) => q.id)).size, 12);
  const layers = new Set(diagnostic.questions.map((q) => q.layer));
  for (const layer of ['L0', 'L1', 'L2', 'L3', 'L4', 'L5']) {
    assert.ok(layers.has(layer), layer);
  }
  for (const q of diagnostic.questions) {
    assert.ok(q.options.length >= 2, q.id);
    assert.ok(q.answerIndex >= 0 && q.answerIndex < q.options.length, q.id);
    assert.ok(graph.kps.some((k) => k.id === q.kpId), q.id);
  }
});

test('诊断分档：A <5，B 5–8，C ≥9', () => {
  assert.equal(diagnosticResult(diagnostic, answersNone).path, 'A');
  assert.equal(diagnosticResult(diagnostic, answersNone).score, 0);
  assert.equal(diagnosticResult(diagnostic, answersHalf()).path, 'B');
  assert.equal(diagnosticResult(diagnostic, answersHalf()).score, 6);
  assert.equal(diagnosticResult(diagnostic, answersAll()).path, 'C');
  assert.equal(diagnosticResult(diagnostic, answersAll()).score, 12);
  assert.equal(diagnosticResult(diagnostic, answersWrong()).path, 'A');
});

test('路径 A 不跳过任何 KP', () => {
  const p = freshProfile(graph);
  const next = applyDiagnostic(graph, p, diagnostic, answersNone);
  assert.equal(next.diagnostic.path, 'A');
  for (const q of diagnostic.questions) {
    assert.ok(!isMastered(next.kps[q.kpId]), q.kpId);
  }
});

test('路径 B 只跳过答对且属于 L0/L1 的 KP', () => {
  const p = freshProfile(graph);
  const next = applyDiagnostic(graph, p, diagnostic, answersHalf());
  const answered = diagnostic.questions.slice(0, 6);
  for (const q of answered) {
    const mastered = isMastered(next.kps[q.kpId]);
    if (q.layer === 'L0' || q.layer === 'L1') assert.ok(mastered, q.kpId);
    else assert.ok(!mastered, q.kpId);
  }
});

test('路径 C 跳过全部答对项，答错项不跳', () => {
  const p = freshProfile(graph);
  const answers = answersAll();
  answers[diagnostic.questions[0].id] = 99;
  const next = applyDiagnostic(graph, p, diagnostic, answers);
  assert.equal(next.diagnostic.path, 'C');
  assert.ok(!isMastered(next.kps[diagnostic.questions[0].kpId]));
  for (const q of diagnostic.questions.slice(1)) {
    assert.ok(isMastered(next.kps[q.kpId]), q.kpId);
  }
});

test('跳过 KP 带 3 类证据，诊断结果可持久化恢复', () => {
  const next = applyDiagnostic(
    graph,
    freshProfile(graph),
    diagnostic,
    answersAll(),
  );
  const kp = diagnostic.questions[0].kpId;
  assert.ok(next.kps[kp].evidence.length >= 3);
  assert.equal(next.kps[kp].mastery, 1);
  const restored = restoreProfile(graph, JSON.stringify(next));
  assert.equal(restored.diagnostic.path, 'C');
  assert.equal(restored.diagnostic.score, 12);
  assert.ok(restored.kps[kp].evidence.length >= 3);
});

test('损坏诊断字段回退 A/null 且不崩', () => {
  const bad = freshProfile(graph);
  bad.diagnostic = { path: 'Z', score: 'x' };
  const restored = restoreProfile(graph, JSON.stringify(bad));
  assert.equal(restored.diagnostic.path, 'A');
  const broken = restoreProfile(
    graph,
    JSON.stringify({ ...freshProfile(graph), diagnostic: 'oops' }),
  );
  assert.equal(broken.diagnostic, null);
});

test('章节数据：课节存在 V2 版本且引用 KP 合法', () => {
  assert.ok(chapters.chapters.length >= 2);
  for (const ch of chapters.chapters) {
    assert.ok(ch.lessons.length > 0, ch.id);
    for (const id of ch.lessons) {
      assert.ok(graph.kps.some((k) => k.id === id), id);
      assert.ok(
        existsSync(base + 'lessons-v2/' + id + '.v2.json'),
        'missing v2 for ' + id,
      );
    }
  }
});

test('PROFILE_KEY 未变（兼容既有存档）', () => {
  assert.equal(PROFILE_KEY, 'sparkmate.checksum.profile.v1');
});
