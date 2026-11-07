import ToonMaterial from '../npr/ToonMaterial';
import { useLayoutEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSpaceStore } from './spaceStore';
import IslandDeck, { IslandRim } from './IslandDeck';

const ranges = {
  1: [18, 28],
  2: [24, 36],
  3: [27, 40],
};
const sampleInterval = 250;
const hysteresis = 2;

function distanceLevel(camera, [x, y, z], tier, previous, overview) {
  const [detail, cull] = ranges[tier];
  const { position } = camera;
  const distance = Math.hypot(position.x - x, position.y - y, position.z - z);
  if (tier === 3 && distance > cull - (previous === 'hidden' ? hysteresis : 0)) return 'hidden';
  const detailRange = overview && tier === 3 ? 34 : detail;
  return distance <= detailRange + (previous === 'detail' ? hysteresis : 0)
    ? 'detail'
    : 'silhouette';
}

export default function IslandCuller({ island, tier, children }) {
  const camera = useThree((state) => state.camera);
  const overview = useSpaceStore((state) => state.focus === 'hub' || state.destination === 'hub');
  const pinned = useSpaceStore(
    (state) => state.focus === island.id || state.destination === island.id,
  );
  const [level, setLevel] = useState(() =>
    distanceLevel(camera, island.position, tier, undefined, overview),
  );
  const nextSample = useRef(0);
  const sampledRequest = useRef(-1);

  useLayoutEffect(() => {
    if (!pinned) setLevel(distanceLevel(camera, island.position, tier, undefined, overview));
    nextSample.current = 0;
  }, [camera, island.position, pinned, tier, overview]);

  useFrame(() => {
    if (pinned) return;
    const now = performance.now();
    const { request } = useSpaceStore.getState();
    if (request === sampledRequest.current && now < nextSample.current) return;
    sampledRequest.current = request;
    nextSample.current = now + sampleInterval;
    const next = distanceLevel(camera, island.position, tier, level, overview);
    if (next !== level) setLevel(next);
  });

  const lod = pinned ? 'detail' : overview && level === 'hidden' ? 'silhouette' : level;
  return (
    <group
      name={`space-island-${island.id}`}
      position={island.position}
      visible={lod !== 'hidden'}
      userData={{ lod }}
    >
      {lod === 'detail' && children}
      {lod === 'silhouette' && <IslandSilhouette island={island} tier={tier} />}
    </group>
  );
}

const silhouetteTraces = new Float32Array([
  -2.35, 0, -2.35, 2.35, 0, -2.35, 2.35, 0, -2.35, 2.35, 0, 2.35, 2.35, 0, 2.35, -2.35, 0, 2.35,
  -2.35, 0, 2.35, -2.35, 0, -2.35, -2.05, 0, -1.3, -0.88, 0, -1.3, -0.88, 0, -1.3, 0.05, 0, -0.37,
  0.05, 0, -0.37, 1.8, 0, -0.37, -1.85, 0, 1.36, -0.3, 0, 1.36, -0.3, 0, 1.36, 0.44, 0, 0.62, 0.44,
  0, 0.62, 2.04, 0, 0.62,
]);

function IslandSilhouette({ island, tier }) {
  return (
    <group name="space-island-silhouette">
      {island.id === 'hardware' ? (
        <>
          <IslandRim island={island} tier={tier} square />
          <mesh position={[0, -0.49, 0]}>
            <boxGeometry args={[5.5, 1, 5.5]} />
            <ToonMaterial color="#253644" />
          </mesh>
          <mesh position={[0, 0.045, 0]}>
            <boxGeometry args={[5.36, 0.08, 5.36]} />
            <ToonMaterial color="#173c43" emissive="#286a73" emissiveIntensity={0.22} />
          </mesh>
          <lineSegments position={[0, 0.09, 0]}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[silhouetteTraces, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color="#74c0cb" transparent opacity={0.62} />
          </lineSegments>
        </>
      ) : (
        <IslandDeck island={island} tier={tier} />
      )}
      {island.id === 'hardware' &&
        [-1.25, 0, 1.25].map((x, i) => (
          <mesh key={x} position={[x, 0.24, (i % 2) * 1.2 - 0.6]}>
            <boxGeometry args={[0.85, 0.3, 0.85]} />
            <ToonMaterial color="#70525b" emissive="#b27346" emissiveIntensity={0.4} />
          </mesh>
        ))}
      {island.id === 'code' && (
        <group>
          {[-2.3, 2.3].map((x) => (
            <mesh key={x} position={[x, 1.4, 0.55]}>
              <boxGeometry args={[0.22, 2.8, 0.3]} />
              <ToonMaterial color="#7184ad" />
            </mesh>
          ))}
          {[-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].map((x, i) => (
            <mesh key={x} position={[x, 1.3, 0.55]}>
              <boxGeometry args={[0.045, 1.2 + (i % 3) * 0.4, 0.05]} />
              <ToonMaterial color="#7fd2c2" emissive="#5bafaf" emissiveIntensity={0.4} />
            </mesh>
          ))}
        </group>
      )}
      {island.id === 'ranking' && (
        <mesh position={[0, 1.65, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[2.26, 2.78, 4]} />
          <ToonMaterial color="#9973bb" flatShading />
        </mesh>
      )}
    </group>
  );
}
