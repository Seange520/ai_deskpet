import { useEffect, useRef } from 'react';
import { Environment, Lightformer } from '@react-three/drei';
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
      [ambient, night ? 0.55 : 1.3],
      [key, night ? 0.9 : 1.6],
      [fill, night ? 0.35 : 0.8],
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
      {tier >= 2 && (
        <Environment
          key={night ? 'night' : 'day'}
          resolution={256}
          frames={1}
          environmentIntensity={night ? 0.35 : 0.7}
        >
          <Lightformer
            form="rect"
            color="#ffcf9e"
            intensity={3}
            position={[0, 4, 4]}
            scale={[5, 3, 1]}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="rect"
            color="#8ea0d8"
            intensity={2}
            position={[-4, 2, -3]}
            scale={[3, 5, 1]}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="rect"
            color="#ffb0a8"
            intensity={1.5}
            position={[4, 1, 1]}
            scale={[2, 4, 1]}
            target={[0, 0, 0]}
          />
        </Environment>
      )}
      <ambientLight ref={ambient} name="environment-ambient" intensity={1.3} color="#FFC79A" />
      <directionalLight ref={key} position={[4, 6, 5]} intensity={1.6} color="#FFC79A" />
      <directionalLight
        ref={fill}
        position={[-3, 2, -4]}
        intensity={0.8}
        color={night ? '#FFB868' : '#7C7AB8'}
      />
    </>
  );
}
