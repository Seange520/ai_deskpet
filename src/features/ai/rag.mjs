import { maxSpoiler } from './guard.mjs';
// CANON_LEDGER §3/6/8: approved public observations only; no OPEN facts.
export const CANON_RULES = Object.freeze({
  source: 'work/handoff/CANON_LEDGER.md#3,6,8',
  noDecision: true,
  noTruth: true,
  noOpenFacts: true,
});
export function buildCorpus(graph, lessons) {
  return lessons.flatMap((lesson) => {
    const kp = graph.kps.find((k) => k.id === lesson.kp.id);
    if (!kp || !Number.isInteger(kp.spoilerLevel) || !lesson.kp.license) return [];
    return [
      {
        id: lesson.lessonId,
        kpId: kp.id,
        title: kp.name,
        text: lesson.kp.oneLiner,
        spoilerLevel: Math.max(kp.spoilerLevel, lesson.kp.spoilerLevel),
        prereq: kp.prereq,
        source: `src/features/learning/data/lessons/${kp.id}.lesson.json`,
        license: lesson.kp.license,
      },
    ];
  });
}
export function retrieve(query, profile, corpus) {
  // Filter before scoring: hidden content never enters the generation slots.
  return corpus
    .filter(
      (c) =>
        c.spoilerLevel <= maxSpoiler(profile) &&
        (!c.kpId || profile?.kps?.[c.kpId]?.status !== 'locked') &&
        (c.prereq || []).every((id) => profile?.kps?.[id]?.status === 'mastered'),
    )
    .map((c) => ({
      ...c,
      score: [...new Set(query.match(/[\p{Script=Han}]{2}|[a-z0-9-]+/giu) || [])].reduce(
        (n, w) => n + Number((c.title + c.text + c.kpId).toLowerCase().includes(w.toLowerCase())),
        0,
      ),
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}
