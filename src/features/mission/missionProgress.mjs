const KEY = 'sparkmate.checksum.mission.v1';

function storageOrDefault(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readMissionProgress(storage) {
  const store = storageOrDefault(storage);
  if (!store) return { completed: [], updatedAt: 0 };
  try {
    const raw = store.getItem(KEY);
    if (!raw) return { completed: [], updatedAt: 0 };
    const parsed = JSON.parse(raw);
    const completed = Array.isArray(parsed?.completed)
      ? parsed.completed.filter((id) => ['A', 'B', 'C'].includes(id))
      : [];
    return { completed: [...new Set(completed)], updatedAt: Number(parsed?.updatedAt) || 0 };
  } catch {
    return { completed: [], updatedAt: 0 };
  }
}

export function markMissionCompleted(orderId, storage) {
  const store = storageOrDefault(storage);
  const current = readMissionProgress(store);
  if (!['A', 'B', 'C'].includes(orderId)) return current;
  const completed = current.completed.includes(orderId)
    ? current.completed
    : [...current.completed, orderId];
  const next = { completed, updatedAt: Date.now() };
  try {
    store?.setItem(KEY, JSON.stringify(next));
  } catch {
    // 隐私模式或配额不足时退化为会话内进度，不阻断任务流程。
  }
  return next;
}

export function nextOrderIndex(progress) {
  const completed = progress?.completed ?? [];
  for (let index = 0; index < 3; index += 1) {
    const order = ['A', 'B', 'C'][index];
    if (!completed.includes(order)) return index;
  }
  return 0;
}

export { KEY as MISSION_PROGRESS_KEY };
