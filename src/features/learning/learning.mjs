export const PROFILE_KEY = 'sparkmate.checksum.profile.v1';
export const DAY = 86400000,
  RETENTION = [1, 3, 7, 21];
export const STATES = {
  locked: '迷雾',
  open: '微光',
  learning: '点亮',
  mastered: '常亮',
};
export const clamp = (n) =>
  Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
export const mastery = (c, t, b = 0) =>
  clamp(0.6 * clamp(c) + 0.4 * clamp(t) + Math.min(0.08, Math.max(0, b)));
export const isMastered = (k) =>
  !!k &&
  k.mastery >= 0.7 &&
  new Set(
    k.evidence
      .filter((e) => e.type !== 'explain' && e.score >= 0.7)
      .map((e) => e.type),
  ).size >= 3;
export function gatePassed(g, p, id) {
  const gate = g.gates.find((x) => x.id === id);
  return (
    gate?.type === 'any-three-pillars' &&
    new Set(
      g.kps
        .filter((k) => k.layer !== 'L8' && isMastered(p.kps[k.id]))
        .map((k) => k.pillar),
    ).size >= gate.requiresMinPillars
  );
}
export const available = (g, p, k) =>
  k.prereq.every((id) => isMastered(p.kps[id])) &&
  (!k.gatePrereq || gatePassed(g, p, k.gatePrereq));
export function reconcile(g, p) {
  return {
    ...p,
    kps: Object.fromEntries(
      g.kps.map((k) => {
        const v = p.kps[k.id] || {
          mastery: 0,
          attempts: 0,
          evidence: [],
          lastAt: null,
        };
        return [
          k.id,
          {
            ...v,
            status: !available(g, p, k)
              ? 'locked'
              : isMastered(v)
                ? 'mastered'
                : v.attempts
                  ? 'learning'
                  : 'open',
          },
        ];
      }),
    ),
  };
}
export function freshProfile(g, now = new Date().toISOString()) {
  return reconcile(g, {
    version: 1,
    updatedAt: now,
    kps: {},
    schedule: { due: [], streakDays: 0, lastDay: null },
    settings: { reducedMotion: false, sfx: true },
    history: [],
  });
}
export function restoreProfile(g, raw) {
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (
      p?.version !== 1 ||
      !p.kps ||
      !Array.isArray(p.history) ||
      !Array.isArray(p.schedule?.due)
    )
      return freshProfile(g);
    const base = freshProfile(g);
    for (const k of g.kps) {
      const v = p.kps[k.id];
      if (
        !v ||
        !Number.isFinite(v.mastery) ||
        !Number.isInteger(v.attempts) ||
        v.attempts < 0 ||
        !Array.isArray(v.evidence)
      )
        continue;
      base.kps[k.id] = {
        ...v,
        mastery: clamp(v.mastery),
        evidence: v.evidence.filter(
          (e) =>
            [
              'quiz',
              'sim-task',
              'measurement',
              'numeric-choice',
              'explain',
              'code',
            ].includes(e.type) &&
            Number.isFinite(e.score) &&
            typeof e.at === 'string',
        ),
      };
    }
    return reconcile(g, {
      ...base,
      updatedAt: p.updatedAt || base.updatedAt,
      schedule: {
        ...base.schedule,
        ...p.schedule,
        due: p.schedule.due.filter(
          (d) => base.kps[d.kpId] && Number.isFinite(Date.parse(d.dueAt)),
        ),
      },
      settings: { ...base.settings, ...p.settings },
      history: p.history,
    });
  } catch {
    return freshProfile(g);
  }
}
export function beginLesson(g, p, id, now = new Date().toISOString()) {
  const k = g.kps.find((k) => k.id === id);
  if (!k || !available(g, p, k)) return p;
  return reconcile(g, {
    ...p,
    updatedAt: now,
    kps: { ...p.kps, [id]: { ...p.kps[id], attempts: p.kps[id].attempts + 1 } },
  });
}
export function completeLesson(
  g,
  p,
  id,
  result,
  now = new Date().toISOString(),
) {
  if (
    !g.kps.some((k) => k.id === id && available(g, p, k)) ||
    !result.runId ||
    p.history.some((h) => h.runId === result.runId)
  )
    return p;
  const old = p.kps[id],
    at = Date.parse(now),
    origin = Date.parse(old.firstAt || now),
    reviews = new Set(old.reviews || []);
  const reviewDay = RETENTION.find((d) => !reviews.has(d));
  if (
    result.checkScore >= 0.7 &&
    result.transferScore >= 0.7 &&
    reviewDay &&
    at - origin >= reviewDay * DAY
  )
    reviews.add(reviewDay);
  const entry = {
    ...old,
    evidence: [
      ...old.evidence,
      ...result.evidence.map((e) => ({ ...e, score: clamp(e.score), at: now })),
    ],
    lastAt: now,
    firstAt: old.firstAt || now,
    reviews: [...reviews],
    mastery: mastery(
      result.checkScore,
      result.transferScore,
      reviews.size * 0.02,
    ),
  };
  const day = now.slice(0, 10),
    prev = p.schedule.lastDay,
    streak =
      prev === day
        ? p.schedule.streakDays
        : prev && Math.round((Date.parse(day) - Date.parse(prev)) / DAY) === 1
          ? p.schedule.streakDays + 1
          : 1;
  const due = p.schedule.due.filter((d) => d.kpId !== id),
    next = RETENTION.find((d) => !reviews.has(d));
  if (next)
    due.push({
      kpId: id,
      dueAt: new Date(Math.max(at + DAY, origin + next * DAY)).toISOString(),
    });
  return reconcile(g, {
    ...p,
    updatedAt: now,
    kps: { ...p.kps, [id]: entry },
    schedule: { due, streakDays: streak, lastDay: day },
    history: [...p.history, { kpId: id, runId: result.runId, at: now }],
  });
}
export function recommendations(g, p, minutes = 15, now = Date.now()) {
  const due = p.schedule.due
      .filter((d) => Date.parse(d.dueAt) <= now)
      .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
      .map((d) => d.kpId),
    next = g.kps
      .filter((k) => available(g, p, k) && !isMastered(p.kps[k.id]))
      .map((k) => k.id);
  return [...new Set([...due, ...next])].slice(
    0,
    minutes === 60 ? 4 : minutes === 30 ? 2 : 1,
  );
}
export const visibleStory = (k) => (k.spoilerLevel <= 1 ? k.storyScene : null);
export function measurementPass(c, v) {
  return typeof c.expected === 'number'
    ? String(v).trim() !== '' &&
        Number.isFinite(Number(v)) &&
        Math.abs(Number(v) - c.expected) <= c.tolerance + 1e-9
    : String(v).trim() === String(c.expected);
}
export function lessonResult(l, s, e, runId) {
  const checks = l.checks.filter((c) => c.type !== 'explain'),
    source = (c) =>
      c.type === 'measurement'
        ? 'verify'
        : c.type === 'numeric-choice'
          ? 'transfer'
          : ['code', 'sim-task', 'project'].includes(c.type)
            ? 'practice'
            : 'hook',
    weight = checks.reduce((n, c) => n + c.weight, 0);
  return {
    runId,
    checkScore: weight
      ? checks.reduce((n, c) => n + (s[source(c)] || 0) * c.weight, 0) / weight
      : 0,
    transferScore: s.transfer || 0,
    evidence: e,
  };
}
