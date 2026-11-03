export const LEARNING_LEVELS = [
  {
    id: 'L1',
    routeId: 'classic',
    title: '前进与亮灯',
    target: '同一次运行中调用 move("forward") 和 light("on")，最后保持前进、LED 亮。',
    required: [
      ['move', 'forward'],
      ['light', 'on'],
    ],
    action: 'forward',
    led: true,
  },
  {
    id: 'L2',
    routeId: 'quadruped',
    title: '后退与反馈',
    target: '同一次运行中后退、亮灯并播放成功音效，最后保持后退、LED 亮。',
    required: [
      ['move', 'backward'],
      ['light', 'on'],
      ['play', 'success'],
    ],
    action: 'backward',
    led: true,
  },
  {
    id: 'L3',
    routeId: 'tracked',
    title: '行进后停机',
    target: '按顺序前进 → 停止 → 关灯，最后保持停止、LED 灭。',
    required: [
      ['move', 'forward'],
      ['move', 'stop'],
      ['light', 'off'],
    ],
    action: 'stop',
    led: false,
    ordered: true,
  },
  {
    id: 'L4',
    routeId: 'spherical',
    title: '组合指令挑战',
    target: '按顺序亮灯 → 前进 → 后退 → 停止 → 关灯 → 成功音效，最后保持停止、LED 灭。',
    required: [
      ['light', 'on'],
      ['move', 'forward'],
      ['move', 'backward'],
      ['move', 'stop'],
      ['light', 'off'],
      ['play', 'success'],
    ],
    action: 'stop',
    led: false,
    ordered: true,
  },
];
export const levelForRoute = (routeId) => LEARNING_LEVELS.find((l) => l.routeId === routeId);
export function challengePassed(id, instructions) {
  const level = LEARNING_LEVELS.find((l) => l.id === id);
  if (!level || !Array.isArray(instructions)) return false;
  let action,
    led,
    cursor = 0;
  for (const item of instructions) {
    if (item.command === 'move') action = item.value;
    if (item.command === 'light') led = item.value === 'on';
    const expected = level.required[cursor];
    if (expected && item.command === expected[0] && item.value === expected[1]) cursor++;
  }
  const contains = level.ordered
    ? cursor === level.required.length
    : level.required.every(([command, value]) =>
        instructions.some((i) => i.command === command && i.value === value),
      );
  return contains && action === level.action && led === level.led;
}
// 新记录接受连续解锁前缀；旧用户保留已使用路线的访问权，不冒充挑战通关。
export function restoreLevels(saved, routes, routeId) {
  let count = 1;
  if (saved?.levelVersion === 1) {
    const ids = Array.isArray(saved.unlockedLevels) ? saved.unlockedLevels : [];
    while (count < 4 && ids.includes('L1') && ids.includes(LEARNING_LEVELS[count].id)) count++;
  } else {
    count = Math.max(1, LEARNING_LEVELS.findIndex((l) => l.routeId === routeId) + 1);
    LEARNING_LEVELS.forEach((l, i) => {
      if (Object.values(routes[l.routeId]).some(Boolean)) count = Math.max(count, i + 1);
    });
  }
  const unlockedLevels = LEARNING_LEVELS.slice(0, count).map((l) => l.id);
  const completedLevels =
    saved?.levelVersion === 1 && Array.isArray(saved.completedLevels)
      ? LEARNING_LEVELS.filter(
          (l) => unlockedLevels.includes(l.id) && saved.completedLevels.includes(l.id),
        ).map((l) => l.id)
      : [];
  return { unlockedLevels, completedLevels };
}
