// Local 24 V training circuit. The 0 V return is never protective earth (PE).
// Fault energy and fuse I²t form an illustrative, deterministic thermal model.
export const STREET = Object.freeze({ origin: [8.6, 0, 0], range: 6.3, period: 7 });
export const PROBES = Object.freeze([
  { id: 'lamp', label: 'L1 · 路灯端子', position: [9.7, 2.45, -1.05] },
  { id: 'return', label: 'G0 · 回流接点', position: [8.15, 1.12, -1.48] },
  { id: 'motor', label: 'M1 · 压缩机', position: [10.9, 0.85, 1.48] },
]);
export const REWARD = Object.freeze({ xp: 120, prisms: 1 });
export function freshCircuit(completed = false) {
  return {
    clock: 1.2,
    focus: 100,
    scanner: false,
    mode: 'voltage',
    powered: true,
    returnFixed: completed,
    softStart: completed,
    fuse: 'intact',
    faultTime: null,
    heat: 0,
    fuseEnergy: 0,
    stage: 'idle',
    evidence: {},
    diagnoses: [],
    reading: null,
    verifying: false,
    verifiedSeconds: 0,
    completed,
    message: completed
      ? '路灯运行稳定。街角还记得你的检修。'
      : '接近熔炉外街，测量路灯与压缩机，找到周期性跌压的来源。',
  };
}
export function sampleCircuit(s) {
  const starting = s.clock % STREET.period < 1.05;
  const motorR = starting && !s.softStart ? 2.6 : 18;
  const loadR = 1 / (1 / 80 + 1 / motorR);
  const returnR = s.returnFixed ? 0.04 : 2.2;
  const live = s.powered && s.fuse === 'intact';
  const current = live ? (s.faultTime !== null ? 16 : 24 / (loadR + returnR + 0.18)) : 0;
  const voltage = live ? Math.max(0, 24 - current * (returnR + 0.18)) : 0;
  return { starting, current, voltage, returnR, returnDrop: current * returnR, live };
}
const say = (s, message) => ({ ...s, message });
export function actCircuit(s, action) {
  if (action.type === 'scanner') return { ...s, scanner: !s.scanner };
  if (action.type === 'mode' && ['continuity', 'voltage'].includes(action.mode))
    return { ...s, mode: action.mode, reading: null };
  if (action.type === 'isolate') {
    if (s.stage !== 'idle' && s.stage !== 'tripped')
      return say(s, '故障正在被保护器切断，等待保险丝动作后再检修。');
    return {
      ...s,
      powered: false,
      verifying: false,
      verifiedSeconds: 0,
      message: '电源已隔离。可用通断档测回流接点，再检修线路。',
    };
  }
  if (action.type === 'measure') {
    if (!s.scanner) return say(s, '先开启万用表检修视野。');
    if (!PROBES.some((p) => p.id === action.id)) return s;
    if (s.focus < 12) return say(s, '专注不足。关闭检修视野，整理假设后再测。');
    const next = { ...s, focus: s.focus - 12 };
    if (s.mode === 'continuity' && sampleCircuit(s).live)
      return {
        ...next,
        reading: {
          node: action.id,
          value: '禁止带电测通断',
          detail: '请先断电；电压档可用于带电诊断。',
        },
        message: '测量被安全联锁拦截，请先隔离电源。',
      };
    const key = `${action.id}:${s.mode}`;
    let value, detail;
    if (s.mode === 'voltage') {
      if (!sampleCircuit(s).live)
        return {
          ...next,
          reading: {
            node: action.id,
            value: '0.00 V',
            detail: '电源已断开，不能据此判断带电时的压降。',
          },
        };
      // Capture a full seven-second envelope, rather than requiring a lucky click.
      const samples = [sampleCircuit({ ...s, clock: 0 }), sampleCircuit({ ...s, clock: 2 })];
      const span = (key) =>
        samples
          .map((c) => c[key])
          .sort((a, b) => a - b)
          .map((v) => v.toFixed(2))
          .join('–') + ' V';
      if (action.id === 'lamp') {
        value = span('voltage');
        detail = '7 秒采样窗：压缩机启动时，灯端电压同步下陷。';
      } else if (action.id === 'return') {
        value = span('returnDrop');
        detail = '测回流接点两端压降；健康接点应接近 0 V。';
      } else {
        value = span('voltage');
        detail = s.softStart
          ? '软启动已限制启动电流，端电压稳定。'
          : '压缩机端电压下陷与启动同步；需抑制浪涌。';
      }
    } else {
      value =
        action.id === 'return'
          ? s.returnFixed
            ? '0.04 Ω · 蜂鸣'
            : '2.20 Ω · 接触异常'
          : '支路连通';
      detail =
        action.id === 'return'
          ? '此处是 24 V 系统的 0 V 工作回流，不是保护接地 PE。'
          : '离线连通只能说明路径存在，不能代替带载压降检查。';
    }
    return {
      ...next,
      evidence: { ...s.evidence, [key]: true },
      reading: { node: action.id, value, detail },
      message: '测量已记录。请比较灯端、回流与压缩机的证据。',
    };
  }
  if (action.type === 'diagnose') {
    const supported =
      action.cause === 'return'
        ? s.evidence['return:voltage'] && s.evidence['return:continuity']
        : action.cause === 'surge' && s.evidence['lamp:voltage'] && s.evidence['motor:voltage'];
    if (!supported) return say(s, '证据不足：回流故障需压降与离线通断；浪涌需比较路灯和压缩机。');
    return {
      ...s,
      diagnoses: [...new Set([...s.diagnoses, action.cause])],
      message:
        action.cause === 'return'
          ? '已确认：回流接点虚接（接地不良），存在异常压降。'
          : '已确认：压缩机启动浪涌造成瞬时过载。',
    };
  }
  if (action.type === 'jumper') {
    if (s.completed) return say(s, '线路已验收，请保留安全接线。');
    if (!sampleCircuit(s).live || s.stage !== 'idle')
      return say(s, '电源已切断或保护已动作。先安全检修，再考虑上电。');
    return {
      ...s,
      faultTime: 0,
      heat: 0,
      fuseEnergy: 0,
      stage: 'red',
      verifying: false,
      message: '错误跨接使供电短路！导线正在发热，延时保险丝开始累计 I²t。',
    };
  }
  if (action.type === 'replaceFuse') {
    if (s.powered) return say(s, '先隔离电源，禁止带电更换保险丝。');
    if (s.fuse !== 'blown') return say(s, '保险丝完好，无需更换。');
    return {
      ...s,
      fuse: 'intact',
      stage: 'idle',
      faultTime: null,
      heat: 0,
      fuseEnergy: 0,
      message: '已更换同规格保险丝并拆除错误跨接。电源仍保持隔离。',
    };
  }
  if (action.type === 'repair') {
    if (s.powered || s.stage !== 'idle' || s.fuse !== 'intact')
      return say(s, '检修前需断电；若保险丝熔断，先更换并拆除错误跨接。');
    if (!s.diagnoses.includes(action.part)) return say(s, '请先用测量证据确认这一病因。');
    return {
      ...s,
      [action.part === 'return' ? 'returnFixed' : 'softStart']: true,
      reading: null,
      message:
        action.part === 'return'
          ? '已恢复低阻回流，并为路灯分设工作回流线。'
          : '已为压缩机加入软启动，限制启动浪涌。',
    };
  }
  if (action.type === 'verify') {
    if (s.completed) return say(s, '已验收，奖励不会重复发放。');
    if (s.fuse !== 'intact' || s.stage !== 'idle')
      return say(s, '保险丝已熔断。断电更换后才能继续。');
    if (!s.returnFixed || !s.softStart) return say(s, '尚有未修复的故障：检查回流接点与启动浪涌。');
    return {
      ...s,
      powered: true,
      verifying: true,
      verifiedSeconds: 0,
      message: '恢复供电，观察一个完整的 7 秒周期，确认电压稳定。',
    };
  }
  return s;
}
export function advanceCircuit(s, dt) {
  if (!(dt > 0)) return s;
  let n = { ...s, clock: s.clock + dt, focus: Math.min(100, s.focus + (s.scanner ? 0 : dt * 6)) };
  if (s.faultTime !== null && s.fuse === 'intact') {
    const current = sampleCircuit(s).current;
    n.faultTime += dt;
    n.heat += (current * current * 0.12 - n.heat * 0.08) * dt;
    n.fuseEnergy += Math.max(0, current * current - 8 * 8) * dt;
    n.stage = n.heat >= 67 ? 'fire' : n.heat >= 46 ? 'sparks' : n.heat >= 24 ? 'smoke' : 'red';
    if (n.fuseEnergy >= 670) {
      n.fuse = 'blown';
      n.stage = 'tripped';
      n.powered = false;
      n.faultTime = null;
      n.message = '保险丝熔断，供电已切断。等待余热散去，再断电确认并更换保险丝。';
    }
  } else if (s.stage === 'tripped') n.heat = Math.max(0, n.heat - dt * 25);
  if (s.verifying && n.fuse === 'intact' && n.returnFixed && n.softStart) {
    n.verifiedSeconds += dt;
    if (n.verifiedSeconds >= STREET.period) {
      n.completed = true;
      n.verifying = false;
      n.scanner = false;
      n.message = '7 秒全周期校验通过。路灯不再眨眼，去听听夜宵摊老板怎么说。';
    }
  }
  return n;
}
