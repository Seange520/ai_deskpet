import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// Independent light refs: never restart the pet's command or gesture animations.
export default function EnvironmentLighting({ night, paused, reducedMotion }) {
  const ambient = useRef(),
    key = useRef(),
    fill = useRef();
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [night, paused, reducedMotion, invalidate]);
  useFrame((_, delta) => {
    if (paused) return;
    const alpha = reducedMotion ? 1 : 1 - Math.exp(-7 * Math.min(delta, 0.05));
    let settling = false;
    for (const [ref, target] of [
      [ambient, night ? 0.55 : 1.3],
      [key, night ? 0.9 : 2.2],
      [fill, night ? 0.35 : 0.8],
    ]) {
      if (!ref.current) continue;
      const difference = target - ref.current.intensity;
      if (Math.abs(difference) < 0.001) ref.current.intensity = target;
      else {
        ref.current.intensity += difference * alpha;
        settling = true;
      }
    }
    if (settling) invalidate();
  });
  return (
    <>
      <ambientLight ref={ambient} name="environment-ambient" intensity={1.3} />
      <directionalLight ref={key} position={[4, 6, 5]} intensity={2.2} />
      <directionalLight ref={fill} position={[-3, 2, -4]} intensity={0.8} color="#8dc6d0" />
    </>
  );
}
