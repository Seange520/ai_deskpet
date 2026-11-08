import { Asset } from './BlenderAssets';
import { ANCHORS } from './poi';
const layout = { stone_tablet: [], crystals: [], rocks: [] };
for (const [k, a] of [{ position: [0, 0, 0] }, ...ANCHORS].entries()) {
  const radius = k ? 4.4 : 3.6;
  for (let i = 0; i < 64; i++) {
    const t = i * 2.39996323,
      x = Math.cos(t) * radius,
      z = Math.sin(t) * radius;
    if (Math.abs(x) < 1.4 || Math.abs(z) < 1.4) continue;
    layout.crystals.push({
      p: [a.position[0] + x, 0.02, a.position[2] + z],
      s: 0.18 + (i % 5) * 0.07,
      r: t,
    });
    layout.rocks.push({
      p: [a.position[0] + x * 1.025, -0.09, a.position[2] + z * 1.025],
      s: 0.3 + (i % 3) * 0.1,
      r: -t,
    });
    if (i % 8 === 0)
      layout.stone_tablet.push({
        p: [a.position[0] + x * 0.87, 0.02, a.position[2] + z * 0.87],
        s: 0.35,
        r: t,
      });
  }
}
// Extra path-side artifacts sit beyond the original 2.4m wide bridge footprint.
for (const a of ANCHORS)
  for (let i = 0; i < 14; i++)
    for (const side of [-1, 1]) {
      const d = 5 + i * 0.43,
        x = a.position[0] ? Math.sign(a.position[0]) * d : side * 1.3,
        z = a.position[2] ? Math.sign(a.position[2]) * d : side * 1.3;
      layout.crystals.push({ p: [x, -0.13, z], s: 0.16 + (i % 3) * 0.06, r: i });
    }
export default function DenseRelics() {
  return (
    <group name="p9-visual-relics" userData={{ visualOnly: true }}>
      {Object.keys(layout).map((kind) => (
        <Asset key={kind} kind={kind} visualPlacements={layout[kind]} />
      ))}
    </group>
  );
}
