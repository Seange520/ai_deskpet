// Single source for visible obstacles, fixed colliders and patrol occlusion.
export const TARGETS = [
  [25, -3],
  [32, -3],
  [39, -3],
];
export const NODE = [41, 3];
export const ENTRY = [20, 0];
export const BOXES = [
  { position: [27, 1, -5.5], size: [4, 2, 2], color: '#526775' },
  { position: [34, 1, -5.5], size: [4, 2, 2], color: '#78664f' },
  { position: [39, 0.7, 5.5], size: [3, 1.4, 2], color: '#665a62' },
  { position: [30, 0.8, 2.5], size: [2, 1.6, 3], color: '#536c64' },
];
export const OCCLUDERS = BOXES.map(({ position: p, size: s }) => ({
  min: [p[0] - s[0] / 2, p[2] - s[2] / 2],
  max: [p[0] + s[0] / 2, p[2] + s[2] / 2],
}));
export const FLOORS = [
  { position: [21.39, -0.092, 0], size: [1.22, 0.2, 1.6] },
  { position: [33, -0.092, 0], size: [22, 0.2, 18] },
];
export const FENCES = [
  { position: [33, 0.8, -9], size: [22, 1.6, 0.16] },
  { position: [33, 0.8, 9], size: [22, 1.6, 0.16] },
  { position: [44, 0.8, 0], size: [0.16, 1.6, 18] },
  { position: [22, 0.8, -4.8], size: [0.16, 1.6, 8.4] },
  { position: [22, 0.8, 4.8], size: [0.16, 1.6, 8.4] },
  { position: [21.39, 0.4, -0.9], size: [1.22, 0.8, 0.16] },
  { position: [21.39, 0.4, 0.9], size: [1.22, 0.8, 0.16] },
];
export const nearPoint = (p, q, r = 2.4) => Math.hypot(p[0] - q[0], p[2] - q[1]) < r;
