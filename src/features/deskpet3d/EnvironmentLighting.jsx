import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { usePetState } from '../../store/usePetState';

// Independent light refs: never restart the pet's command or gesture animations.
export default function EnvironmentLighting({
  night,
  paused,
  reducedMotion,
  tier = 2,
  atmosphere,
}) {
  const ambient = useRef(),
    key = useRef(),
    fill = useRef();
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [night, paused, reducedMotion, invalidate]);
  useEffect(
    () =>
      usePetState.subscribe((next, previous) => {
        if ((next.status === 'sleeping') !== (previous.status === 'sleeping')) invalidate();
      }),
    [invalidate],
  );
  useFrame((_, delta) => {
    if (paused) return;
    if (atmosphere) {
      key.current.color.copy(atmosphere.key);
      fill.current.color.copy(atmosphere.fill);
    }
    const alpha = reducedMotion ? 1 : 1 - Math.exp(-7 * Math.min(delta, 0.05));
    const intensityScale = usePetState.getState().status === 'sleeping' ? 0.3 : 1;
    let settling = false;
    for (const [ref, base] of [
      [ambient, night ? 0.4 : 0.72],
      [key, night ? 1.7 : 2.55],
      [fill, night ? 0.22 : 0.32],
    ]) {
      if (!ref.current) continue;
      const target = base * intensityScale;
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
      <ambientLight ref={ambient} name="environment-ambient" intensity={0.72} color="#b7d9ff" />
      <directionalLight ref={key} position={[-7, 6, 4]} intensity={2.55} color="#FFC79A" />
      <directionalLight
        ref={fill}
        position={[-3, 2, -4]}
        intensity={0.32}
        color={night ? '#FFB868' : '#7C7AB8'}
      />
    </>
  );
}
