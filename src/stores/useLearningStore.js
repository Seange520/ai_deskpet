import {
  LEARNING_LEVELS,
  levelForRoute,
  challengePassed,
  restoreLevels,
} from '../data/learningLevels';
import { executeProgram, COMMANDS } from '../lib/codeRunner';
import { create } from 'zustand';
import {
  hardwareRoutes,
  DEFAULT_ROUTE_ID,
  isRouteId,
  getHardwareRoute,
} from '../data/hardwareRoutes';
import { playSound, silence } from '../lib/sounds';
export const ROUTE_STORAGE = 'sparkmate.routes.v2';
export const REWARDS = { materials: 100, wiring: 250, code: 150 };
export const BADGES = { materials: '物料侦探', wiring: '电路新星', code: '唤醒伙伴' };
export const DEBUG_REWARD = 25;
export const MAX_XP =
  hardwareRoutes.length * 500 +
  hardwareRoutes.reduce((n, route) => n + route.faultyCircuits.length * DEBUG_REWARD, 0);
export const totalXP = (routes, debugProgress = {}) =>
  Object.values(routes).reduce(
    (sum, p) => sum + Object.entries(REWARDS).reduce((n, [key, xp]) => n + (p[key] ? xp : 0), 0),
    0,
  ) +
  hardwareRoutes.reduce(
    (sum, route) =>
      sum +
      route.faultyCircuits.reduce(
        (n, fault) => n + (debugProgress[route.id]?.[fault.id] === true ? DEBUG_REWARD : 0),
        0,
      ),
    0,
  );
const emptyDebugProgress = () => Object.fromEntries(hardwareRoutes.map((route) => [route.id, {}]));
export const levelFor = (xp) => Math.floor(xp / 500) + 1;
export const globalBadges = (routes) =>
  Object.fromEntries(
    Object.keys(REWARDS).map((key) => [key, Object.values(routes).some((p) => p[key])]),
  );
