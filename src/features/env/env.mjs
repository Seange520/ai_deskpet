export const ENV_KEY = 'sparkmate.seventh-checksum.envstory.v1';
export const REPORT_LINE = '我就说嘛，灯不会杀人，人会。';
export const EVIDENCE = ['ground_break', 'shared_ground', 'drop_abnormal', 'terminal_rust'];
export const MEMORY_LIMIT = 32;
export const ENV_CLUES = [
  [
    'clue_lamp_flicker',
    '路灯每7秒频闪',
    '负载周期变化会改变电压。',
    '灯光保留着重复的节拍。',
    '灯杆接线盒',
    'voltage',
    7.02,
    's',
    '记录周期电压包络，7±0.2秒',
  ],
  [
    'clue_pump_dip',
    '压缩机启动时街灯变暗',
    '电流增大会增加线路压降。',
    '街上的负载挤在同一时刻。',
    '配电箱M1端子',
    'voltage',
    1.42,
    'V',
    '比较启动与稳态压差',
  ],
  [
    'clue_cat_alley',
    '猫总绕开东侧小巷',
    '地面电位差可能令人不适。',
    '小巷口的脚步总绕一个弯。',
    '巷口地面电位',
    'voltage',
    2.1,
    'V',
    '比较地面与参考地电位',
  ],
  [
    'clue_clock_drift',
    '钟楼每天慢0.7秒',
    '时基漂移会累积计时误差。',
    '钟声和街上的脚步渐渐错开。',
    '钟楼控制柜',
    'voltage',
    0.7,
    's/day',
    '两次整点记录：0秒与24小时后-0.7秒',
  ],
  [
    'clue_flower_half',
    '花坛只有一半开花',
    '传感电压异常会影响灌溉。',
    '街上的照料只到了一半。',
    '花坛传感节点',
    'voltage',
    0.15,
    'V',
    '比较两侧节点：0.15V与2.4V',
  ],
].map(([id, phenomenon, explanation, hint, probe, mode, value, unit, learning]) => ({
  id,
  phenomenon,
  explanation,
  hint,
  probe,
  mode,
  value,
  unit,
  learning,
}));
export const DEFERRED_CLUES = ['收音机杂音', '门把手静电', '屏幕条纹', '广告牌打火', '收音机重复'];
export const CASE_SEVEN_LAMPS = Object.freeze({
  id: 'seven_lamps',
  title: '七盏灯谋杀案',
  supply: 24,
  load: 0.8,
  lamps: Array.from({ length: 7 }, (_, i) => ({
    id: 'L' + (i + 2),
    position: [6 + i * 1.18, 0, 1.28],
    resistance: 0.02 + i * 0.005,
    dimAt: (6 - i) * 1.0,
  })),
});
export function freshEnv(now = Date.now()) {
  return {
    version: 1,
    updatedAt: new Date(now).toISOString(),
    clues: {},
    case: {
      state: 'open',
      evidence: [],
      fixApplied: false,
      verifiedSeconds: 0,
      closedAt: null,
      reportLine: REPORT_LINE,
    },
    board: { pins: [], hypotheses: [] },
    npcReactions: { vendor: null, hefi: null, inspector: null },
    eagleEye: { rememberedLines: [] },
    rewards: { xp: 0, prisms: 0, granted: false },
    history: [],
  };
}
export function rememberLine(lines, id) {
  return [...new Set([...lines, id])].slice(-MEMORY_LIMIT);
}
export function lampBrightness(id, time, fixed = false) {
  if (fixed) return 1;
  const lamp = CASE_SEVEN_LAMPS.lamps.find((l) => l.id === id);
  if (!lamp) return 0;
  const phase = ((time % 14) + 14) % 14;
  return phase < lamp.dimAt ? 1 : phase < lamp.dimAt + 0.6 ? 0.35 : 0.08;
}
// Probe IDs identify the two physical terminals; no UI action can supply evidence.
export function measureEnvClue(id, probe, mode, state) {
  const s = state.save || state,
    powered = state.powered !== false;
  const blocked = { ok: false, message: '当前档位或测点不适用。' };
  const clue = ENV_CLUES.find((c) => c.id === id);
  if (clue) {
    if (probe !== clue.probe || mode !== clue.mode || !powered) return blocked;
    return {
      ok: true,
      target: id,
      category: 'phenomenon',
      value: clue.value,
      unit: clue.unit,
      line: id,
      detail: clue.learning,
      samples:
        id === 'clue_clock_drift'
          ? [
              { t: 0, value: 0 },
              { t: 86400, value: -0.7 },
            ]
          : id === 'clue_flower_half'
            ? [0.15, 2.4]
            : id === 'clue_pump_dip'
              ? [24, 22.58]
              : id === 'clue_lamp_flicker'
                ? [0, 7.02, 14.04]
                : [0, 2.1],
    };
  }
  if (!CASE_SEVEN_LAMPS.lamps.some((l) => l.id === id)) return blocked;
  if (['continuity', 'resistance', 'inspect'].includes(mode) && powered)
    return { ok: false, message: '禁止带电检测；先断电隔离。' };
  const base = { ok: true, target: id, category: mode, line: 'lamp_' + id };
  if (mode === 'continuity' && probe === 'ground') {
    const open = id === 'L8' && !s.case.fixApplied;
    return {
      ...base,
      value: open ? 'OL' : 0.03,
      unit: 'Ω',
      evidence: open ? 'ground_break' : null,
    };
  }
  if (mode === 'resistance' && probe === 'chain') {
    return {
      ...base,
      value:
        id === 'L8' && !s.case.fixApplied
          ? 'OL'
          : CASE_SEVEN_LAMPS.lamps.find((l) => l.id === id).resistance,
      unit: 'Ω',
      evidence: id !== 'L8' ? 'shared_ground' : null,
    };
  }
  if (mode === 'voltage' && probe === 'socket' && powered) {
    const value = s.case.fixApplied ? 0.18 : id === 'L8' ? 1.42 : 0.24;
    return {
      ...base,
      value,
      unit: 'V',
      evidence: value > 1.2 ? 'drop_abnormal' : null,
      load: CASE_SEVEN_LAMPS.load,
    };
  }
  if (mode === 'inspect' && probe === 'terminal' && id === 'L8')
    return {
      ...base,
      value: '接地排氧化；第七根线从端子根部断开。',
      unit: '',
      evidence: 'terminal_rust',
    };
  return blocked;
}
export function npcReaction(previous, measurement, now = Date.now()) {
  if (!measurement?.ok) return null;
  const trigger = measurement.category + ':' + measurement.target;
  if (previous?.triggers?.[trigger] !== undefined && now - previous.triggers[trigger] < 86400000)
    return null;
  return { lastTrigger: trigger, at: now, triggers: { ...previous?.triggers, [trigger]: now } };
}
export function runtime(save = freshEnv()) {
  return {
    save,
    powered: true,
    reviewed: false,
    verifying: false,
    reading: null,
    lastMeasurement: null,
    message: '先看现象，再留读数。',
  };
}
function record(s, event, now) {
  s.updatedAt = new Date(now).toISOString();
  const all = [...s.history, event];
  const protectedKeys = new Set(),
    keep = new Set();
  all.forEach((h, i) => {
    const key =
      h.type === 'measurement'
        ? [h.type, h.target, h.category, h.probe, h.evidence].join(':')
        : h.type;
    if (!protectedKeys.has(key)) {
      protectedKeys.add(key);
      keep.add(i);
    }
  });
  s.history = all.filter((h, i) => keep.has(i) || i >= all.length - 400).slice(-512);
}
export function actEnv(state, event, now = Date.now()) {
  if (state.save.case.state === 'closed') {
    if (event.type === 'measure')
      return { ...state, reading: measureEnvClue(event.id, event.probe, event.mode, state) };
    return state;
  }
  const n = { ...state, save: structuredClone(state.save) },
    s = n.save;
  if (event.type === 'measure') {
    let r = measureEnvClue(event.id, event.probe, event.mode, n);
    if (r.ok && typeof r.value === 'number' && Number.isFinite(event.max) && r.value > event.max)
      r = { ok: false, message: 'OL · 量程溢出' };
    n.reading = r;
    n.message = r.ok ? '测量已记录。' : r.message;
    if (!r.ok) return n;
    n.lastMeasurement = r;
    if (ENV_CLUES.some((c) => c.id === event.id))
      s.clues[event.id] = { found: true, measuredAt: new Date(now).toISOString(), value: r.value };
    s.eagleEye.rememberedLines = rememberLine(s.eagleEye.rememberedLines, r.line);
    record(s, { type: 'measurement', at: now, ...r, probe: event.probe, mode: event.mode }, now);
    const allGrounds = CASE_SEVEN_LAMPS.lamps.every((l) =>
      s.history.some(
        (h) => h.type === 'measurement' && h.target === l.id && h.category === 'continuity',
      ),
    );
    if (r.evidence && (r.evidence !== 'ground_break' || allGrounds))
      s.case.evidence = [...new Set([...s.case.evidence, r.evidence])];
    // L8 may be measured before the other six.
    if (allGrounds && s.history.some((h) => h.evidence === 'ground_break'))
      s.case.evidence = [...new Set([...s.case.evidence, 'ground_break'])];
    if (s.case.state === 'open') s.case.state = 'evidence';
    if (
      s.case.fixApplied &&
      !n.powered &&
      r.target === 'L8' &&
      r.category === 'continuity' &&
      r.value !== 'OL'
    )
      n.reviewed = true;
  } else if (event.type === 'isolate') {
    n.powered = false;
    n.verifying = false;
    n.reviewed = false;
    s.case.verifiedSeconds = 0;
    n.message = '支路已隔离。';
  } else if (event.type === 'wire') {
    if (n.powered) {
      n.message = '带电接线已被联锁拦截。';
      return n;
    }
    if (!EVIDENCE.every((e) => s.case.evidence.includes(e))) {
      n.message = '证据还不足以结案';
      return n;
    }
    s.case.fixApplied = true;
    s.case.state = 'fixed';
    n.reviewed = false;
    n.message = '已补独立接地线：L8灯座 → G0回流接点。';
    s.eagleEye.rememberedLines = rememberLine(s.eagleEye.rememberedLines, 'g0_return');
  } else if (event.type === 'power') {
    if (!s.case.fixApplied || !n.reviewed) {
      n.message = '送电前需要离线通断复核。';
      return n;
    }
    n.powered = true;
    n.verifying = true;
    n.message = '负载观察中；需逐盏测量灯座压差。';
    s.case.verifiedSeconds = 0;
  } else if (event.type === 'close') {
    if (
      !EVIDENCE.every((e) => s.case.evidence.includes(e)) ||
      s.case.verifiedSeconds < 10 ||
      !s.case.fixApplied
    ) {
      n.message = '证据还不足以结案';
      return n;
    }
    s.case.state = 'closed';
    s.case.closedAt = s.case.closedAt || new Date(now).toISOString();
    if (!s.rewards.granted) s.rewards = { xp: 100, prisms: 1, granted: true };
    n.verifying = false;
    n.message = REPORT_LINE;
  } else return state;
  if (event.type !== 'measure') record(s, { type: event.type, at: now }, now);
  return n;
}
export function advanceCase(state, dt) {
  if (
    !Number.isFinite(dt) ||
    dt <= 0 ||
    !state.verifying ||
    !state.powered ||
    !state.save.case.fixApplied
  )
    return state;
  const since = [...state.save.history].reverse().find((h) => h.type === 'power')?.at;
  const loaded = CASE_SEVEN_LAMPS.lamps.every((l) =>
    state.save.history.some(
      (h) =>
        h.type === 'measurement' &&
        h.at >= since &&
        h.target === l.id &&
        h.category === 'voltage' &&
        h.load > 0 &&
        h.value <= 0.3,
    ),
  );
  if (!loaded) return state;
  const save = structuredClone(state.save);
  save.case.verifiedSeconds = Math.min(10, save.case.verifiedSeconds + dt);
  return {
    ...state,
    save,
    message: '负载压差≤0.3V · ' + save.case.verifiedSeconds.toFixed(1) + ' / 10秒',
  };
}
export function restoreEnv(raw) {
  try {
    const s = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (
      !s ||
      s.version !== 1 ||
      !Number.isFinite(Date.parse(s.updatedAt)) ||
      !s.clues ||
      !Array.isArray(s.history) ||
      s.history.length > 512 ||
      !['locked', 'open', 'evidence', 'fixed', 'closed'].includes(s.case?.state) ||
      s.case.reportLine !== REPORT_LINE ||
      !Array.isArray(s.case.evidence) ||
      s.case.evidence.some((e) => !EVIDENCE.includes(e)) ||
      typeof s.case.fixApplied !== 'boolean' ||
      !Number.isFinite(s.case.verifiedSeconds) ||
      s.case.verifiedSeconds < 0 ||
      s.case.verifiedSeconds > 10 ||
      !Array.isArray(s.board?.pins) ||
      !Array.isArray(s.board?.hypotheses) ||
      !s.npcReactions ||
      !Array.isArray(s.eagleEye?.rememberedLines) ||
      s.eagleEye.rememberedLines.length > MEMORY_LIMIT ||
      typeof s.rewards?.granted !== 'boolean'
    )
      return freshEnv();
    if (
      Object.keys(s.clues).some(
        (id) =>
          !ENV_CLUES.some((c) => c.id === id) ||
          s.clues[id]?.found !== true ||
          !Number.isFinite(Date.parse(s.clues[id].measuredAt)) ||
          !Number.isFinite(s.clues[id].value),
      ) ||
      s.board.pins.length > 5 ||
      s.board.pins.some(
        (p) =>
          !ENV_CLUES.some((c) => c.id === p.clueId) ||
          !s.clues[p.clueId]?.found ||
          ![p.x, p.y].every((v) => Number.isFinite(v) && v >= 0 && v <= 1),
      ) ||
      s.board.hypotheses.length > 3 ||
      s.board.hypotheses.some(
        (h) => !['h1', 'h2', 'h3'].includes(h.id) || typeof h.text !== 'string',
      ) ||
      s.eagleEye.rememberedLines.some((l) => typeof l !== 'string') ||
      ['vendor', 'hefi', 'inspector'].some(
        (id) =>
          s.npcReactions[id] !== null &&
          (!s.npcReactions[id] ||
            typeof s.npcReactions[id].lastTrigger !== 'string' ||
            !Number.isFinite(s.npcReactions[id].at) ||
            !s.npcReactions[id].triggers),
      ) ||
      s.history.some((h) => !h || typeof h.type !== 'string' || !Number.isFinite(h.at))
    )
      return freshEnv();
    if (
      s.case.evidence.some(
        (e) => !s.history.some((h) => h.type === 'measurement' && h.ok && h.evidence === e),
      )
    )
      return freshEnv();
    if (
      s.rewards.granted &&
      (s.case.state !== 'closed' ||
        s.case.verifiedSeconds < 10 ||
        !s.case.fixApplied ||
        !EVIDENCE.every((e) => s.case.evidence.includes(e)) ||
        !Number.isFinite(Date.parse(s.case.closedAt)))
    )
      return freshEnv();
    if (
      s.rewards.xp !== (s.rewards.granted ? 100 : 0) ||
      s.rewards.prisms !== (s.rewards.granted ? 1 : 0)
    )
      return freshEnv();
    if (s.case.state === 'closed' && !s.rewards.granted) return freshEnv();
    return structuredClone(s);
  } catch {
    return freshEnv();
  }
}
