import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CatmullRomCurve3, Matrix4, Vector3 } from 'three';
import ToonMaterial from '../npr/ToonMaterial';
import { HUB, ISLANDS } from './world';

const count = 60;
const rail = new CatmullRomCurve3(
  [
    [HUB[0], 0.22, HUB[2] + 3.86],
    [6.2, 0.7, 5.15],
    [ISLANDS.hardware.position[0] - 2.86, 0.35, 0],
    [10.3, 1.06, -8.85],
    [0, 0.37, ISLANDS.code.position[2] + 2.83],
    [-10.4, 0.97, -8.25],
    [ISLANDS.ranking.position[0] + 2.87, 0.36, 0],
    [-6.3, 0.67, 5.05],
  ].map((position) => new Vector3(...position)),
  true,
);
function RailBeads({ paused, reduced }) {
  const mesh = useRef(null);
  const offset = useRef(0);
  const scratch = useMemo(() => ({ point: new Vector3(), matrix: new Matrix4() }), []);
  function update() {
    for (let i = 0; i < count; i += 1) {
      rail.getPointAt((i / count + offset.current) % 1, scratch.point);
      scratch.point.y += 0.13;
      mesh.current.setMatrixAt(
        i,
        scratch.matrix.makeTranslation(scratch.point.x, scratch.point.y, scratch.point.z),
      );
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  }
  useLayoutEffect(update, []);
  useFrame((_, delta) => {
    if (paused || reduced) return;
    offset.current = (offset.current + Math.min(delta, 0.05) * 0.095) % 1;
    update();
  });
  return (
    <instancedMesh
      name="rail-beads"
      args={[undefined, undefined, count]}
      ref={mesh}
      frustumCulled={false}
    >
      <sphereGeometry args={[0.055, 8, 5]} />
      <ToonMaterial color="#a1f7f0" emissive="#56eadf" emissiveIntensity={2.2} toneMapped={false} />
    </instancedMesh>
  );
}

export default function EnergyRail({ tier, paused, reduced }) {
  return (
    <group name="space-energy-rail">
      <mesh name="rail-tube">
        <tubeGeometry
          args={[rail, tier === 1 ? 72 : 144, tier === 3 ? 0.095 : 0.062, tier === 1 ? 4 : 8, true]}
        />
        <ToonMaterial color="#5ecfdf" emissive="#3db8c7" emissiveIntensity={0.35} />
      </mesh>
      {tier >= 2 && <RailBeads paused={paused} reduced={reduced} />}
    </group>
  );
}
