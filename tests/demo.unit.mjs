import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEMO_BANNER,
  DEMO_LESSONS,
  DEMO_STORAGE_KEY,
  demoDisabled,
  demoEnabled,
  demoRequested,
  filterDemoChapters,
  filterDemoIds,
  filterDemoKps,
  isDemoLesson,
  readDemoFlag,
  writeDemoFlag,
} from '../src/features/learning/demoMode.mjs';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    dump: () => Object.fromEntries(map),
  };
}

test('demo 参数解析只认 demo=1，demo=0 显式关闭', () => {
  assert.equal(demoRequested('?demo=1'), true);
  assert.equal(demoRequested('?quality=3&world=p9&demo=1'), true);
  assert.equal(demoRequested('?demo=10'), false);
  assert.equal(demoRequested('?notdemo=1'), false);
  assert.equal(demoRequested(''), false);
  assert.equal(demoDisabled('?demo=0'), true);
  assert.equal(demoDisabled('?demo=1'), false);
});

test('demo 开关：URL 优先，其次 localStorage 记忆；屏蔽存储不崩', () => {
  assert.equal(demoEnabled({ search: '?demo=1', storage: memoryStorage() }), true);
  assert.equal(
    demoEnabled({ search: '', storage: memoryStorage({ [DEMO_STORAGE_KEY]: '1' }) }),
    true,
  );
  assert.equal(
    demoEnabled({ search: '?demo=0', storage: memoryStorage({ [DEMO_STORAGE_KEY]: '1' }) }),
    false,
  );
  assert.equal(
    demoEnabled({
      search: '',
      storage: {
        getItem() {
          throw new Error('blocked');
        },
      },
    }),
    false,
  );
});

test('demo 标志写入与读取：开启写 1、关闭移除', () => {
  const storage = memoryStorage();
  writeDemoFlag(true, storage);
  assert.equal(readDemoFlag(storage), true);
  writeDemoFlag(false, storage);
  assert.equal(readDemoFlag(storage), false);
  assert.equal(readDemoFlag(undefined), false);
});

test('Demo 白名单固定 5 节并全部存在于 chapters 数据', async () => {
  assert.deepEqual([...DEMO_LESSONS], ['AD-01', 'AD-02', 'K1-01', 'K1-04', 'K1-06']);
  const { default: chapters } = await import(
    '../src/features/learning/data/chapters.v1.json',
    { with: { type: 'json' } }
  );
  const all = new Set(chapters.chapters.flatMap((ch) => ch.lessons));
  for (const id of DEMO_LESSONS) assert.ok(all.has(id), 'missing chapter lesson ' + id);
  assert.equal(isDemoLesson('AD-06'), false);
  assert.ok(DEMO_BANNER.title.includes('Demo'));
});

test('过滤函数只在 demo 开启时裁剪，关闭时原样返回', () => {
  const kps = [{ id: 'AD-01' }, { id: 'AD-02' }, { id: 'AD-06' }, { id: 'K1-01' }];
  assert.equal(filterDemoKps(kps, false), kps);
  assert.deepEqual(
    filterDemoKps(kps, true).map((k) => k.id),
    ['AD-01', 'AD-02', 'K1-01'],
  );

  const chapters = [
    { id: 'ch0', lessons: ['AD-01', 'AD-02', 'AD-06'] },
    { id: 'ch1', lessons: ['K1-01', 'K3-01'] },
    { id: 'ch2', lessons: ['K4-02'] },
  ];
  const filtered = filterDemoChapters(chapters, true);
  assert.deepEqual(filtered.map((ch) => ch.id), ['ch0', 'ch1']);
  assert.deepEqual(filtered[0].lessons, ['AD-01', 'AD-02']);
  assert.deepEqual(filtered[1].lessons, ['K1-01']);
  assert.equal(filterDemoChapters(chapters, false), chapters);

  assert.deepEqual(filterDemoIds(['AD-06', 'AD-01'], true), ['AD-01']);
  assert.deepEqual(filterDemoIds(['AD-06'], false), ['AD-06']);
});
