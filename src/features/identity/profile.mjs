import { validUID } from './uid.mjs';
export const IDENTITY_KEY = 'sparkmate.checksum.identity.v1';
export const INSTALL_KEY = 'sparkmate.checksum.install.v1';
export const DEFAULT_APPEARANCE = { palette: 'forge', antenna: 'orange', decal: 'checksum' };
export const OPTIONS = {
  palette: ['forge', 'weave', 'echo'],
  antenna: ['orange', 'teal', 'amber'],
  decal: ['none', 'checksum', 'lamp'],
};
export const DAY = 86400000;
export function ageFlags(birthYear, year = new Date().getFullYear()) {
  const age = year - birthYear;
  return { minor: age < 14, minor18: age < 18 };
}
export function nicknameError(value, changedAt = null, now = Date.now()) {
  const name = typeof value === 'string' ? value.trim() : '';
  if ([...name].length < 2 || [...name].length > 16) return '铭牌须为 2–16 字符';
  if (
    !/^[\p{Script=Han}a-zA-Z0-9 ·_-]+$/u.test(name) ||
    !/[\p{Script=Han}a-zA-Z0-9]/u.test(name) ||
    /(?:https?:|www\.|@|\.[a-z]{2,})/i.test(name)
  )
    return '铭牌仅允许中英文、数字、空格、·、-、_，不可使用网址或邮箱';
  if (changedAt && now - Date.parse(changedAt) < 30 * DAY)
    return '铭牌更换有 30 天冷却，请稍后再试';
  return '';
}
export function appearance(value = {}) {
  return Object.fromEntries(
    Object.entries(OPTIONS).map(([k, values]) => [
      k,
      values.includes(value?.[k]) ? value[k] : DEFAULT_APPEARANCE[k],
    ]),
  );
}
export function activityDays(days = [], now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const date = (d) =>
    [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 29);
  return [...new Set([...(Array.isArray(days) ? days : []), date(today)])]
    .filter(
      (d) =>
        typeof d === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(d) &&
        d >= date(cutoff) &&
        d <= date(today),
    )
    .sort()
    .slice(-30);
}
export function freshProfile(
  uid,
  birthYear = new Date().getFullYear(),
  now = new Date().toISOString(),
) {
  return {
    version: 1,
    uid,
    nickname: '赫菲的学徒',
    nicknameChangedAt: null,
    birthYear,
    minor: ageFlags(birthYear).minor,
    appearance: { ...DEFAULT_APPEARANCE },
    consents: { aiMemory: false, analytics: false },
    createdAt: now,
    updatedAt: now,
    activityDays: activityDays([], new Date(now)),
  };
}
export function restoreProfile(raw) {
  if (raw === null || raw === undefined) return { profile: null, error: '' };
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!p || p.version !== 1 || !validUID(p.uid)) throw Error();
    if (p.nickname !== undefined && nicknameError(p.nickname)) throw Error();
    if (
      p.birthYear !== undefined &&
      (!Number.isInteger(p.birthYear) ||
        p.birthYear < 1900 ||
        p.birthYear > new Date().getFullYear())
    )
      throw Error();
    for (const k of ['createdAt', 'updatedAt', 'nicknameChangedAt', 'lastExportAt'])
      if (p[k] != null && !Number.isFinite(Date.parse(p[k]))) throw Error();
    const base = freshProfile(p.uid);
    return {
      profile: {
        ...base,
        ...p,
        appearance: appearance(p.appearance),
        consents: {
          aiMemory: p.consents?.aiMemory === true,
          analytics: p.consents?.analytics === true,
        },
        minor: ageFlags(p.birthYear === undefined ? base.birthYear : p.birthYear).minor,
        activityDays: Array.isArray(p.activityDays) ? p.activityDays : [],
      },
      error: '',
    };
  } catch {
    return { profile: null, error: '档案损坏，可重新生成' };
  }
}
export function exportPayload(identity, progress, exportedAt = new Date().toISOString()) {
  const { uid, nickname, appearance, consents, createdAt } = identity;
  return {
    schemaVersion: 1,
    exportedAt,
    identity: { uid, nickname, appearance, consents, createdAt },
    progress,
  };
}
export function deleteArchive(storage) {
  storage.removeItem(IDENTITY_KEY);
  storage.removeItem(INSTALL_KEY);
}
