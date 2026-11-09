import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MANIFEST_VERSION,
  PACK_STORAGE_KEY,
  validateIndex,
  pickMissingPacks,
  installedVersion,
  totalDownloadSize,
  formatBytes,
  parseInstalled,
  serializeInstalled,
  packProgress,
  nextPackToDownload,
  isPackReady,
  isValidPackId,
} from '../src/platform/assetPacks.mjs';

const file = (over = {}) => ({
  path: 'assets/a.png',
  url: './assets/packs/a/a.png',
  size: 1024,
  sha256: 'a'.repeat(64),
  ...over,
});

const pack = (over = {}) => ({
  id: 'act1-forge',
  title: '第一章 · 熔炉',
  version: '1.0.0',
  totalSize: 1024,
  files: [file()],
  ...over,
});

function indexOf(packs) {
  return { manifestVersion: MANIFEST_VERSION, generatedAt: '2026-11-09T00:00:00.000Z', packs };
}

test('合法的索引通过校验并统计文件总大小', () => {
  const result = validateIndex(indexOf([pack()]));
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.equal(PACK_STORAGE_KEY, 'sparkmate.checksum.packs.v1');
});

test('manifestVersion 或 generatedAt 缺失会被拒绝', () => {
  const bad = { manifestVersion: 99, packs: [pack()] };
  const result = validateIndex(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('manifestVersion')));
  assert.ok(result.errors.some((e) => e.includes('generatedAt')));
});

test('重复 id、非法版本、非法 sha256 会被拒绝', () => {
  const result = validateIndex(
    indexOf([
      pack(),
      pack({ id: 'act1-forge' }),
      pack({ id: 'Bad_ID', version: 'v1', files: [file({ sha256: 'xyz' })] }),
    ]),
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('重复 id')));
  assert.ok(result.errors.some((e) => e.includes('version')));
  assert.ok(result.errors.some((e) => e.includes('sha256')));
  assert.equal(isValidPackId('Bad_ID'), false);
});

test('totalSize 必须与文件总和一致', () => {
  const result = validateIndex(indexOf([pack({ totalSize: 2048 })]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('totalSize')));
});

test('缺失包按版本判断：未安装与版本落后都会返回', () => {
  const index = indexOf([pack(), pack({ id: 'act2-weave', files: [file()] })]);
  const missing = pickMissingPacks(index, {});
  assert.equal(missing.length, 2);
  const stale = pickMissingPacks(index, { 'act1-forge': { version: '0.9.0' } });
  assert.equal(stale.length, 2);
  const upToDate = pickMissingPacks(index, {
    'act1-forge': { version: '1.0.0' },
    'act2-weave': { version: '1.0.0' },
  });
  assert.deepEqual(upToDate, []);
});

test('版本号按数字段比较而不是字符串', () => {
  const index = indexOf([pack({ version: '1.0.10' })]);
  const missing = pickMissingPacks(index, { 'act1-forge': { version: '1.0.9' } });
  assert.equal(missing.length, 1);
  const same = pickMissingPacks(index, { 'act1-forge': { version: '1.0.10' } });
  assert.equal(same.length, 0);
});

test('下载大小合计与字节格式化', () => {
  const packs = [pack(), pack({ id: 'audio-zh', totalSize: 2048, files: [file({ size: 2048 })] })];
  assert.equal(totalDownloadSize(packs), 3072);
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');
  assert.equal(formatBytes(0), '0 B');
});

test('坏存档会安全回退为空对象，序列化会过滤非法项', () => {
  assert.deepEqual(parseInstalled('not json'), {});
  assert.deepEqual(parseInstalled('{"bad id":{"version":"1.0.0"}}'), {});
  assert.deepEqual(parseInstalled(JSON.stringify({ 'act1-forge': { version: '1.0.0' } })), {
    'act1-forge': { version: '1.0.0', downloadedAt: null },
  });
  const serialized = serializeInstalled({
    'act2-weave': { version: '1.0.0', downloadedAt: '2026-11-09T00:00:00.000Z' },
    'act1-forge': { version: '1.0.0' },
    'Bad Id': { version: '1.0.0' },
  });
  assert.equal(
    serialized,
    '{"act1-forge":{"version":"1.0.0","downloadedAt":null},"act2-weave":{"version":"1.0.0","downloadedAt":"2026-11-09T00:00:00.000Z"}}',
  );
});

test('下载进度会夹在 0 到 1 之间', () => {
  assert.equal(packProgress(0, 100), 0);
  assert.equal(packProgress(50, 100), 0.5);
  assert.equal(packProgress(120, 100), 1);
  assert.equal(packProgress(-5, 100), 0);
  assert.equal(packProgress(10, 0), 0);
});

test('顺序下载：返回第一个未就绪包，全部就绪返回 null', () => {
  const index = indexOf([pack(), pack({ id: 'act2-weave', files: [file()] })]);
  assert.equal(nextPackToDownload(index, {}).id, 'act1-forge');
  assert.equal(
    nextPackToDownload(index, { 'act1-forge': { version: '1.0.0' } }).id,
    'act2-weave',
  );
  assert.equal(
    nextPackToDownload(index, {
      'act1-forge': { version: '1.0.0' },
      'act2-weave': { version: '1.0.0' },
    }),
    null,
  );
});

test('isPackReady 与 installedVersion 对缺失数据安全', () => {
  assert.equal(isPackReady(null, {}), false);
  assert.equal(isPackReady(pack(), null), false);
  assert.equal(isPackReady(pack(), { 'act1-forge': { version: '1.0.0' } }), true);
  assert.equal(installedVersion(null, 'act1-forge'), null);
  assert.equal(installedVersion({ 'act1-forge': { version: 3 } }, 'act1-forge'), null);
});
