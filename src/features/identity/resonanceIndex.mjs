import { DEFAULT_APPEARANCE } from './profile.mjs';
export const PROGRESS_KEYS = [
  'sparkmate.routes.v2',
  ...['street', 'kickback', 'resonance', 'assembly', 'envstory', 'trust', 'raid'].map(
    (n) => 'sparkmate.seventh-checksum.' + n + '.v1',
  ),
  'sparkmate.checksum.profile.v1',
  'ui:layout:v1',
];
export const clamp = (n, max = 1000) => Math.max(0, Math.min(max, Number.isFinite(n) ? n : 0));
export function readProgress(storage) {
  return Object.fromEntries(
    PROGRESS_KEYS.map((k) => {
      try {
        return [k, JSON.parse((storage || globalThis.localStorage).getItem(k))];
      } catch {
        return [k, null];
      }
    }),
  );
}
const world = (p, k) => p['sparkmate.seventh-checksum.' + k + '.v1'] || {};
export function resonanceIndex(identity, progress = {}) {
  const profile = progress['sparkmate.checksum.profile.v1'];
  const kps = Object.values(profile?.kps || {})
    .slice(0, 40)
    .filter((k) => k?.status === 'mastered');
  const evidence = (k) =>
    Array.isArray(k.evidence)
      ? k.evidence.filter((e) => e && e.score >= 0.7 && e.type !== 'explain')
      : [];
  const practical = kps.filter(
    (k) =>
      evidence(k).some((e) => e.type === 'measurement') &&
      new Set(evidence(k).map((e) => e.type)).size >= 3,
  );
  const r = world(progress, 'resonance');
  const nodes = [
    'li_fast_scan',
    'li_precision',
    'li_protocol',
    'gan_embrace',
    'gan_dodge',
    'gan_thermal',
  ].filter((n) => r.nodes?.[n] === true).length;
  const items = {
    knowledge: clamp((kps.reduce((n, k) => n + clamp(k.mastery, 1), 0) / 40) * 400, 400),
    practice: kps.length ? (practical.length / kps.length) * 200 : 0,
    story:
      ([
        world(progress, 'street').completed === true,
        world(progress, 'kickback').completed === true,
        world(progress, 'assembly').completed === true,
        world(progress, 'envstory').case?.state === 'closed',
        ['act1_repair_furnace', 'act2_scrap_torch', 'act3_grave_lamp'].every(
          (id) => world(progress, 'trust').invites?.[id]?.state === 'done',
        ),
        world(progress, 'raid').meta?.extracted > 0,
      ].filter(Boolean).length /
        6) *
      150,
    resonance: (nodes / 6) * 60 + (clamp(r.sync, 100) / 100) * 40,
    creation: identity
      ? Object.entries(DEFAULT_APPEARANCE).filter(
          ([k, v]) => identity.appearance?.[k] && identity.appearance[k] !== v,
        ).length *
          20 +
        (identity.nicknameChangedAt ? 20 : 0) +
        (identity.lastExportAt ? 20 : 0)
      : 0,
    connection: identity
      ? (clamp(
          new Set(Array.isArray(identity.activityDays) ? identity.activityDays : []).size,
          30,
        ) /
          30) *
        50
      : 0,
  };
  return { items, total: clamp(Math.round(Object.values(items).reduce((a, b) => a + b, 0))) };
}
export function percentile(uid) {
  let hash = 2166136261;
  for (const c of uid) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
  return hash % 100;
}
