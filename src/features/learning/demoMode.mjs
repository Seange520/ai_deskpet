// Demo 版内容开关：正式版与 Demo 共用同一份游戏代码与同一份学习档案。
// 启用方式：URL 带 ?demo=1，或之前访问过并被记住（localStorage）。
export const DEMO_LESSONS = Object.freeze(['AD-01', 'AD-02', 'K1-01', 'K1-04', 'K1-06']);
export const DEMO_STORAGE_KEY = 'sparkmate.checksum.demo.v1';
export const DEMO_BANNER = {
  title: 'Demo 版 · 第零章造物 + 第一章路灯',
  body: '正式版会自动继承这里的存档：读过的测量、留下的证据、点亮的星图都算数。',
};

export function demoRequested(search = '') {
  if (typeof search !== 'string') return false;
  return /(?:^|[?&])demo=1(?:&|$)/.test(search);
}

export function demoDisabled(search = '') {
  if (typeof search !== 'string') return false;
  return /(?:^|[?&])demo=0(?:&|$)/.test(search);
}

export function readDemoFlag(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(DEMO_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeDemoFlag(enabled, storage = globalThis.localStorage) {
  try {
    if (enabled) storage?.setItem(DEMO_STORAGE_KEY, '1');
    else storage?.removeItem(DEMO_STORAGE_KEY);
  } catch {
    /* 存储不可用时按非 Demo 处理 */
  }
}

export function demoEnabled(options = {}) {
  const { search = '', storage = globalThis.localStorage } = options;
  if (demoDisabled(search)) return false;
  if (demoRequested(search)) return true;
  return readDemoFlag(storage);
}

export const isDemoLesson = (id) => DEMO_LESSONS.includes(id);

export function filterDemoKps(kps, demo) {
  if (!demo) return kps;
  return kps.filter((k) => isDemoLesson(k.id));
}

export function filterDemoChapters(chapters, demo) {
  if (!demo) return chapters;
  return chapters
    .map((ch) => ({
      ...ch,
      lessons: ch.lessons.filter((id) => isDemoLesson(id)),
    }))
    .filter((ch) => ch.lessons.length > 0);
}

export function filterDemoIds(ids, demo) {
  if (!demo) return ids;
  return ids.filter((id) => isDemoLesson(id));
}
