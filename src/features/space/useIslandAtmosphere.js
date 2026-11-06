import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, MathUtils } from 'three';
import { isSpaceTransition, useSpaceStore } from './spaceStore';

const warmth = new Color('#ffc79a');
const dayFill = new Color('#7c7ab8');
const nightFill = new Color('#ffb868');
const palettes = {
  hardware: { fog: new Color('#48251f'), key: new Color('#ffab72'), fill: new Color('#f47a58') },
  code: { fog: new Color('#133334'), key: new Color('#b7ffe0'), fill: new Color('#63cec8') },
  ranking: { fog: new Color('#332143'), key: new Color('#d4aaff'), fill: new Color('#ffc680') },
};

export function useIslandAtmosphere({ fogColor, night, paused, reduced, progress }) {
  const flight = useRef({ request: -1 });
  const colors = useMemo(
    () => ({
      baseFog: new Color(),
      fromFog: new Color(),
      fromKey: new Color(),
      fromFill: new Color(),
      targetKey: new Color(),
      targetFill: new Color(),
      key: warmth.clone(),
      fill: dayFill.clone(),
    }),
    [],
  );

  useFrame(({ scene }) => {
    if (paused || !scene.fog) return;
    const { focus, destination, phase, request } = useSpaceStore.getState();
    const onFlight = !reduced && isSpaceTransition(phase);
    const palette = palettes[onFlight ? destination : focus];
    const baselineFill = night ? nightFill : dayFill;
    colors.baseFog.set(fogColor);
    colors.targetKey.copy(warmth);
    colors.targetFill.copy(baselineFill);
    if (palette) {
      colors.targetKey.lerp(palette.key, 0.61);
      colors.targetFill.lerp(palette.fill, night ? 0.57 : 0.72);
    }

    if (onFlight) {
      if (flight.current.request !== request) {
        flight.current.request = request;
        colors.fromFog.copy(scene.fog.color);
        colors.fromKey.copy(colors.key);
        colors.fromFill.copy(colors.fill);
      }
      const t = MathUtils.smoothstep(progress.current, 0, 1);
      scene.fog.color.lerpColors(colors.fromFog, palette?.fog ?? colors.baseFog, t);
      colors.key.lerpColors(colors.fromKey, colors.targetKey, t);
      colors.fill.lerpColors(colors.fromFill, colors.targetFill, t);
    } else {
      scene.fog.color.copy(palette?.fog ?? colors.baseFog);
      colors.key.copy(colors.targetKey);
      colors.fill.copy(colors.targetFill);
    }
  }, -0.4);
  return colors;
}