const empty = () => ({
  routeId: DEFAULT_ROUTE_ID,
  debugProgress: emptyDebugProgress(),
  unlockedLevels: ['L1'],
  completedLevels: [],
  routes: Object.fromEntries(
    hardwareRoutes.map((r) => [r.id, { materials: false, wiring: false, code: false }]),
  ),
});
function parse(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}
function clean(p) {
  return {
    materials: p?.materials === true,
    wiring: p?.wiring === true,
    code: p?.code === true && p?.wiring === true,
  };
}
function load() {
  const state = empty(),
    saved = parse(ROUTE_STORAGE);
  if (saved?.routes && typeof saved.routes === 'object') {
    state.routeId = isRouteId(saved.routeId) ? saved.routeId : DEFAULT_ROUTE_ID;
    for (const r of hardwareRoutes) state.routes[r.id] = clean(saved.routes[r.id]);
  } else state.routes.classic = clean(parse('sparkmate.progress.v1'));
  for (const route of hardwareRoutes) {
    for (const fault of route.faultyCircuits) {
      if (saved?.debugProgress?.[route.id]?.[fault.id] === true)
        state.debugProgress[route.id][fault.id] = true;
    }
  }
  Object.assign(state, restoreLevels(saved, state.routes, state.routeId));
  if (!state.unlockedLevels.includes(levelForRoute(state.routeId).id))
    state.routeId = DEFAULT_ROUTE_ID;
  return { ...state, muted: saved?.muted === true };
}
const blankRuntime = () => ({ action: 'stop', led: false, runId: 0, status: 'idle', logs: [] });
const feedback = (state, type, message, toast = '') => ({
  id: state.feedback.id + 1,
  type,
  message,
  toast,
});
export const useLearningStore = create((set, get) => ({
  ...load(),
  storageError: false,
  runtime: blankRuntime(),
  challengeEvent: { id: 0, levelId: null, nextId: null },
  feedback: { id: 0, type: 'idle', message: '慢慢来，我陪着你。', toast: '' },
  attemptFaultRepair: (faultId, choice) => {
    const state = get(),
      route = getHardwareRoute(state.routeId);
    const fault = route.faultyCircuits.find((item) => item.id === faultId);
    if (!fault || !state.unlockedLevels.includes(levelForRoute(route.id).id))
      return { status: 'error', awarded: 0 };
    const correct =
      choice?.kind === 'wire'
        ? choice.source === fault.source
        : choice?.kind === 'target' && choice.target === fault.wrongTarget;
    if (!correct) {
      playSound('warning', state.muted);
      set({ feedback: feedback(state, 'failure', '模拟短路警告：这里不是故障点，再核对配对表。') });
      return { status: 'error', awarded: 0 };
    }
    const awarded = state.debugProgress[route.id]?.[faultId] ? 0 : DEBUG_REWARD;
    const debugProgress = awarded
      ? {
          ...state.debugProgress,
          [route.id]: { ...state.debugProgress[route.id], [faultId]: true },
        }
      : state.debugProgress;
    const xp = totalXP(state.routes, debugProgress);
    const leveled = levelFor(xp) > levelFor(totalXP(state.routes, state.debugProgress));
    playSound('success', state.muted);
    set({
      debugProgress,
      feedback: feedback(
        state,
        leveled ? 'level' : 'success',
        leveled ? '修复成功，升级至 LV.' + levelFor(xp) + '！' : '修复成功！我记住这个故障啦。',
        awarded ? '修复成功 · +' + awarded + ' XP' : '',
      ),
    });
    return { status: 'success', awarded };
  },
  movePet: (action) => {
    if (!COMMANDS.move.includes(action)) throw new Error('不支持的移动参数');
    set((state) => ({ runtime: { ...state.runtime, action } }));
  },
  setPetLight: (value) => {
    if (!COMMANDS.light.includes(value)) throw new Error('不支持的灯光参数');
    set((state) => ({ runtime: { ...state.runtime, led: value === 'on' } }));
  },
  playPetSound: (value) => {
    if (!COMMANDS.play.includes(value)) throw new Error('不支持的音效参数');
    playSound(value, get().muted);
  },
  runProgram: (source) => {
    try {
      if (!get().unlockedLevels.includes(levelForRoute(get().routeId).id))
        throw new Error('请先完成前置挑战');
      const instructions = executeProgram(source, {
        move: get().movePet,
        light: get().setPetLight,
        play: get().playPetSound,
      });
      set((state) => ({
        runtime: {
          ...state.runtime,
          runId: state.runtime.runId + 1,
          status: 'success',
          routeId: state.routeId,
          instructions,
          logs: instructions.map(
            ({ command, value }) =>
              command +
              '("' +
              value +
              '") → ' +
              (command === 'move'
                ? { forward: '前进', backward: '后退', stop: '停止' }[value]
                : command === 'light'
                  ? value === 'on'
                    ? 'LED 已点亮'
                    : 'LED 已关闭'
                  : state.muted
                    ? '音效已触发（当前静音）'
                    : '成功音效已触发（是否可听取决于浏览器音频支持）'),
          ),
        },
        feedback: feedback(
          state,
          'success',
          '代码收到！我正在' +
            { forward: '前进', backward: '后退', stop: '原地待命' }[state.runtime.action] +
            '，LED ' +
            (state.runtime.led ? '已点亮。' : '已关闭。'),
        ),
      }));
      get().unlockNextLevel();
      return true;
    } catch (error) {
      set((state) => ({
        runtime: {
          ...state.runtime,
          status: 'error',
          logs: [error.message || '运行失败，请检查代码。'],
        },
        feedback: feedback(state, 'failure', '这段代码还差一点，看看控制台提示再试试。'),
      }));
      return false;
    }
  },
  resetRuntime: () =>
    set((state) => ({
      runtime: blankRuntime(),
      challengeEvent: { id: 0, levelId: null, nextId: null },
      feedback: feedback(state, 'idle', '模拟桌宠已复位，试试你的下一段代码。'),
    })),
  unlockNextLevel: () => {
    const state = get(),
      level = levelForRoute(state.routeId);
    if (
      !state.unlockedLevels.includes(level.id) ||
      state.completedLevels.includes(level.id) ||
      state.runtime.status !== 'success' ||
      state.runtime.routeId !== state.routeId ||
      !challengePassed(level.id, state.runtime.instructions)
    )
      return false;
    const next = LEARNING_LEVELS[LEARNING_LEVELS.indexOf(level) + 1];
    set({
      completedLevels: [...state.completedLevels, level.id],
      unlockedLevels: next
        ? [...new Set([...state.unlockedLevels, next.id])]
        : state.unlockedLevels,
      challengeEvent: {
        id: state.challengeEvent.id + 1,
        levelId: level.id,
        nextId: next?.id || null,
      },
    });
    if (!state.runtime.instructions.some((i) => i.command === 'play' && i.value === 'success'))
      playSound('success', state.muted);
    return true;
  },
  selectRoute: (routeId) => {
    if (!isRouteId(routeId)) return false;
    if (!get().unlockedLevels.includes(levelForRoute(routeId).id)) {
      set((state) => ({
        feedback: feedback(state, 'failure', '请先完成前置挑战', '请先完成前置挑战'),
      }));
      return false;
    }
    set({ routeId });
    return true;
  },
  complete: (key) => {
    if (!Object.hasOwn(REWARDS, key)) return false;
    const state = get(),
      p = state.routes[state.routeId];
    if (key === 'code' && !p.wiring) return false;
    playSound('success', state.muted);
    if (p[key]) {
      set({ feedback: feedback(state, 'success', '练习越来越熟练啦，已获 XP 会一直保留。') });
      return false;
    }
    const routes = { ...state.routes, [state.routeId]: { ...p, [key]: true } };
    const leveled =
      levelFor(totalXP(routes, state.debugProgress)) >
      levelFor(totalXP(state.routes, state.debugProgress));
    const badge = globalBadges(state.routes)[key] ? '' : ` · 解锁「${BADGES[key]}」`;
    set({
      routes,
      feedback: feedback(
        state,
        leveled ? 'level' : 'success',
        leveled
          ? `升级啦！现在是 LV.${levelFor(totalXP(routes, state.debugProgress))}，一起继续发光！`
          : key === 'wiring'
            ? '接线成功！第一束电流找到方向啦。'
            : key === 'code'
              ? '调参成功，伙伴有了你的个性！'
              : '物料准备好啦，向创造再近一步！',
        `+${REWARDS[key]} XP${badge}${leveled ? ' · 创客升级！' : ''}`,
      ),
    });
    return true;
  },
  fail: (burned) => {
    const state = get();
    if (burned) playSound('warning', state.muted);
    set({
      feedback: feedback(
        state,
        'failure',
        burned ? '先断电，再检查极性。我陪你重新来。' : '这根线走错啦，看看引脚提示再试一次。',
      ),
    });
  },
  recover: () =>
    set((state) => ({
      feedback: feedback(state, 'idle', '模拟开发板准备好啦，我们一起重新接线。'),
    })),
  toggleMuted: () => {
    const muted = !get().muted;
    if (muted) silence();
    set({ muted });
  },
  reset: () => {
    silence();
    set((state) => ({
      ...empty(),
      runtime: blankRuntime(),
      challengeEvent: { id: 0, levelId: null, nextId: null },
      feedback: feedback(state, 'idle', '新的旅程开始啦，我陪着你。'),
    }));
  },
}));
function save(state) {
  try {
    localStorage.setItem(
      ROUTE_STORAGE,
      JSON.stringify({
        routeId: state.routeId,
        routes: state.routes,
        muted: state.muted,
        levelVersion: 1,
        unlockedLevels: state.unlockedLevels,
        completedLevels: state.completedLevels,
        debugProgress: state.debugProgress,
      }),
    );
    localStorage.removeItem('sparkmate.progress.v1');
    if (state.storageError) useLearningStore.setState({ storageError: false });
  } catch {
    if (!state.storageError) useLearningStore.setState({ storageError: true });
  }
}
useLearningStore.subscribe((state, previous) => {
  if (
    state.routes !== previous.routes ||
    state.routeId !== previous.routeId ||
    state.muted !== previous.muted ||
    state.unlockedLevels !== previous.unlockedLevels ||
    state.completedLevels !== previous.completedLevels ||
    state.debugProgress !== previous.debugProgress
  )
    save(state);
});
save(useLearningStore.getState());
