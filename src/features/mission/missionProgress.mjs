const KEY = 'sparkmate.checksum.mission.v1';
const ORDERS = ['A', 'B', 'C'];

function storageOrDefault(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function sanitizeRecords(records) {
  if (!records || typeof records !== 'object') return {};
  const next = {};
  for (const id of ORDERS) {
    const row = records[id];
    if (!row || typeof row !== 'object') continue;
    const score = Number(row.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) continue;
    next[id] = {
      score: Math.round(score),
      grade: typeof row.grade === 'string' ? row.grade.slice(0, 24) : '',
      at: Number(row.at) || 0,
    };
  }
  return next;
}

export function readMissionProgress(storage) {
  const store = storageOrDefault(storage);
  if (!store) return { completed: [], records: {}, updatedAt: 0 };
  try {
    const raw = store.getItem(KEY);
    if (!raw) return { completed: [], records: {}, updatedAt: 0 };
    const parsed = JSON.parse(raw);
    const completed = Array.isArray(parsed?.completed)
      ? parsed.completed.filter((id) => ORDERS.includes(id))
      : [];
    return {
      completed: [...new Set(completed)],
      records: sanitizeRecords(parsed?.records),
      updatedAt: Number(parsed?.updatedAt) || 0,
    };
  } catch {
    return { completed: [], records: {}, updatedAt: 0 };
  }
}

export function markMissionCompleted(orderId, storage) {
  return recordMissionResult(orderId, {}, storage);
}

export function recordMissionResult(orderId, result = {}, storage) {
  const store = storageOrDefault(storage);
  const current = readMissionProgress(store);
  if (!ORDERS.includes(orderId)) return current;
  const completed = current.completed.includes(orderId)
    ? current.completed
    : [...current.completed, orderId];
  const records = { ...current.records };
  const score = Number(result.score);
  if (Number.isFinite(score)) {
    const next = {
      score: Math.round(Math.min(100, Math.max(0, score))),
      grade: typeof result.grade === 'string' ? result.grade.slice(0, 24) : '',
      at: Number(result.at) || Date.now(),
    };
    const previous = records[orderId];
    if (!previous || next.score >= previous.score) records[orderId] = next;
  }
  const payload = { completed, records, updatedAt: Date.now() };
  try {
    store?.setItem(KEY, JSON.stringify(payload));
  } catch {
    // 隐私模式或配额不足时退化为会话内进度，不阻断任务流程。
  }
  return payload;
}

export function bestMissionRecord(progress, orderId) {
  return progress?.records?.[orderId] ?? null;
}

export function totalRepairedLights(progress) {
  return (progress?.completed ?? []).length;
}

export function nextOrderIndex(progress) {
  const completed = progress?.completed ?? [];
  for (let index = 0; index < 3; index += 1) {
    const order = ORDERS[index];
    if (!completed.includes(order)) return index;
  }
  return 0;
}

export { KEY as MISSION_PROGRESS_KEY };
