import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
export default function CameraRig({ hero, paused, reduced }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const target = useRef([0, 0]);
  useEffect(() => {
    target.current = [0, 0];
    if (reduced || paused || !matchMedia('(hover: hover) and (pointer: fine)').matches) {
      camera.position.set(4, 2.8, 5.2);
      camera.lookAt(0, 0, 0);
      invalidate();
      return;
    }
    const move = (event) => {
      const r = hero?.node?.getBoundingClientRect();
      if (!r) return;
      target.current = [
        Math.max(-1, Math.min(1, ((event.clientX - r.left) / r.width) * 2 - 1)) * 0.12,
        Math.max(-1, Math.min(1, ((event.clientY - r.top) / r.height) * 2 - 1)) * 0.07,
      ];
      invalidate();
    };
    const reset = () => {
      target.current = [0, 0];
      invalidate();
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('blur', reset);
    };
  }, [hero?.node, camera, paused, reduced, invalidate]);
  useFrame((_, delta) => {
    if (paused || reduced) return;
    const alpha = 1 - Math.exp(-5 * Math.min(delta, 0.05));
    camera.position.x += (4 + target.current[0] - camera.position.x) * alpha;
    camera.position.y += (2.8 - target.current[1] - camera.position.y) * alpha;
    camera.lookAt(0, 0, 0);
    if (
      Math.abs(camera.position.x - 4 - target.current[0]) +
        Math.abs(camera.position.y - 2.8 + target.current[1]) >
      0.0001
    )
      invalidate();
  });
  return null;
}
