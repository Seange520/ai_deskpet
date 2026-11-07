import { useFrame, useThree } from '@react-three/fiber';
import NightValley from '../space/NightValley';
import EnergyRail from '../space/EnergyRail';
import AbyssRibbons from '../npr/AbyssRibbons';
import EnvironmentLighting from '../deskpet3d/EnvironmentLighting';
import StageEffects from '../stage/StageEffects';
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
      <NightValley tier={3} paused={paused} reduced={reduced} />
      <EnergyRail tier={3} paused={paused} reduced={reduced} />
      <group position={[0, -2.8, 0]}>
        <AbyssRibbons paused={paused} reduced={reduced} />
      </group>
      <StageEffects tier={3} paused={paused} cinematic />
    </>
  );
}
