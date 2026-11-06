import { Suspense, useMemo, useRef } from 'react';
import { Vector3 } from 'three';
import { useEnvironmentStore } from '../environment/useEnvironmentStore';
import EnvironmentLighting from '../deskpet3d/EnvironmentLighting';
import StageAtmosphere from '../stage/StageAtmosphere';
import StageEffects from '../stage/StageEffects';
import SpaceEnvironment, { IslandLights } from './SpaceEnvironment';
import IslandCuller from './IslandCuller';
import { useIslandContent } from './islandAssets';
import HubSandbox from './HubSandbox';
import EnergyRail from './EnergyRail';
import TravelMist from './TravelMist';
import TravelPet from './TravelPet';
import WorldLabel from './WorldLabel';
import TravelRig from './TravelRig';
import TravelSpeedLines from './TravelSpeedLines';
import NightValley from './NightValley';
import { ISLANDS, RING_RADIUS } from './world';
import { useIslandAtmosphere } from './useIslandAtmosphere';

const DUSK = '#21192f';
const islands = Object.values(ISLANDS);
const plaques = {
  dashboard: ['学习仪表盘', '01 / OBSERVATORY'],
  hardware: ['硬件实验室', '02 / HARDWARE LAB'],
  code: ['代码魔改工坊', '03 / CODE WORKSHOP'],
  ranking: ['创客排位', '04 / MAKER RANKING'],
};

function Orbit({ radius, color, opacity, y = -1.08 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <ringGeometry args={[radius - 0.035, radius + 0.035, 96]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function IslandDetail({ island, children }) {
  if (island.id === 'hardware') return <group name="space-island-detail">{children}</group>;
  return (
    <group name="space-island-detail">
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

function IslandPlaceholder({ color }) {
  return (
    <mesh name="space-island-placeholder" position={[0, 0.84, 0]}>
      <octahedronGeometry args={[0.72, 0]} />
      <meshBasicMaterial color={color} wireframe />
    </mesh>
  );
}

function LoadedIsland({ island, tier, paused, reduced, fallback }) {
  const Content = useIslandContent(island.id);
  return Content ? (
    <Content island={island} tier={tier} paused={paused} reduced={reduced} />
  ) : (
    fallback
  );
}

export default function WorldScene({ paused, reduced, tier, performanceStep, advanced }) {
  const night = useEnvironmentStore((state) => state.night);
  const focusTarget = useMemo(() => new Vector3(...ISLANDS.dashboard.camera.focus), []);
  const travelProgress = useRef(0);
  const fogColor = tier >= 2 ? '#1b1626' : DUSK;
  const atmosphere = useIslandAtmosphere({
    fogColor,
    night,
    paused,
    reduced,
    progress: travelProgress,
  });
  return (
    <>
      <color attach="background" args={[DUSK]} />
      <fogExp2 attach="fog" args={[fogColor, tier >= 2 ? 0.022 : 0.027]} />
      <EnvironmentLighting
        night={night}
        paused={paused}
        reducedMotion={reduced}
        tier={tier}
        atmosphere={atmosphere}
      />
      <NightValley tier={tier} paused={paused} reduced={reduced} />
      {tier >= 2 ? (
        <SpaceEnvironment paused={paused} reduced={reduced} />
      ) : (
        <>
          <mesh position={[0, -1.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[85, 96]} />
            <meshStandardMaterial color="#27363d" roughness={0.95} />
          </mesh>
        </>
      )}
      <Orbit radius={RING_RADIUS} color="#ae86cf" opacity={0.24} />
      <HubSandbox tier={tier} paused={paused} reduced={reduced} />
      <EnergyRail tier={tier} paused={paused} reduced={reduced} />
      {islands.map((island) => {
        const fallback = <IslandPlaceholder color={island.accent} />;
        return (
          <IslandCuller key={island.id} island={island} tier={tier}>
            <IslandDetail island={island}>
              {tier >= 2 && (
                <IslandLights island={island} tier={tier} volume={performanceStep < 1} />
              )}
              <WorldLabel
                title={plaques[island.id][0]}
                code={plaques[island.id][1]}
                color={island.accent}
                position={[0, 3.6, 0]}
              />
              {island.id !== 'dashboard' && (
                <Suspense fallback={fallback}>
                  <LoadedIsland
                    island={island}
                    tier={tier}
                    paused={paused}
                    reduced={reduced}
                    fallback={fallback}
                  />
                </Suspense>
              )}
            </IslandDetail>
          </IslandCuller>
        );
      })}
      {tier >= 2 && <StageAtmosphere tier={tier} paused={paused} reduced={reduced} />}
      <TravelRig
        reduced={reduced}
        paused={paused}
        focusTarget={focusTarget}
        travelProgress={travelProgress}
      />
      {tier === 3 && performanceStep < 1 && !reduced && <TravelSpeedLines />}
      <TravelPet
        tier={tier}
        paused={paused}
        reduced={reduced}
        progress={travelProgress}
        dissolve={advanced.dissolve && !reduced}
      />
      {tier >= 2 && performanceStep < 1 && !reduced && (
        <TravelMist key={tier} tier={tier} progress={travelProgress} />
      )}
      {tier >= 2 && (
        <StageEffects
          tier={tier}
          paused={paused}
          focusTarget={focusTarget}
          cinematic={performanceStep < 3}
          advanced={advanced}
          reduced={reduced}
        />
      )}
    </>
  );
}
