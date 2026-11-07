// P9 P0: shared visual/layout contract; one Three unit is one future physics metre.
export const ANCHORS = [
  { id: 'dashboard', label: '学习观测站', position: [0, 0, 16], color: '#f9bf94', symbol: 'book' },
  { id: 'hardware', label: '硬件台地', position: [16, 0, 0], color: '#80dcce', symbol: 'chip' },
  { id: 'code', label: '数据瀑布', position: [0, 0, -16], color: '#aaa4ff', symbol: 'data' },
  { id: 'ranking', label: '排位尖塔', position: [-16, 0, 0], color: '#e5a2c7', symbol: 'spire' },
];
export const VIEWS = [
  { id: 'island', label: '学习岛全貌', position: [11, 10, 25], target: [0, 1, 16] },
  { id: 'hub', label: '枢纽全景', position: [30, 26, 34], target: [0, 1, 0] },
  ...ANCHORS.map((a) => ({
    id: a.id,
    label: a.label,
    position: [a.position[0] * 0.38, 2.2, a.position[2] * 0.38],
    target: [a.position[0], 2.8, a.position[2]],
  })),
];
export const WORLD_LAYOUT = Object.freeze({
  metresPerUnit: 1,
  islandRadius: 4.8,
  hubRadius: 4,
  ringRadius: 16,
  bridgeWidth: 2.4,
  groundY: 0,
  fov: 65,
});
