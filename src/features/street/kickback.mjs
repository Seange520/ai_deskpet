import { adaptAction, caseClues, dodgeFault } from '../resonance/resonance.mjs';
import { detectReactions } from './reactions.mjs';
// Explicit reduced-order teaching model, not a component rating or SPICE claim.
export const KICKBACK = Object.freeze({
  supply: 24,
  inductance: 0.12,
  resistance: 24,
  interruption: 0.0005,
  breakdown: 60,
  diodeDrop: 0.7,
  snubberR: 10,
  snubberC: 0.00047,
  coupling: 0.006,
  controllerLimit: 5.8,
  resetSeconds: 0.5,
  protectionEnergy: 0.12,
  cycleSeconds: 1.2,
  lessonSeconds: 30,
  requiredOpenings: 10,
  origin: [12.2, 0, -0.3],
  range: 1.85,
});
export const KICKBACK_SAVE = 'sparkmate.seventh-checksum.kickback.v1';
export const HYPOTHESES = Object.freeze([
  { id: 'supply', text: '持续供电不足可能影响控制屏。' },
  { id: 'transient', text: '开关分断的瞬态可能耦合到控制支路。' },
  { id: 'return', text: '工作回流接点可能存在异常压降。' },
]);
export const KICKBACK_PROBES = Object.freeze([
  { id: 'K1', label: 'K1 · 开关端', position: [11.72, 1.15, -1.33] },
  { id: 'M2', label: 'M2 · 串联测量口', position: [12.63, 0.7, -1.3] },
  { id: 'U1', label: 'U1 · 5V 控制支路', position: [11.78, 1.95, -1.32] },
  { id: 'D1', label: 'D1 · 支路测试座', position: [12.45, 1.55, -1.31] },
]);
const range = (id, label, max, unit, kind) => Object.freeze({ id, label, max, unit, kind });
export const LENSES = Object.freeze(
  [
    {
      id: 'voltage',
      label: '直流电压 · 势差',
      ranges: [range('20V', '20 V', 20, 'V'), range('600V', '600 V', 600, 'V')],
    },
    {
      id: 'continuity',
      label: '通断 · 连心',
      ranges: [range('2ohm', '2 Ω', 2, 'Ω'), range('200ohm', '200 Ω', 200, 'Ω')],
    },
    {
      id: 'ac',
      label: '交流电压 · 波纹',
      ranges: [range('200mV', '200 mV', 0.2, 'V'), range('20Vac', '20 V', 20, 'V')],
    },
    {
      id: 'current',
      label: '电流 · 流脉',
      ranges: [range('200mA', '200 mA', 0.2, 'A'), range('10A', '10 A', 10, 'A')],
    },
    {
      id: 'resistance',
      label: '电阻 · 阻壁',
      ranges: [range('20ohm', '20 Ω', 20, 'Ω'), range('2kohm', '2 kΩ', 2000, 'Ω')],
    },
    {
      id: 'diode',
      label: '二极管/电容 · 单向门',
      ranges: [
        range('2Vd', '二极管 2 V', 2, 'V', 'diode'),
        range('6Vd', '二极管 6 V', 6, 'V', 'diode'),
        range('200uF', '电容 200 µF', 200, 'µF', 'capacitance'),
        range('2000uF', '电容 2000 µF', 2000, 'µF', 'capacitance'),
      ],
    },
  ].map((lens) => Object.freeze({ ...lens, ranges: Object.freeze(lens.ranges) })),
);
export const LESSON = Object.freeze([
  {
    phenomenon: '开关响过，指示灯紧接着暗一下。',
    condition: '感性负载的电流被快速改变。',
    principle: '磁场储能不能瞬间消失：E = ½LI²。',
  },
  {
    phenomenon: '相邻控制屏在分断瞬间复位。',
    condition: '瞬态电压超过接口可承受窗口。',
    principle: '电流变化越快，L·di/dt 对应的电压越高。',
  },
  {
    phenomenon: '重复异常后，支路停止响应。',
    condition: '超阈事件持续积累应力。',
    principle: '保护限制继续暴露；检修必须先隔离并确认余压。',
  },
]);
export function freshKickback() {
  return {
    clock: 0,
    open: false,
    courseOpen: false,
    lessonSeconds: 0,
    lessonPassed: false,
    hypotheses: [],
    evidence: {},
    diagnosed: false,
    repair: 'none',
    diodeFault: 'missing',
    powered: true,
    closed: true,
    residualVoltage: 0,
    protected: false,
    stressEnergy: 0,
    absorbedEnergy: 0,
    lastEvent: null,
    cycleTime: null,
    verifying: false,
    verified: 0,
    openings: 0,
    resets: 0,
    pulse: 0,
    focus: 100,
    scanner: false,
    blurSeconds: 0,
    mode: 'voltage',
    range: '600V',
    leads: 'forward',
    meterFuse: 'intact',
    penalty: 0,
    reading: null,
    selectedProbe: null,
    reactions: [],
    completed: false,
    rewardClaimed: false,
    xp: 0,
    prisms: 0,
    dialogue: '',
    message: '开关响过之后，控制屏才黑一下。先观察它们的先后。',
  };
}
export function currentAt(t, params = KICKBACK) {
  return (
    (params.supply / params.resistance) *
    (1 - Math.exp((-Math.max(0, t) * params.resistance) / params.inductance))
  );
}
export function dischargeCurrentAt(t, initial = 1, params = KICKBACK) {
  return Math.max(
    0,
    (initial + params.diodeDrop / params.resistance) *
      Math.exp((-Math.max(0, t) * params.resistance) / params.inductance) -
      params.diodeDrop / params.resistance,
  );
}
export function openingEvent(s, params = KICKBACK) {
  const current = currentAt(0.6, params),
    energy = 0.5 * params.inductance * current * current;
  const clamped = ['diode', 'rc'].includes(s.repair);
  const peak =
    s.repair === 'diode'
      ? params.supply + params.diodeDrop
      : s.repair === 'rc'
        ? params.supply +
          current * (Math.sqrt(params.inductance / params.snubberC) + params.snubberR)
        : params.supply + (params.inductance * current) / params.interruption;
  const coupledPeak = 5 + Math.max(0, peak - params.supply) * params.coupling;
  return {
    inductiveOpening: true,
    clamped,
    current,
    energy,
    peak,
    coupledPeak,
    breakdown: params.breakdown,
    failed: peak > params.breakdown || coupledPeak > params.controllerLimit,
  };
}
// AC-coupled RMS of the deliberately slowed rectangular observation envelope.
// This is a held cycle measurement, not a handheld meter capturing a 0.5ms edge.
export function rippleRms(event, node = 'U1', params = KICKBACK) {
  if (!event) return 0.03;
  if (node === 'U1') {
    if (!event.failed) return 0.03;
    const duty = params.resetSeconds / params.cycleSeconds;
    return 5 * Math.sqrt(duty * (1 - duty));
  }
  const duty = params.interruption / params.cycleSeconds;
  return Math.hypot(0.04, Math.max(0, event.peak - params.supply) * Math.sqrt(duty * (1 - duty)));
}
function applyOpening(s) {
  const e = openingEvent(s),
    failed = e.failed;
  const stressEnergy = s.stressEnergy + (failed ? e.energy * (1 - KICKBACK.breakdown / e.peak) : 0);
  const reactions = [...new Set([...s.reactions, ...detectReactions(e, s.lessonPassed)])];
  const verified = s.verifying ? (failed ? 0 : s.verified + 1) : s.verified;
  const completed = s.verifying && verified >= KICKBACK.requiredOpenings;
  const protectedNow = stressEnergy >= KICKBACK.protectionEnergy;
  return {
    ...s,
    lastEvent: e,
    closed: false,
    pulse: failed ? KICKBACK.resetSeconds : 0.15,
    openings: s.openings + 1,
    resets: s.resets + Number(failed),
    stressEnergy,
    absorbedEnergy: s.absorbedEnergy + (e.clamped ? e.energy : 0),
    reactions,
    verified,
    protected: protectedNow,
    powered: !protectedNow && s.powered,
    verifying: s.verifying && !failed && !completed,
    completed,
    scanner: completed ? false : s.scanner,
    message: completed
      ? '连续 10 次分断均在耐受窗口内，验收完成。'
      : protectedNow
        ? '超阈能量累积，支路进入保护。先隔离、放电，再检查。'
        : failed
          ? '分断瞬间捕获尖峰，控制屏复位，指示灯瞬断。'
          : '本次分断未越过耐受窗口。',
    dialogue: completed ? '十次开关都响过了，灯一直亮着，冷柜也没再停。' : s.dialogue,
  };
}
function evidenceKey(r) {
  if (r.mode === 'diode' && r.kind === 'capacitance') return `${r.node}:capacitance`;
  if (r.mode === 'diode' && r.leads === 'reverse') return `${r.node}:diode-reverse`;
  return `${r.node}:${r.mode}`;
}
function diagnosticEvidence(e) {
  const keys = ['K1:voltage', 'U1:ac', 'M2:current', 'M2:resistance', 'K1:continuity', 'D1:diode'];
  return (
    keys.every((k) => e[k]) &&
    e['K1:voltage'].event === true &&
    e['K1:voltage'].value > 60 &&
    e['U1:ac'].event === true &&
    e['U1:ac'].value > 0.2 &&
    e['M2:current'].value > 0.2 &&
    e['M2:resistance'].value > 20 &&
    e['M2:resistance'].value < 30 &&
    e['K1:continuity'].value < 1 &&
    e['D1:diode'].status === 'open' &&
    e['D1:diode'].leads === 'forward'
  );
}
const say = (s, message) => ({ ...s, message });
const safe = (s) => !s.powered && s.residualVoltage < 1.5;
function validHypotheses(values) {
  return [
    ...new Set(
      Array.isArray(values) ? values.filter((id) => HYPOTHESES.some((h) => h.id === id)) : [],
    ),
  ].slice(0, 3);
}
function readingFor(s, id, selected) {
  const e = s.lastEvent,
    live = s.powered;
  let value = 0,
    status = 'ok',
    detail = '',
    unit = selected.unit;
  if (s.mode === 'voltage') {
    value = !live
      ? s.residualVoltage
      : id === 'K1'
        ? (e?.peak ?? (s.closed ? 0.08 : 24))
        : id === 'U1'
          ? (e?.coupledPeak ?? 5)
          : 24;
    detail =
      e && live
        ? '峰值保持：最近一次分断；包含先后关系的采样记录。'
        : '当前端电压。尚未记录分断时，不推断尖峰。';
  } else if (s.mode === 'ac') {
    value = !live ? 0 : rippleRms(e, id);
    detail = '交流耦合包络 RMS 保持：最近一次分断周期；不是高速示波器采样。';
  } else if (s.mode === 'current') {
    value = live && s.closed ? currentAt(0.6) : 0;
    detail = 'M2 预置串联测量口；电流表不得跨接电源。';
  } else if (s.mode === 'resistance' || s.mode === 'continuity') {
    value = id === 'M2' ? KICKBACK.resistance : 0.08;
    detail =
      s.mode === 'continuity'
        ? value < 1
          ? '蜂鸣：工作回流/接点连通。0V 回流不是 PE。'
          : '存在路径，但不满足低阻蜂鸣窗口。'
        : '离线等效电阻；通断不能代替阻值与带载检查。';
  } else if (selected.kind === 'capacitance') {
    value = s.repair === 'rc' ? KICKBACK.snubberC * 1e6 : 0;
    detail = '离线电容检测；先隔离并确认余压。';
  } else {
    const conducting = s.repair === 'diode' && s.leads === 'forward';
    value = conducting ? KICKBACK.diodeDrop : null;
    status = conducting ? 'ok' : 'open';
    detail = 'OL 表示此方向未导通，需比较两个方向；不直接指认故障元件。';
  }
  if (value !== null && value > selected.max) status = 'overflow';
  return {
    node: id,
    mode: s.mode,
    kind: selected.kind ?? null,
    range: selected.id,
    value,
    status,
    unit,
    detail,
    powered: live,
    leads: s.leads,
    event: e?.failed ?? null,
  };
}
function baselineActKickback(s, a) {
  if (a.type === 'enter') return s.lessonPassed ? { ...s, open: true } : { ...s, courseOpen: true };
  if (a.type === 'close') return { ...s, open: false, courseOpen: false, scanner: false };
  if (a.type === 'lesson') {
    if (s.lessonSeconds < KICKBACK.lessonSeconds) return say(s, '请先完成 30 秒观察微课。');
    if (a.answer !== 'release') return say(s, '再想想：电流停下之前，磁场中的储能在哪里？');
    return {
      ...s,
      lessonPassed: true,
      courseOpen: false,
      open: true,
      message: '观察记录已记下。先列出 2–3 条假设，再用测量比较。',
    };
  }
  if (!s.lessonPassed) return say(s, '先完成观察微课，才能操作检修仪表。');
  if (a.type === 'hypotheses') {
    const hypotheses = validHypotheses(a.values);
    return hypotheses.length < 2
      ? say(s, '记录 2–3 条待验证假设；这里不评判对错。')
      : { ...s, hypotheses, message: '假设已记录，不评判对错。接下来逐项测量。' };
  }
  if (a.type === 'scanner') return { ...s, scanner: !s.scanner };
  if (a.type === 'mode') {
    const mode = LENSES.find((m) => m.id === a.mode);
    return mode
      ? {
          ...s,
          mode: mode.id,
          range: mode.ranges[mode.ranges.length > 2 ? 0 : 1].id,
          reading: null,
        }
      : s;
  }
  if (a.type === 'range')
    return LENSES.find((m) => m.id === s.mode).ranges.some((r) => r.id === a.range)
      ? { ...s, range: a.range, reading: null }
      : s;
  if (a.type === 'leads')
    return ['forward', 'reverse'].includes(a.value) ? { ...s, leads: a.value, reading: null } : s;
  if (a.type === 'isolate')
    return {
      ...s,
      powered: false,
      closed: false,
      verifying: false,
      verified: 0,
      cycleTime: null,
      residualVoltage: s.powered ? 24 : s.residualVoltage,
      message: '已隔离。等待余压低于 1.5V，再做离线检修。',
    };
  if (a.type === 'releaseProtection')
    return safe(s)
      ? {
          ...s,
          protected: false,
          stressEnergy: 0,
          message: '保护已复位；电源仍隔离，尚未证明故障消失。',
        }
      : say(s, '先隔离，并确认余压已释放。');
  if (a.type === 'energize')
    return s.protected
      ? say(s, '支路仍在保护。先隔离并复位保护。')
      : { ...s, powered: true, closed: true, residualVoltage: 0, message: '控制支路恢复供电。' };
  if (a.type === 'cycle') {
    if (!s.powered || s.protected || s.cycleTime !== null || s.verifying)
      return say(s, '需供电正常且没有正在进行的校验。');
    return {
      ...s,
      closed: true,
      cycleTime: 0,
      message: 'K1 闭合，随后分断；观察控制屏与灯的先后。',
    };
  }
  if (a.type === 'measure') {
    if (!s.scanner || s.focus < 6 || !KICKBACK_PROBES.some((p) => p.id === a.id))
      return say(s, '开启检修视野，并保持至少 6 点专注。');
    const n = { ...s, focus: s.focus - 6, selectedProbe: a.id };
    if (['continuity', 'resistance', 'diode'].includes(s.mode) && !safe(s))
      return {
        ...n,
        reading: { status: 'blocked', detail: '带电或余压未释放：禁止离线量测。' },
        message: '联锁拦截：断电、放电后再用通断/电阻/二极管档。',
      };
    if (s.mode === 'current' && s.meterFuse === 'blown')
      return { ...n, reading: { status: 'fuse', detail: '电流档保险丝已断；隔离后更换。' } };
    const selected = LENSES.find((m) => m.id === s.mode).ranges.find((r) => r.id === s.range);
    const reading = readingFor(s, a.id, selected);
    const badCurrent =
      s.mode === 'current' && s.powered && (a.id !== 'M2' || reading.value > selected.max);
    if (badCurrent)
      return {
        ...n,
        meterFuse: 'blown',
        penalty: Math.min(12, s.penalty + 4),
        reading: {
          ...reading,
          status: 'fuse',
          detail: '电流档误跨接或量程不足，仪表保险保护；无资源扣罚。',
        },
        reactions: [
          ...new Set([
            ...s.reactions,
            ...detectReactions({ shortCircuit: a.id !== 'M2', meterFuseTripped: true }, true),
          ]),
        ],
        message: '仪表保险丝动作。损失仅限本次测量；可免费断电更换。',
      };
    if (reading.status === 'overflow')
      return {
        ...n,
        reading,
        penalty: Math.min(12, s.penalty + 2),
        message: 'OL：量程不足。换合适量程后重新取得证据。',
      };
    const meaningful =
      s.mode === 'voltage'
        ? s.powered && !!s.lastEvent
        : s.mode === 'current'
          ? s.powered && s.closed && reading.value > 0
          : s.mode === 'ac'
            ? s.powered && !!s.lastEvent
            : safe(s);
    const key = evidenceKey(reading);
    return {
      ...n,
      reading,
      evidence: meaningful ? { ...s.evidence, [key]: reading } : s.evidence,
      message: meaningful
        ? '已记录读数与测量条件；比较不同测点的时序。'
        : '已读数，但当前条件不足以支持分断故障的证据。',
      dialogue:
        s.mode === 'ac' && a.id === 'U1' ? '每次开关响过，屏上的波纹才跳起来。' : s.dialogue,
    };
  }
  if (a.type === 'replaceMeterFuse')
    return safe(s)
      ? { ...s, meterFuse: 'intact', message: '已更换同规格仪表保险，电源仍隔离。' }
      : say(s, '禁止带电更换仪表保险；先隔离并确认余压。');
  if (a.type === 'diagnose') {
    if (s.hypotheses.length < 2 || !diagnosticEvidence(s.evidence))
      return say(s, '还需假设记录和六类有效测量；溢出与联锁拦截不算证据。');
    return a.cause === 'back-emf'
      ? {
          ...s,
          diagnosed: true,
          message: '证据支持：分断反峰引起接口过压；离线比较钳位支路后再选择修复。',
        }
      : say(s, '当前的分断时序与读数不能支持这个诊断。');
  }
  if (a.type === 'install') {
    if (!safe(s)) return say(s, '带电安装被联锁拦截；先隔离、确认余压。');
    if (!s.diagnosed) return say(s, '先完成可复核的诊断记录。');
    if (a.part === 'diode' && a.polarity !== 'cathode-positive')
      return say(s, '极性联锁拦截：阴极应接 +24V 侧，禁止反装。');
    if (!['diode', 'rc'].includes(a.part)) return s;
    return {
      ...s,
      repair: a.part,
      reading: null,
      verified: 0,
      message:
        a.part === 'diode'
          ? '已按正确极性安装续流支路，尚需 10 次分断验证。'
          : '已安装串联 RC 吸收支路，尚需 10 次分断验证。',
    };
  }
  if (a.type === 'verify') {
    if (s.completed) return say(s, '本切片已验收，奖励不会重复发放。');
    if (!s.powered || s.protected || !s.diagnosed || !['diode', 'rc'].includes(s.repair))
      return say(s, '需完成断电修复、复位保护并恢复供电。');
    return {
      ...s,
      verifying: true,
      verified: 0,
      closed: true,
      cycleTime: 0,
      message: '开始连续 10 次分断，不跳过任何一次超阈检查。',
    };
  }
  if (a.type === 'talk')
    return {
      ...s,
      dialogue: s.completed
        ? '十次开关都响过了，灯一直亮着，冷柜也没再停。'
        : s.evidence['U1:ac']
          ? '每次开关响过，屏上的波纹才跳起来。'
          : '开关响过之后，控制屏才黑一下。',
    };
  if (a.type === 'dismissDialogue') return { ...s, dialogue: '' };
  return s;
}
function baselineAdvanceKickback(s, dt) {
  if (!Number.isFinite(dt) || dt <= 0) return s;
  let n = {
    ...s,
    clock: s.clock + dt,
    pulse: Math.max(0, s.pulse - dt),
    blurSeconds: Math.max(0, s.blurSeconds - dt),
    focus: Math.max(0, Math.min(100, s.focus + (s.scanner ? -5 : 10) * dt)),
    residualVoltage: s.powered ? 0 : s.residualVoltage * Math.exp(-dt / 0.12),
  };
  if (s.courseOpen && !s.lessonPassed) n.lessonSeconds = Math.min(30, s.lessonSeconds + dt);
  if (s.scanner && n.focus === 0) {
    n.scanner = false;
    n.blurSeconds = 3;
    n.message = '专注耗尽，暂停观察并整理记录。';
  }
  if (s.cycleTime !== null && s.powered && s.lessonPassed) {
    n.cycleTime += dt;
    if (s.cycleTime < 0.6 && n.cycleTime >= 0.6) n = applyOpening(n);
    if (n.cycleTime >= KICKBACK.cycleSeconds || !n.powered || n.completed) {
      n.cycleTime = n.verifying ? 0 : null;
      n.closed = n.verifying;
    }
  }
  if (n.completed && !s.rewardClaimed) {
    n.rewardClaimed = true;
    n.xp = 100;
    n.prisms = 1;
  }
  return n;
}
export function serializeKickback(s) {
  return JSON.stringify({
    schemaVersion: 1,
    lessons: s.lessonPassed ? ['lesson:back-emf'] : [],
    hypotheses: s.hypotheses,
    evidence: s.evidence,
    diagnosed: s.diagnosed,
    repair: s.repair,
    completed: s.completed,
    verified: s.completed ? 10 : 0,
    rewardClaimed: s.rewardClaimed,
  });
}
export function restoreKickback(raw) {
  if (typeof raw !== 'string' || raw.length > 65536) return freshKickback();
  const s = freshKickback();
  try {
    const data = JSON.parse(raw);
    if (!data || data.schemaVersion !== 1) return s;
    s.lessonPassed = Array.isArray(data.lessons) && data.lessons.includes('lesson:back-emf');
    s.hypotheses = validHypotheses(data.hypotheses);
    if (
      s.lessonPassed &&
      data.evidence &&
      typeof data.evidence === 'object' &&
      !Array.isArray(data.evidence)
    ) {
      for (const [key, e] of Object.entries(data.evidence)) {
        if (
          e &&
          typeof e === 'object' &&
          KICKBACK_PROBES.some((p) => p.id === e.node) &&
          LENSES.some((m) => m.id === e.mode && m.ranges.some((r) => r.id === e.range)) &&
          ['ok', 'open'].includes(e.status) &&
          (e.value === null || Number.isFinite(e.value)) &&
          key === evidenceKey(e)
        )
          s.evidence[key] = e;
      }
    }
    s.diagnosed =
      s.lessonPassed &&
      s.hypotheses.length >= 2 &&
      diagnosticEvidence(s.evidence) &&
      data.diagnosed === true;
    s.repair = s.diagnosed && ['diode', 'rc'].includes(data.repair) ? data.repair : 'none';
    s.completed =
      s.diagnosed &&
      s.repair !== 'none' &&
      data.completed === true &&
      data.verified === 10 &&
      data.rewardClaimed === true;
    s.verified = s.completed ? 10 : 0;
    s.rewardClaimed = s.completed;
    s.xp = s.completed ? 100 : 0;
    s.prisms = s.completed ? 1 : 0;
    if (s.repair !== 'none') {
      s.powered = s.completed;
      s.closed = s.completed;
    }
    s.message = s.completed ? '十次分断的验收记录还在，奖励已领取。' : s.message;
  } catch {
    /* Malformed or inaccessible saves cannot unlock content. */
  }
  return s;
}

export function actKickback(s,a,mods){return adaptAction(s,baselineActKickback(s,a),a,mods);}
export function advanceKickback(s,dt,mods){
 if(mods?.dodge&&s.powered&&s.cycleTime!==null&&s.cycleTime<0.6&&s.cycleTime+dt>=0.6&&openingEvent(s).failed){const dodged=dodgeFault(s,mods);if(dodged)return {...dodged,cycleTime:null,closed:false,residualVoltage:24};}
 return caseClues(baselineAdvanceKickback(s,dt),mods,'kickback');
}
