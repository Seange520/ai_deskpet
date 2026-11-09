import { ORDERS, POINTS } from './missionData.mjs';

export const INTERACTION_RADIUS = 2.2;
const clamp = (v, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : 0));
export function inRange(position, pointId) {
  const point = POINTS.find((p) => p.id === pointId);
  return (
    !!point &&
    Math.hypot(position[0] - point.position[0], position[1] - point.position[2]) <=
      INTERACTION_RADIUS
  );
}
export function createMission({ track = 'experience', orderIndex = 0, now = 0 } = {}) {
  return {
    track: track === 'validation' ? track : 'experience',
    orderIndex: Math.floor(clamp(orderIndex, 0, 2)),
    step: 'idle',
    position: [-7, 2.5],
    selected: null,
    failures: 0,
    restarts: 0,
    safety: 100,
    correctness: 100,
    evidence: [],
    reading: null,
    protected: false,
    startedAt: now,
    endedAt: null,
    result: null,
    history: [],
    message: '',
  };
}
export function scoreMission(state, now) {
  const order = ORDERS[state.orderIndex];
  const elapsedSeconds = Math.max(0, ((state.endedAt ?? now) - state.startedAt) / 1000);
  const evidence = Math.min(
    state.track === 'experience' ? 60 : 100,
    state.evidence.filter((e) => e.key === 'pre' || e.key === 'post').length * 50,
  );
  const components = {
    correctness: clamp(state.correctness),
    evidence,
    time: clamp(100 - Math.max(0, elapsedSeconds - order.budgetSeconds) / 6),
    safety: clamp(state.safety),
  };
  const raw =
    components.correctness * 0.4 + evidence * 0.3 + components.time * 0.2 + components.safety * 0.1;
  const score = Math.min(state.track === 'experience' ? 70 : 100, Math.round(raw));
  return {
    score,
    components,
    elapsedSeconds,
    title: score >= 90 ? '晴光校验师' : score >= 70 ? '可靠维护者' : '见习维护者',
  };
}
function fail(state, reason, safety = true) {
  return {
    ...state,
    step: 'violated',
    failures: state.failures + 1,
    reading: null,
    safety: Math.max(0, state.safety - (safety ? 20 : 0)),
    correctness: Math.max(0, state.correctness - (safety ? 0 : 15)),
    message: reason,
  };
}
function evidenceKey(state) {
  return state.step === 'repaired' ? 'post' : 'pre';
}

// Pure reducer. Every physical action checks both selection and distance.
export function transition(state, event, now = 0) {
  const order = ORDERS[state.orderIndex];
  const next = (patch) => ({ ...state, message: '', ...patch });
  const at = (id) => state.selected === id && inRange(state.position, id);
  if (event.type === 'move')
    return next({
      position: event.position,
      selected: state.selected && inRange(event.position, state.selected) ? state.selected : null,
    });
  if (event.type === 'interact') {
    if (!inRange(state.position, event.point))
      return { ...state, message: '距离太远，请先走近设备。' };
    return next({ selected: event.point });
  }
  if (event.type === 'track' && state.step === 'idle')
    return next({ track: event.track === 'validation' ? 'validation' : 'experience' });
  if (event.type === 'accept' && state.step === 'idle')
    return next({ step: 'briefed', startedAt: now });
  if (event.type === 'begin' && state.step === 'briefed') return next({ step: 'powered' });
  if (event.type === 'retry' && state.step === 'violated') {
    if (state.failures >= 3)
      return {
        ...createMission({ track: state.track, orderIndex: state.orderIndex, now }),
        step: 'briefed',
        restarts: state.restarts + 1,
        safety: state.safety,
        correctness: state.correctness,
        history: state.history,
        message: '三次失败，本单已重开。',
      };
    return next({ step: 'retry', evidence: [], protected: false });
  }
  if (event.type === 'resume' && state.step === 'retry') return next({ step: 'powered' });
  if (event.type === 'next' && state.step === 'scored' && state.orderIndex < ORDERS.length - 1)
    return {
      ...createMission({ track: state.track, orderIndex: state.orderIndex + 1, now }),
      history: [...state.history, { order: order.id, ...state.result }],
    };
  if (['idle', 'briefed', 'violated', 'retry', 'scored'].includes(state.step)) return state;

  if (event.type === 'measure' && state.selected && at(state.selected)) {
    if (state.step === 'powered' && at('switch'))
      return next({ reading: { key: 'supply', value: '24.0 V · SELV', point: 'switch' } });
    if (at(order.target) && ['isolated', 'located', 'repaired'].includes(state.step))
      return next({
        reading: {
          key: evidenceKey(state),
          value: state.step === 'repaired' ? order.after : order.before,
          point: order.target,
        },
      });
    return { ...state, message: '当前设备读数正常；请先隔离，再到嫌疑点检查。' };
  }
  if (event.type === 'record' && state.reading && at(state.reading.point)) {
    const entry = { ...state.reading, recordedAt: now };
    // Supply confirmation is a separate mandatory safety record in order C.
    return next({ evidence: [...state.evidence.filter((e) => e.key !== entry.key), entry] });
  }
  if (event.type === 'isolate' && at('switch') && state.step === 'powered') {
    if (order.live && !state.evidence.some((e) => e.key === 'supply'))
      return { ...state, message: '先验电并记录供电状态，才能设置隔离护罩。' };
    return next({ step: 'isolated', protected: order.live, reading: null });
  }
  if (event.type === 'disconnect' && at('switch') && state.step === 'powered' && order.live)
    return fail(state, '应急照明禁止断电；请验电后使用隔离护罩。');
  if (
    ['repair', 'pry'].includes(event.type) &&
    state.selected !== 'switch' &&
    state.selected &&
    at(state.selected) &&
    state.step === 'powered'
  )
    return fail(state, '尚未完成安全隔离，禁止接线或撬盖。');
  if (
    event.type === 'inspect' &&
    state.selected &&
    state.selected !== 'switch' &&
    at(state.selected) &&
    state.step === 'isolated'
  ) {
    if (state.selected !== order.target)
      return { ...state, message: '此处正常，继续检查其他嫌疑点。' };
    return next({ step: 'located', message: `发现：${order.fault}。` });
  }
  if (event.type === 'repair' && at(order.target) && state.step === 'located') {
    if (state.track === 'validation' && !state.evidence.some((e) => e.key === 'pre'))
      return { ...state, message: '校验轨需要先测量并记录故障证据。' };
    return next({ step: 'repaired', reading: null });
  }
  if (event.type === 'verify' && at(order.target) && state.step === 'repaired') {
    if (state.track === 'validation' && !state.evidence.some((e) => e.key === 'post'))
      return { ...state, message: '校验轨需要记录修复后的复测证据。' };
    return next({ step: 'verified' });
  }
  if (event.type === 'energize' && at('switch') && state.step === 'repaired') {
    const failure = fail(state, '未复核就合闸导致复燃；已重新隔离，请再次定位并修复。');
    return failure.failures >= 3
      ? failure
      : {
          ...failure,
          step: 'isolated',
          evidence: state.evidence.filter((e) => e.key === 'supply'),
          protected: order.live,
        };
  }
  if (event.type === 'energize' && at('switch') && state.step === 'verified') {
    const scored = next({ step: 'scored', endedAt: now });
    return { ...scored, result: scoreMission(scored, now), message: order.feedback };
  }
  return state;
}
