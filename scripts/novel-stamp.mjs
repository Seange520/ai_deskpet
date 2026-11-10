#!/usr/bin/env node
// 小说版权存证清单：逐章 SHA-256 + 全稿 SHA-256 + 元数据。
// 用法：node scripts/novel-stamp.mjs
// 产出：work/deliverables/novel/stamp/novel-stamp-<yyyymmdd-hhmm>.json
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd(), '..');
const src = join(root, 'work', 'handoff', 'novel');
const outDir = join(root, 'work', 'deliverables', 'novel', 'stamp');
const mdPath = join(root, 'work', 'deliverables', 'novel', '第七校验_流明域_第一至二十二章_全稿.md');

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex').toUpperCase();
}

function han(buf) {
  return (buf.toString('utf8').match(/[\u4e00-\u9fff]/g) || []).length;
}

const fullText = readFileSync(mdPath, 'utf8');
const mdChapterCount = (fullText.match(/^#\s+第.+章/mg) || []).length;
const files = readdirSync(src)
  .filter((f) => /^ch\d{2}\.md$/.test(f))
  .sort()
  .filter((f) => Number(f.slice(2, 4)) <= mdChapterCount);

const chapters = files.map((f) => {
  const buf = readFileSync(join(src, f));
  const text = buf.toString('utf8');
  const titleLine = (text.match(/^#\s+(.+)$/m) || [])[1] || '';
  const body = text.split('## 编辑备注')[0];
  return {
    file: 'work/handoff/novel/' + f,
    title: titleLine.trim(),
    han: han(Buffer.from(body, 'utf8')),
    sha256: sha256(buf),
  };
});

let full = null;
if (readFileSync(mdPath, 'utf8').length > 0) {
  const buf = readFileSync(mdPath);
  full = {
    file: 'work/deliverables/novel/第七校验_流明域_第一至二十二章_全稿.md',
    bytes: buf.length,
    han: han(buf),
    sha256: sha256(buf),
  };
}

const stamp = {
  work: '第七校验·流明域',
  author: process.env.NOVEL_AUTHOR || '（作者署名待填）',
  generatedAt: new Date().toISOString(),
  note: '用于可信时间戳/区块链存证：上传本文件或对全文 SHA 做时间戳，即可证明该时点内容归属。',
  chapterCount: chapters.length,
  chapters,
  fullManuscript: full,
};

mkdirSync(outDir, { recursive: true });
const stampName = 'novel-stamp-' + new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13) + '.json';
const out = join(outDir, stampName);
writeFileSync(out, JSON.stringify(stamp, null, 2) + '\n', 'utf8');

console.log(JSON.stringify({ out, chapterCount: chapters.length, fullSha: full && full.sha256 }, null, 2));
