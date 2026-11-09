import { limit } from './guard.mjs';
export const MEMORY_KEY = 'sparkmate.ai.memory.v1';
export const RETENTION_MS = 180 * 86400000;
export const dayKey = (now) => new Date(now).toLocaleDateString('sv-SE');
export const freshMemory = () => ({
  version: 1,
  consent: false,
  recent: [],
  summaries: [],
  preferences: [],
  aideDiagnosis: [],
  aiUsage: { day: '', rounds: 0, characters: 0 },
});
export function pruneMemory(value, now = Date.now()) {
  const base = freshMemory();
  if (value?.version !== 1) return base;
  const valid = (item) =>
    item && Number.isFinite(item.at) && item.at > now - RETENTION_MS && item.at <= now;
  const list = (key, count) =>
    (Array.isArray(value[key]) ? value[key] : [])
      .filter(valid)
      .slice(-count)
      .map((i) => ({ at: i.at, text: limit(i.text, 200) }));
  return {
    ...base,
    consent: value.consent === true,
    recent: list('recent', 12),
    summaries: list('summaries', 20),
    preferences: list('preferences', 3),
    aideDiagnosis: (Array.isArray(value.aideDiagnosis) ? value.aideDiagnosis : [])
      .filter(valid)
      .slice(-20)
      .map((i) => ({ at: i.at, key: limit(i.key, 100) })),
    aiUsage:
      value.aiUsage?.day === dayKey(now) &&
      Number.isInteger(value.aiUsage.rounds) &&
      value.aiUsage.rounds >= 0 &&
      Number.isInteger(value.aiUsage.characters) &&
      value.aiUsage.characters >= 0
        ? { day: dayKey(now), rounds: value.aiUsage.rounds, characters: value.aiUsage.characters }
        : { ...base.aiUsage, day: dayKey(now) },
  };
}
export function restoreMemory(raw, now) {
  try {
    return pruneMemory(typeof raw === 'string' ? JSON.parse(raw) : raw, now);
  } catch {
    return freshMemory();
  }
}
export function remember(memory, input, response, now = Date.now()) {
  const m = pruneMemory(memory, now);
  return pruneMemory(
    {
      ...m,
      recent: [...m.recent, { at: now, text: limit(input, 80) + ' → ' + limit(response, 110) }],
      summaries: [...m.summaries, { at: now, text: '核对了当前观察；决定仍由维护者作出。' }],
    },
    now,
  );
}
export function exportMemory(memory, now) {
  return JSON.stringify(pruneMemory(memory, now), null, 2);
}
// Semantic and relation layers are live read-only views, never persisted or exported.
export function readOnlyLayers(learning, exploration, choices = exploration?.choices || []) {
  return { semantic: learning, relations: exploration, choices };
}
