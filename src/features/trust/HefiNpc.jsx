import { useWorldMap } from '../world/navigationStore';
import { useTrust } from './trustStore';
import ToonMaterial from '../npr/ToonMaterial';
export const HEFI = [12.4, 0, 1.7];
export function nearHefi() {
  const [x, , z] = useWorldMap.getState().position;
  return Math.hypot(x - HEFI[0], z - HEFI[2]) < 2.4;
}
function Part({ p, size, color }) {
  return (
    <mesh position={p}>
      <boxGeometry args={size} />
      <ToonMaterial color={color} />
    </mesh>
  );
}
export default function HefiNpc() {
  const chip = useTrust((s) => s.save.chipUnlocked);
  return (
    <group name="p10-hefi-guardian" position={HEFI} userData={{ visualOnly: true }}>
      <Part p={[0, 0.85, 0]} size={[0.44, 0.7, 0.3]} color="#906d54" />
      <Part p={[0, 1.38, 0]} size={[0.32, 0.34, 0.3]} color="#c4aa87" />
      <Part p={[0, 1.58, 0]} size={[0.4, 0.12, 0.35]} color="#c4c6b5" />
      <Part p={[-0.31, 0.86, 0]} size={[0.16, 0.62, 0.18]} color="#c4aa87" />
      {[-0.13, 0.13].map((x) => (
        <Part key={x} p={[x, 0.3, 0]} size={[0.17, 0.6, 0.23]} color="#344858" />
      ))}
      <Part p={[0.5, 0.3, 0]} size={[0.42, 0.4, 0.3]} color="#344858" />
      {chip && (
        <group name="p10-hefi-chip-helper">
          <mesh position={[0.5, 0.54, -0.16]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#7fffe8" />
          </mesh>
        </group>
      )}
    </group>
  );
}
