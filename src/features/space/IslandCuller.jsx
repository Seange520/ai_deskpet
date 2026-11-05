import { useLayoutEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSpaceStore } from './spaceStore';

const ranges = {
  1: [18, 28],
  2: [24, 36],
  3: [31, 40],
};
const sampleInterval = 250;
const hysteresis = 2;

function distanceLevel(camera, [x, y, z], tier, previous) {
  const [detail, cull] = ranges[tier];
  const { position } = camera;
  const distance = Math.hypot(position.x - x, position.y - y, position.z - z);
  if (distance > cull - (previous === 'hidden' ? hysteresis : 0)) return 'hidden';
  return distance <= detail + (previous === 'detail' ? hysteresis : 0) ? 'detail' : 'silhouette';
}

export default function IslandCuller({ island, tier, children }) {
  const camera = useThree((state) => state.camera);
  const pinned = useSpaceStore(
    (state) => state.focus === island.id || state.destination === island.id,
  );
  const [level, setLevel] = useState(() => distanceLevel(camera, island.position, tier));
  const nextSample = useRef(0);
  const sampledRequest = useRef(-1);

  useLayoutEffect(() => {
    if (!pinned) setLevel(distanceLevel(camera, island.position, tier));
    nextSample.current = 0;
  }, [camera, island.position, pinned, tier]);

  useFrame(() => {
    if (pinned) return;
    const now = performance.now();
    const { request } = useSpaceStore.getState();
    if (request === sampledRequest.current && now < nextSample.current) return;
    sampledRequest.current = request;
    nextSample.current = now + sampleInterval;
    const next = distanceLevel(camera, island.position, tier, level);
    if (next !== level) setLevel(next);
  });

  const lod = pinned ? 'detail' : level;
  return (
    <group
      name={`space-island-${island.id}`}
      position={island.position}
      visible={lod !== 'hidden'}
      userData={{ lod }}
    >
      {lod === 'detail' ? (
        children
      ) : (
        <mesh name="space-island-silhouette" position={[0, -0.55, 0]}>
          <cylinderGeometry args={[3.35, 3.03, 1.1, 12]} />
          <meshBasicMaterial color="#33283f" />
        </mesh>
      )}
    </group>
  );
}
