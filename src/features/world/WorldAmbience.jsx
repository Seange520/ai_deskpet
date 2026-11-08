import { useFrame, useThree } from '@react-three/fiber';
import NightValley from '../space/NightValley';
import FluidEnergyRail from './FluidEnergyRail';
import CelestialSkyline from './CelestialSkyline';
import ScatteringShafts from './ScatteringShafts';
import AbyssRibbons from '../npr/AbyssRibbons';
import EnvironmentLighting from '../deskpet3d/EnvironmentLighting';
import SkinEffects from './SkinEffects';
import SkinEnvironment from './SkinEnvironment';
import ToonClouds from '../npr/ToonClouds';
import useReducedMotionPreference from '../../lib/useReducedMotionPreference';
export default function WorldAmbience({ paused }) {
  const reduced = useReducedMotionPreference(),
    invalidate = useThree((s) => s.invalidate);
  useFrame(() => {
    if (!paused && !reduced) invalidate();
  }, -0.9);
  return (
    <>
      <EnvironmentLighting night={false} paused={paused} reducedMotion={reduced} tier={3} />
      <NightValley
        tier={3}
        paused={paused}
        reduced={reduced}
        occludeStars
        detailed
        contrast={1.5}
      />
      <FluidEnergyRail paused={paused} reduced={reduced} />
      <CelestialSkyline />
      <ScatteringShafts paused={paused} reduced={reduced} />
      <group position={[0, -2.8, 0]}>
        <AbyssRibbons paused={paused} reduced={reduced} />
      </group>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((angle) => (
        <group key={angle} rotation={[0, angle, 0]}>
          <ToonClouds paused={paused} reduced={reduced} />
        </group>
      ))}
      <SkinEnvironment />
      <SkinEffects paused={paused} />
    </>
  );
}
