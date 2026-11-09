export const ASSETS = [
  'SM_Wall_Window_Roof',
  'SM_StreetLamp',
  'SM_Bench',
  'SM_Tree',
  'SM_Paving_Set',
];
export const WALLS = [-8, -4, 0, 4, 8].map((x) => [x, -1, Math.PI]);
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
export function assetPath(name, lod) {
  return `/assets/r1a2/${name}_L${name === 'SM_Paving_Set' ? 1 : lod}.glb`;
}
