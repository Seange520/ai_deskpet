import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Object3D } from 'three';
import ToonMaterial from './ToonMaterial';
// Irregular floating crystal clusters, three shared draws rather than planted light poles.
export default function ObservatoryEcology({ tier, paused, reduced }) {
  const bodies = useRef(),
    lights = useRef(),
    shards = useRef();
  const count = tier === 1 ? 12 : 28;
  const time = useRef(0);
  const scratch = useMemo(() => ({ pose: new Object3D(), color: new Color() }), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = i * 2.399963;
        const radius = 3.7 + (Math.sin(i * 7.7) * 0.5 + 0.5) * 0.85;
        return {
          x: Math.sin(angle) * radius,
          z: Math.cos(angle) * radius,
          y: 0.08 + ((i * 7) % 9) * 0.035,
          size: 0.17 + ((i * 11) % 7) * 0.012,
          angle,
          phase: i * 1.71,
        };
      }),
    [count],
  );
  function update() {
    const { pose, color } = scratch;
    seeds.forEach((seed, i) => {
      const bob = Math.sin(time.current * 0.8 + seed.phase) * 0.1;
      const tilt = Math.sin(time.current * 0.45 + seed.phase) * 0.13;
      pose.position.set(seed.x, seed.y + bob, seed.z);
      pose.rotation.set(0.15 + tilt, seed.angle + time.current * 0.08, 0.25 + tilt);
      pose.scale.set(seed.size * 0.72, seed.size * 1.65, seed.size * 0.66);
      pose.updateMatrix();
      bodies.current.setMatrixAt(i, pose.matrix);
      bodies.current.setColorAt(i, color.set(i % 3 === 0 ? '#af9cde' : '#75c9c2'));
      // Internal glow stays small, colored and below the old white clipping level.
      pose.scale.multiplyScalar(0.48);
      pose.updateMatrix();
      lights.current.setMatrixAt(i, pose.matrix);
      lights.current.setColorAt(i, color.set(i % 3 === 0 ? '#bca5ec' : '#7ce9d6'));
      pose.position.x += Math.cos(seed.angle) * 0.19;
      pose.position.y -= 0.14;
      pose.position.z += Math.sin(seed.angle) * 0.19;
      pose.rotation.z -= 0.7;
      pose.scale.setScalar(seed.size * 0.46);
      pose.updateMatrix();
      shards.current.setMatrixAt(i, pose.matrix);
    });
    for (const mesh of [bodies.current, lights.current, shards.current])
      mesh.instanceMatrix.needsUpdate = true;
  }
  useLayoutEffect(() => {
    update();
    for (const mesh of [bodies.current, lights.current, shards.current]) {
      mesh.instanceColor && (mesh.instanceColor.needsUpdate = true);
      mesh.geometry.computeBoundingSphere();
    }
  }, [seeds]);
  useFrame((_, delta) => {
    if (paused || reduced) return;
    time.current += Math.min(delta, 0.05);
    update();
  });
  return (
    <group name="npr-observatory-ecology">
      <instancedMesh
        name="npr-crystal-shells"
        ref={bodies}
        args={[null, null, count]}
        frustumCulled={false}
      >
        <octahedronGeometry args={[1, 0]} />
        <ToonMaterial transparent opacity={0.5} depthWrite={false} color="#bce6ef" />
      </instancedMesh>
      <instancedMesh
        name="npr-plant-lights"
        ref={lights}
        args={[null, null, count]}
        frustumCulled={false}
      >
        <octahedronGeometry args={[1, 0]} />
        <ToonMaterial color="#a2e2da" emissive="#6bc5c0" emissiveIntensity={2.0} />
      </instancedMesh>
      <instancedMesh
        name="npr-crystal-shards"
        ref={shards}
        args={[null, null, count]}
        frustumCulled={false}
      >
        <octahedronGeometry args={[1, 0]} />
        <ToonMaterial color="#89bfc8" transparent opacity={0.72} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
