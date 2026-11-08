export const TRUST_KEY = 'sparkmate.seventh-checksum.trust.v1';
export const PRISMS_KEY = 'sparkmate.seventh-checksum.trust.prisms';
export const ACTS = ['act1_repair_furnace', 'act2_scrap_torch', 'act3_grave_lamp'];
export const TITLES = ['第一幕 · 修旧熔炉', '第二幕 · 废料场的焊枪', '第三幕 · 学徒墓前点灯'];
export const VALUE_CHOICES = [
  'listen-first',
  'respect-tools',
  'furnace-terminal',
  'torch-return',
  'lamp-respect',
];
export const levelFor = (points) =>
  Math.min(7, Math.floor(Math.max(0, Math.min(14, Number(points) || 0)) / 2));
export const canReachSeventh = (s, trueEnding = false) =>
  trueEnding && levelFor(s.trustPoints) >= 6;
export const reservedUnlocks = (s) => ({
  stealthSupport: levelFor(s.trustPoints) >= 5,
  hiddenOptions: levelFor(s.trustPoints) >= 6,
});
export const localDay = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function weekFor(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  return `${year}-W${String(Math.ceil(((d - new Date(Date.UTC(year, 0, 1))) / 86400000 + 1) / 7)).padStart(2, '0')}`;
}
export function freshTrust() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    npcId: 'hefi',
    trustPoints: 0,
    levelCap: 4,
    gifts: { week: weekFor(), total: 0 },
    invites: Object.fromEntries(
      ACTS.map((id) => [id, { state: 'locked', doneAt: null, result: null }]),
    ),
    choices: [],
    chipUnlocked: false,
    dailyGreeting: { lastSeenDay: null },
    history: [],
  };
}
export const prismCount = (s) => ACTS.filter((id) => s.invites[id].state === 'done').length;
export function validResult(id, r) {
  return (
    r?.verified === true &&
    (id === ACTS[0]
      ? r.elapsed >= 7 && r.inBand >= 3 && r.resistance === 12
      : id === ACTS[1]
        ? r.item === '亡徒焊枪' && r.length === 2 && r.resistance === 0.2
        : id === ACTS[2] && r.voltage === 24 && r.isolated === true && typeof r.lit === 'boolean')
  );
}
export function refreshTrust(s) {
  const level = levelFor(s.trustPoints);
  ACTS.forEach((id, i) => {
    const a = s.invites[id];
    if (a.state !== 'done')
      a.state = level >= i + 2 ? (a.state === 'active' ? 'active' : 'available') : 'locked';
  });
  s.chipUnlocked = level >= 4 && prismCount(s) === 3;
  return s;
}
export function validTrust(s) {
  return (
    !!s &&
    s.version === 1 &&
    typeof s.updatedAt === 'string' &&
    Number.isFinite(Date.parse(s.updatedAt)) &&
    s.npcId === 'hefi' &&
    s.levelCap === 4 &&
    Number.isInteger(s.trustPoints) &&
    s.trustPoints >= 0 &&
    s.trustPoints <= 14 &&
    Number.isFinite(s.gifts?.total) &&
    s.gifts.total >= 0 &&
    typeof s.gifts.week === 'string' &&
    Array.isArray(s.history) &&
    s.history.every(
      (h) =>
        typeof h.id === 'string' &&
        typeof h.at === 'string' &&
        Number.isFinite(h.gain) &&
        h.gain >= 0,
    ) &&
    Array.isArray(s.choices) &&
    s.choices.every(
      (c) =>
        typeof c.id === 'string' &&
        ACTS.includes(c.act) &&
        typeof c.optionId === 'string' &&
        typeof c.text === 'string' &&
        typeof c.at === 'string',
    ) &&
    !!s.dailyGreeting &&
    (s.dailyGreeting.lastSeenDay === null || typeof s.dailyGreeting.lastSeenDay === 'string') &&
    ACTS.every(
      (id) =>
        ['locked', 'available', 'active', 'done'].includes(s.invites?.[id]?.state) &&
        (s.invites[id].state !== 'done' ||
          (typeof s.invites[id].doneAt === 'string' && validResult(id, s.invites[id].result))),
    ) &&
    s.gifts.total <= 0.4 * s.history.reduce((n, h) => n + h.gain, 0) &&
    s.gifts.total === s.history.filter((h) => h.kind === 'gift').reduce((n, h) => n + h.gain, 0) &&
    new Set(s.history.map((h) => h.id)).size === s.history.length
  );
}
export function restoreTrust(raw) {
  try {
    if (typeof raw !== 'string' || raw.length > 262144) return freshTrust();
    const s = JSON.parse(raw);
    if (!validTrust(s)) return freshTrust();
    return refreshTrust(s);
  } catch {
    return freshTrust();
  }
}
export function reduceTrust(state, event, date = new Date()) {
  const s = structuredClone(state),
    at = date.toISOString(),
    week = weekFor(date),
    id = event.id;
  const add = (key, gain, kind) => {
    if (s.history.some((h) => h.id === key)) return false;
    s.history.push({ id: key, gain, kind, at, week });
    s.trustPoints = Math.min(s.levelCap * 2, Math.floor(s.history.reduce((n, h) => n + h.gain, 0)));
    return true;
  };
  if (event.type === 'case' && event.caseId === 'kickback') add('case:kickback', 2, 'case');
  if (event.type === 'debug' && id) add(id, 2, 'debug');
  if (event.type === 'value' && VALUE_CHOICES.includes(id)) add('value:' + id, 1, 'value');
  if (event.type === 'gift') {
    const total = s.history.reduce((n, h) => n + h.gain, 0),
      used = s.history.some((h) => h.kind === 'gift' && h.week === week);
    if (
      !used &&
      s.gifts.total + 0.5 <= 0.4 * (total + 0.5) &&
      s.trustPoints < 8 &&
      add('gift:' + week, 0.5, 'gift')
    )
      s.gifts = { week, total: s.gifts.total + 0.5 };
  }
  if (
    event.type === 'greet' &&
    levelFor(s.trustPoints) >= 1 &&
    s.dailyGreeting.lastSeenDay !== localDay(date)
  ) {
    s.dailyGreeting.lastSeenDay = localDay(date);
    add('greet:' + localDay(date), 0, 'greeting');
  }
  if (event.type === 'start' && ACTS.includes(id) && s.invites[id].state === 'available')
    s.invites[id].state = 'active';
  if (
    event.type === 'choice' &&
    ACTS.includes(event.act) &&
    s.invites[event.act].state === 'active' &&
    typeof event.text === 'string' &&
    !s.choices.some((c) => c.id === id)
  )
    s.choices.push({ id, act: event.act, optionId: event.optionId, text: event.text, at });
  if (
    event.type === 'complete' &&
    ACTS.includes(id) &&
    s.invites[id].state === 'active' &&
    validResult(id, event.result) &&
    s.choices.some((c) => c.act === id)
  ) {
    s.invites[id] = { state: 'done', doneAt: at, result: event.result };
    add('invite:' + id, 1, 'invite');
  }
  refreshTrust(s);
  if (JSON.stringify(s) !== JSON.stringify(state)) s.updatedAt = at;
  return s;
}
export const DIALOGUES = {
  0: ['炉边站稳。工具有自己的位置。', '先听一听，再动手。'],
  1: ['今天也来了。炉火还暖着。', '这只工具箱，跟我很久了。'],
  2: ['熔炉不是脾气坏，是接触不好。', '手放稳，读数会告诉你。'],
  3: ['你像我以前的学徒。肯蹲下来找一根线。', '旧东西，也有值得带回来的。'],
  4: ['孩子，灯在这儿。由你决定。', '你说过的话，我记得。'],
  5: ['并肩的路，先留着。', '炉火还在。'],
  6: ['工具先收好。', '有些路，往后再走。'],
  7: ['炉边还有位置。', '灯还亮着。'],
};
