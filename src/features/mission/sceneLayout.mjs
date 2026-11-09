export const ASSETS = [
  'SM_Wall_Window_Roof',
  'SM_StreetLamp',
  'SM_Bench',
  'SM_Tree',
  'SM_Paving_Set',
  'SM_Wall_Door',
  'SM_Sign_Awning',
  'SM_StreetProps',
  'SM_Wall_Corner',
];
// 晴光街：5 段窗墙中，中段让位给带门的店铺立面（A3 补件）。
export const WALLS = [-8, -4, 4, 8].map((x) => [x, -1, Math.PI]);
export const CORNERS = [
  [10.2, -1, Math.PI],
  [-10.2, -1, Math.PI],
];
export const DOORS = [[0, -1, 0]];
export const SIGNS = [[0, 3.05, -0.42, Math.PI]];
export const PROPS = [
  [-6.2, 1.15, 0],
  [6.4, 2.1, Math.PI],
];
export const LAMPS = [
  [-5, 0.3],
  [5, 0.3],
];
export const BENCHES = [
  [-6.4, 4.8, Math.PI],
  [5.8, 4.8, Math.PI],
];
export const TREES = [
  [-9, 4.5],
  [9, 4.5],
];
export const TILES = Array.from({ length: 140 }, (_, i) => [
  Math.floor(i / 7) - 9.5,
  (i % 7) + 0.5,
]);
const A3 = new Set(['SM_Wall_Door', 'SM_Sign_Awning', 'SM_StreetProps', 'SM_Wall_Corner']);
export function assetPath(name, lod) {
  const dir = A3.has(name) ? 'r1a3' : 'r1a2';
  return `/assets/${dir}/${name}_L${name === 'SM_Paving_Set' ? 1 : lod}.glb`;
}
