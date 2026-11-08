import { DETECTION, visible, heard, distance, patrolAt } from './patrol.mjs';
import { freshCircuit, actCircuit, advanceCircuit } from '../street/circuit.mjs';
export { DETECTION };
export const RAID_KEY = 'sparkmate.seventh-checksum.raid.v1';
export const ALARM = Object.freeze({ max: 100, spark: 10, short: 10 });
export const SKILL = Object.freeze({
  id: 'silentSteps',
  name: '静默脚步',
  duration: 5,
  cooldown: 30,
  description: '[COPY-PENDING]',
});
export const LOOT = Object.freeze(
  [
    { id: 'thick', name: '粗线径', dropFactor: 0.5, speedFactor: 0.9, core: true },
    { id: 'shield', name: '屏蔽双绞', noiseCharges: 1, core: true },
    { id: 'capacitor', name: '大电容', cooldownFactor: 0.8, heat: 10, core: true },
    { id: 'fuse', name: '快熔保险', shortFactor: 0.4, powerFrequency: 2 },
    { id: 'loose', name: '虚接', loosePerRoom: 1, extraDrop: 1 },
    { id: 'mute', name: '静默', eyeText: false, compute: 20 },
  ].map((v) => Object.freeze({ ...v, description: '[COPY-PENDING]' })),
);
export const CODE_MODULE = Object.freeze([
  { id: 'watchdog', name: 'watchdog', code: 'if now - heartbeat > limit:\n    reset_worker()' },
  { id: 'average', name: '滑动平均滤波', code: 'window.push(sample)\nreturn sum(window[-5:]) / 5' },
  {
    id: 'backoff',
    name: '重连退避',
    code: 'delay = min(cap, base * 2 ** attempt)\nretry_after(delay)',
  },
]);
export const ROOMS = Object.freeze([
  {
    id: 'room1',
    name: '外院',
    objective: '[COPY-PENDING]',
    mode: 'voltage',
    target: '带电卷帘门支路',
    pool: ['thick', 'shield', 'capacitor'],
  },
  {
    id: 'room2',
    name: '压缩机棚',
    objective: '[COPY-PENDING]',
    mode: 'voltage',
    target: '未短接的照明支路',
    pool: ['shield', 'fuse', 'loose'],
  },
  {
    id: 'room3',
    name: '熔炉坑',
    objective: '[COPY-PENDING]',
    mode: 'continuity',
    target: '隔离后的低阻接地路径',
    pool: ['capacitor', 'loose', 'mute'],
  },
]);
export function hashSeed(text) {
  let h = 2166136261;
  for (const c of String(text)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export const seedFor = (date, uidHash, runIndex) => hashSeed(date + '|' + uidHash + '|' + runIndex);
export function rng(seed) {
  let x = hashSeed(seed);
  return () => {
    x += 0x6d2b79f5;
    let t = x;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function createRun(seed) {
  const random = rng(seed);
  return {
    seed,
    state: 'idle',
    room: 0,
    elapsed: 0,
    timeLeft: 720,
    exposure: 0,
    alarm: 0,
    materials: 0,
    cores: 0,
    mods: [],
    modules: [],
    lore: [],
    measurements: [],
    rooms: ROOMS.map((r) => ({
      ...r,
      correct: Math.floor(random() * 3),
      loose: Math.floor(random() * 3),
      solved: false,
      powerUsed: false,
      powered: true,
      disabledUntil: 0,
      patrolClock: 0,
    })),
    kit: freshCircuit(),
    reading: null,
    noiseCharges: 0,
    heat: 0,
    skillUnlocked: false,
    silentUntil: 0,
    readyAt: 0,
    rebuilds: 2,
    codeAnswered: false,
    question: Math.floor(random() * 3),
    failure: null,
  };
}
const terminal = (s) => ['extracted', 'failed'].includes(s.state);
export function transition(s, next) {
  const edges = {
    idle: ['entering'],
    entering: ['running', 'failed'],
    running: ['checkpoint', 'failed'],
    checkpoint: ['extracting', 'failed'],
    extracting: ['extracted', 'failed'],
  };
  if (!(edges[s.state] || []).includes(next)) return s;
  if (next === 'checkpoint' && !s.rooms.every((r) => r.solved)) return s;
  if (next === 'extracting' && !s.skillUnlocked) return s;
  if (next === 'extracted' && s.cores !== 3) return s;
  return { ...s, state: next };
}
export function effects(s) {
  const has = (id) => s.mods.includes(id);
  return {
    dropFactor: has('thick') ? 0.5 : 1,
    speedFactor: has('thick') ? 0.9 : 1,
    cooldownFactor: has('capacitor') ? 0.8 : 1,
    shortFactor: has('fuse') ? 0.4 : 1,
    powerFrequency: has('fuse') ? 2 : 1,
    eyeText: !has('mute'),
    compute: has('mute') ? 20 : 0,
  };
}
export function alarmEvent(s, type) {
  if (terminal(s) || !['running', 'checkpoint', 'extracting'].includes(s.state)) return s;
  const alarm = Math.min(100, s.alarm + (ALARM[type] || 0));
  const materials =
    type === 'short'
      ? Math.max(0, s.materials - Math.ceil(5 * effects(s).shortFactor))
      : s.materials;
  return { ...s, alarm, materials, ...(alarm >= 100 ? { state: 'failed', failure: 'alarm' } : {}) };
}
export function cutPower(s) {
  if (s.state !== 'running') return s;
  const room = s.rooms[s.room];
  if (room.powerUsed) return s;
  return {
    ...s,
    rooms: s.rooms.map((r, i) =>
      i === s.room ? { ...r, powerUsed: true, powered: false, disabledUntil: s.elapsed + 8 } : r,
    ),
  };
}
export function kitAction(s, action) {
  if (terminal(s)) return s;
  if (!['scanner', 'mode'].includes(action.type)) return s;
  return { ...s, kit: actCircuit(s.kit, action) };
}
export function measure(s, probe, mode = s.kit.mode) {
  if (s.state !== 'running' || ![0, 1, 2].includes(probe) || mode !== s.kit.mode) return s;
  const room = s.rooms[s.room];
  // Reuse P0 scanner gate, -12 focus cost and powered continuity safety interlock.
  const kit = actCircuit({ ...s.kit, powered: room.powered }, { type: 'measure', id: 'return' });
  if (!s.kit.scanner || s.kit.focus < 12) return { ...s, kit };
  const blocked = mode === 'continuity' && room.powered;
  const loose = s.mods.includes('loose') && probe === room.loose;
  const good = probe === room.correct;
  const value =
    mode === 'voltage'
      ? room.powered
        ? good
          ? 24 - 0.4 * effects(s).dropFactor
          : 0
        : 0
      : good
        ? loose
          ? 1.2
          : 0.04
        : null;
  const reading = {
    room: room.id,
    probe,
    mode,
    value,
    unit: mode === 'voltage' ? 'V' : 'Ω',
    blocked,
    loose,
    time: s.elapsed,
    valid: !blocked && mode === room.mode && (mode !== 'voltage' || room.powered),
  };
  return { ...s, kit, reading, measurements: [...s.measurements, reading].slice(-128) };
}
export function solve(s, probe) {
  if (s.state !== 'running') return s;
  const r = s.rooms[s.room];
  const evidence = s.measurements.some((m) => m.room === r.id && m.probe === probe && m.valid);
  if (r.solved || !evidence) return s;
  if (probe !== r.correct) return alarmEvent(s, 'spark');
  return {
    ...s,
    rooms: s.rooms.map((room, i) => (i === s.room ? { ...room, solved: true } : room)),
  };
}
export function lootChoices(s) {
  return s.state === 'running' && s.rooms[s.room].solved ? [...s.rooms[s.room].pool] : [];
}
export function takeLoot(s, id) {
  if (!lootChoices(s).includes(id)) return s;
  const mods = [...new Set([...s.mods, id])];
  const n = {
    ...s,
    mods,
    cores: s.cores + 1,
    materials: s.materials + 10 + (mods.includes('loose') ? 1 : 0),
    noiseCharges: s.noiseCharges + (id === 'shield' ? 1 : 0),
    heat: s.heat + (id === 'capacitor' ? 10 : 0),
  };
  if (s.room === 2) return transition(n, 'checkpoint');
  return { ...n, room: s.room + 1, reading: null };
}
export function rebuild(s) {
  if (s.state !== 'checkpoint' || s.rebuilds <= 0) return s;
  return { ...s, rebuilds: s.rebuilds - 1, skillUnlocked: true };
}
export function answerCode(s, id) {
  if (s.state !== 'checkpoint' || s.codeAnswered || !CODE_MODULE.some((m) => m.id === id)) return s;
  const correct = id === CODE_MODULE[s.question].id;
  return { ...s, codeAnswered: true, modules: correct ? [id] : [] };
}
export function activateSkill(s) {
  if (!s.skillUnlocked || !['checkpoint', 'extracting'].includes(s.state) || s.elapsed < s.readyAt)
    return s;
  return { ...s, silentUntil: s.elapsed + 5, readyAt: s.elapsed + 30 * effects(s).cooldownFactor };
}
export function tick(
  s,
  dt,
  {
    player = [0, 0],
    drone,
    boxes = [],
    crouched = false,
    stationary = true,
    footstep = false,
  } = {},
) {
  if (!Number.isFinite(dt) || dt <= 0 || !['running', 'checkpoint', 'extracting'].includes(s.state))
    return s;
  dt = Math.min(dt, s.timeLeft);
  const room = s.rooms[s.room],
    disabled = s.elapsed < room.disabledUntil;
  // A frame crossing the eight-second boundary is integrated in two pieces.
  if (disabled && s.elapsed + dt > room.disabledUntil) {
    const first = room.disabledUntil - s.elapsed;
    return tick(
      tick(s, first, { player, drone, boxes, crouched, stationary, footstep }),
      dt - first,
      { player, drone, boxes, crouched, stationary, footstep: false },
    );
  }
  const time = s.elapsed + dt;
  const patrolClock = room.patrolClock + (disabled ? 0 : dt);
  const current = drone || patrolAt(DETECTION.path, DETECTION.speed, patrolClock);
  const seen = !disabled && visible(current, player, boxes);
  const noise =
    !disabled && footstep
      ? heard(current, player, { crouched, stationary, silent: s.elapsed < s.silentUntil })
      : 0;
  const shielded = noise > 0 && s.noiseCharges > 0;
  const gain =
    (seen ? 20 * (1 + Math.max(0, 1 - distance(current.position, player) / 9)) * dt : 0) +
    (shielded ? 0 : 8 * noise);
  const exposure = Math.max(0, Math.min(100, s.exposure + gain - (seen ? 0 : 10 * dt)));
  const alarm = Math.min(100, s.alarm + gain);
  const failure = time >= 720 ? 'timeout' : alarm >= 100 ? 'alarm' : null;
  return {
    ...s,
    elapsed: time,
    timeLeft: 720 - time,
    exposure,
    alarm,
    noiseCharges: s.noiseCharges - (shielded ? 1 : 0),
    rooms: s.rooms.map((r, i) => (i === s.room ? { ...r, patrolClock } : r)),
    kit: advanceCircuit(s.kit, dt),
    ...(failure ? { state: 'failed', failure } : {}),
  };
}
export function freshSave() {
  return {
    version: 1,
    updatedAt: null,
    meta: {
      runs: 0,
      extracted: 0,
      failed: 0,
      bestTimeSec: null,
      bestMaterials: 0,
      materials: 0,
      unlockedMods: [],
      unlockedModules: [],
      lore: [],
      firstClearRewarded: false,
    },
    history: [],
    rewards: { xp: 0, prisms: 0 },
  };
}
export function restoreSave(raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (data?.version !== 1 || !data.meta || !Array.isArray(data.history)) return freshSave();
    const blank = freshSave(),
      m = data.meta;
    for (const k of ['runs', 'extracted', 'failed', 'bestMaterials', 'materials'])
      if (!Number.isSafeInteger(m[k]) || m[k] < 0) return blank;
    if (m.runs !== m.extracted + m.failed || m.firstClearRewarded !== m.extracted > 0) return blank;
    if (
      m.bestTimeSec !== null &&
      (!Number.isFinite(m.bestTimeSec) || m.bestTimeSec < 0 || m.bestTimeSec > 720)
    )
      return blank;
    for (const k of ['unlockedMods', 'unlockedModules', 'lore'])
      if (!Array.isArray(m[k]) || m[k].some((x) => typeof x !== 'string')) return blank;
    const mods = new Set(LOOT.map((x) => x.id)),
      modules = new Set(CODE_MODULE.map((x) => x.id));
    if (m.unlockedMods.some((x) => !mods.has(x)) || m.unlockedModules.some((x) => !modules.has(x)))
      return blank;
    return {
      ...blank,
      updatedAt: data.updatedAt,
      meta: { ...blank.meta, ...Object.fromEntries(Object.keys(blank.meta).map((k) => [k, m[k]])) },
      history: data.history
        .filter((h) => typeof h?.id === 'string' && ['extracted', 'failed'].includes(h.state))
        .slice(-100),
      rewards: m.firstClearRewarded ? { xp: 100, prisms: 1 } : blank.rewards,
    };
  } catch {
    return freshSave();
  }
}
export function settle(save, run, id, now = new Date().toISOString()) {
  if (!terminal(run) || save.history.some((h) => h.id === id)) return save;
  const won = run.state === 'extracted',
    kept = won ? run.materials : Math.floor(run.materials * 0.3),
    m = save.meta;
  const meta = {
    ...m,
    runs: m.runs + 1,
    extracted: m.extracted + Number(won),
    failed: m.failed + Number(!won),
    materials: m.materials + kept,
    bestMaterials: Math.max(m.bestMaterials, kept),
    bestTimeSec: won
      ? Math.min(m.bestTimeSec === null ? Infinity : m.bestTimeSec, run.elapsed)
      : m.bestTimeSec,
    unlockedMods: [...new Set([...m.unlockedMods, ...run.mods])],
    unlockedModules: [...new Set([...m.unlockedModules, ...run.modules])],
    lore: [...new Set([...m.lore, ...run.lore])],
    firstClearRewarded: m.firstClearRewarded || won,
  };
  return {
    version: 1,
    updatedAt: now,
    meta,
    history: [
      ...save.history,
      {
        id,
        state: run.state,
        kept,
        elapsed: run.elapsed,
        reason: run.failure,
        measurements: run.measurements,
      },
    ].slice(-100),
    rewards: meta.firstClearRewarded ? { xp: 100, prisms: 1 } : { xp: 0, prisms: 0 },
  };
}
