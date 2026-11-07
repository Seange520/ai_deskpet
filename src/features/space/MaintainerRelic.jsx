import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import ToonMaterial from '../npr/ToonMaterial';
import { useSpaceStore } from './spaceStore';
export function RelicStone() {
  return (
    <group name="npr-maintainer-relic" position={[1.9, 0.12, 17.25]} rotation={[0, -0.25, -0.14]}>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.55, 0.67, 0.28, 6]} />
        <ToonMaterial color="#657e9e" finish="cliff" />
      </mesh>
      <mesh position={[0, 0.71, 0]}>
        <boxGeometry args={[0.65, 1.05, 0.3]} />
        <ToonMaterial color="#8c9ab2" flatShading />
      </mesh>
      <mesh position={[0.2, 1.22, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.27, 0.22, 0.3]} />
        <ToonMaterial color="#8c9ab2" />
      </mesh>
      <mesh position={[-0.52, 0.23, 0.26]} rotation={[0.3, 0.4, 0.7]}>
        <boxGeometry args={[0.35, 0.25, 0.3]} />
        <ToonMaterial color="#657e9e" />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <mesh
          key={i}
          position={[(i % 2) * 0.14 - 0.07, 0.4 + i * 0.12, 0.16]}
          rotation={[0, 0, i % 2 ? 0.5 : -0.4]}
        >
          <boxGeometry args={[0.14, 0.026, 0.025]} />
          <ToonMaterial color="#a4e9e0" emissive="#6bd4ce" emissiveIntensity={1.1} />
        </mesh>
      ))}
    </group>
  );
}
// Project into a DOM overlay; the Canvas keeps pointer-events:none and aria-hidden.
export function RelicProjection({ overlay, paused }) {
  const point = useRef(new Vector3());
  const anchor = useRef(new Vector3(1.9, 1.6, 17.25));
  useFrame(({ scene, camera, size }) => {
    const root = overlay.current;
    if (!root) return;
    const { focus, phase } = useSpaceStore.getState();
    const enabled = focus === 'dashboard' && phase === 'detail' && !paused;
    if (!enabled) return;
    const place = (selector, position) => {
      point.current.copy(position).project(camera);
      const el = root.querySelector(selector);
      el?.style.setProperty('--relic-x', `${(point.current.x * 0.5 + 0.5) * size.width}px`);
      el?.style.setProperty('--relic-y', `${(-point.current.y * 0.5 + 0.5) * size.height}px`);
    };
    place('.relic-hotspot', anchor.current);
    const pet = scene.getObjectByName('command-head');
    if (pet) {
      pet.getWorldPosition(point.current);
      point.current.y += 2.05;
      place('.relic-message', point.current);
    }
  }, -0.2);
  return null;
}
