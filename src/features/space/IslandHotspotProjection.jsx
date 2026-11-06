import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { ISLANDS } from './world';
import { useSpaceStore } from './spaceStore';

export default function IslandHotspotProjection({ dock }) {
  const anchors = useMemo(
    () =>
      Object.values(ISLANDS).map(({ id, hotspot }) => ({
        id,
        point: new Vector3(...hotspot),
      })),
    [],
  );
  const point = useMemo(() => new Vector3(), []);
  const frames = useRef(0);

  useFrame(({ camera, size }) => {
    const nav = dock.current;
    if (!nav || useSpaceStore.getState().phase !== 'idle') {
      frames.current = 0;
      return;
    }
    if (frames.current++ % 2 !== 0 && nav.dataset.positioned === 'true') return;
    camera.updateMatrixWorld();
    for (const { id, point: anchor } of anchors) {
      const button = nav.querySelector(`[data-island="${id}"]`);
      if (!button) continue;
      point.copy(anchor).project(camera);
      button.style.setProperty('--hotspot-x', `${(point.x * 0.5 + 0.5) * size.width}px`);
      button.style.setProperty('--hotspot-y', `${(-point.y * 0.5 + 0.5) * size.height}px`);
    }
    nav.dataset.positioned = 'true';
  }, -0.25);

  return null;
}
