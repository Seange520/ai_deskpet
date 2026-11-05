import { useMemo } from 'react';
import { Vector3 } from 'three';
import { useLearningStore } from '../../stores/useLearningStore';
import { useEnvironmentStore } from '../environment/useEnvironmentStore';
import { usePetActions } from '../interaction/usePetActions';
import EnvironmentLighting from '../deskpet3d/EnvironmentLighting';
import PetModel from '../deskpet3d/PetModel';
import StageAtmosphere from '../stage/StageAtmosphere';
import StageEffects from '../stage/StageEffects';
import TravelRig from './TravelRig';
import { HUB, ISLANDS, RING_RADIUS } from './world';

const DUSK = '#21192f';
const islands = Object.values(ISLANDS);

function Orbit({ radius, color, opacity, y = -1.08 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <ringGeometry args={[radius - 0.035, radius + 0.035, 96]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function Island({ island, children }) {
  return (
    <group name={`space-island-${island.id}`} position={island.position}>
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[3.35, 3.03, 1.1, 48]} />
        <meshStandardMaterial
          color="#302741"
          emissive="#453656"
          emissiveIntensity={0.16}
          metalness={0.55}
          roughness={0.45}
        />
      </mesh>
      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.97, 3.11, 64]} />
        <meshStandardMaterial
          color={island.accent}
          emissive={island.accent}
          emissiveIntensity={2.1}
        />
      </mesh>
      {[-2.55, 2.55].map((x) => (
        <mesh key={x} position={[x, 0.18, 0]}>
          <cylinderGeometry args={[0.12, 0.2, 0.36, 12]} />
          <meshStandardMaterial
            emissive={island.accent}
            emissiveIntensity={1.6}
            color={island.accent}
          />
        </mesh>
      ))}
      {children}
    </group>
  );
}

function Marker({ id, color }) {
  return (
    <mesh position={[0, 1.18, 0]} rotation={[0.3, 0.45, 0.2]}>
      {id === 'hardware' && <icosahedronGeometry args={[1.15, 0]} />}
      {id === 'code' && <octahedronGeometry args={[1.25, 0]} />}
      {id === 'ranking' && <dodecahedronGeometry args={[1.16, 0]} />}
      <meshPhysicalMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
        metalness={0.58}
        roughness={0.23}
        clearcoat={1}
      />
    </mesh>
  );
}

function Skyline() {
  const stars = useMemo(
    () =>
      new Float32Array(
        Array.from({ length: 216 }, (_, i) => {
          const angle = i * 2.39996;
          const radius = 35 + (i % 11) * 3.1;
          return [Math.cos(angle) * radius, 3 + (i % 23) * 1.26, Math.sin(angle) * radius];
        }).flat(),
      ),
    [],
  );
  return (
    <points name="space-skyline">
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[stars, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#cebddd"
        size={0.11}
        fog={false}
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </points>
  );
}

export default function WorldScene({ paused, reduced, tier }) {
  const runtime = useLearningStore((state) => state.runtime);
  const interaction = usePetActions();
  const environment = useEnvironmentStore();
  const focusTarget = useMemo(() => new Vector3(...ISLANDS.dashboard.camera.focus), []);
  return (
    <>
      <color attach="background" args={[DUSK]} />
      <fogExp2 attach="fog" args={[DUSK, 0.027]} />
      <EnvironmentLighting
        night={environment.night}
        paused={paused}
        reducedMotion={reduced}
        tier={tier}
      />
      <Skyline />
      <mesh position={[0, -1.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[85, 96]} />
        <meshStandardMaterial color="#211b34" roughness={0.95} />
      </mesh>
      <gridHelper args={[110, 44, '#634d7c', '#403451']} position={[0, -1.13, 0]} />
      <Orbit radius={RING_RADIUS} color="#ae86cf" opacity={0.62} />
      <Orbit radius={RING_RADIUS + 1.1} color="#a181ca" opacity={0.24} />
      <Orbit radius={7.3} color="#d4a4a1" opacity={0.47} />
      <group name="space-hub" position={HUB}>
        <mesh position={[0, -0.52, 0]}>
          <cylinderGeometry args={[2.9, 2.5, 1.08, 40]} />
          <meshStandardMaterial color="#40314e" metalness={0.6} roughness={0.36} />
        </mesh>
        <Orbit radius={2.5} color="#ffbe92" opacity={0.88} y={0.04} />
        <mesh position={[0, 1.9, 0]}>
          <octahedronGeometry args={[0.84, 0]} />
          <meshStandardMaterial
            color="#ffbe92"
            emissive="#ff9e70"
            emissiveIntensity={1.15}
            metalness={0.48}
          />
        </mesh>
      </group>
      {islands.map((island) => (
        <Island key={island.id} island={island}>
          {island.id === 'dashboard' ? (
            <group position={[0, 1.4, 0]}>
              <PetModel
                runtime={runtime}
                interaction={interaction}
                environment={environment}
                reducedMotion={reduced}
                paused={paused}
                tier={tier}
                cinematic={tier >= 2}
              />
              {tier >= 2 && <StageAtmosphere paused={paused} reduced={reduced} />}
            </group>
          ) : (
            <Marker id={island.id} color={island.accent} />
          )}
        </Island>
      ))}
      <TravelRig reduced={reduced} paused={paused} focusTarget={focusTarget} />
      {tier >= 2 && <StageEffects tier={tier} paused={paused} focusTarget={focusTarget} />}
    </>
  );
}
