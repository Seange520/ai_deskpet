import { lazy, Suspense, useMemo, useRef } from 'react';
import { Vector3 } from 'three';
import { useEnvironmentStore } from '../environment/useEnvironmentStore';
import EnvironmentLighting from '../deskpet3d/EnvironmentLighting';
import IslandCuller from './IslandCuller';
import IslandDeck, { IslandRim } from './IslandDeck';
import { useIslandContent } from './islandAssets';
import HubSandbox from './HubSandbox';
import EnergyRail from './EnergyRail';
import TravelPet from './TravelPet';
import WorldLabel from './WorldLabel';
import TravelRig from './TravelRig';
import NightValley from './NightValley';
import { ISLANDS, RING_RADIUS } from './world';
import ToonMaterial from '../npr/ToonMaterial';
import ObservatoryEcology from '../npr/ObservatoryEcology';
import ToonClouds from '../npr/ToonClouds';
import { RelicStone } from './MaintainerRelic';
import ToonDrones from '../npr/ToonDrones';
import AbyssRibbons from '../npr/AbyssRibbons';
import LumenFish from '../npr/LumenFish';
import MemoryMeteor from './MemoryMeteor';
import LoreObjects from './LoreObjects';
import { useIslandAtmosphere } from './useIslandAtmosphere';

const StageAtmosphere = lazy(() => import('../stage/StageAtmosphere'));
const StageEffects = lazy(() => import('../stage/StageEffects'));
const SpaceEnvironment = lazy(() => import('./SpaceEnvironment'));
const IslandLights = lazy(() =>
  import('./SpaceEnvironment').then(({ IslandLights }) => ({ default: IslandLights })),
);
const TravelMist = lazy(() => import('./TravelMist'));
const TravelSpeedLines = lazy(() => import('./TravelSpeedLines'));

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

function IslandDetail({ island, tier, children }) {
  if (island.id === 'hardware')
    return (
      <group name="space-island-detail">
        <IslandRim island={island} tier={tier} square />
        {children}
      </group>
    );
  return (
    <group name="space-island-detail">
      <IslandDeck island={island} tier={tier} detailed />
      {[-2.55, 2.55].map((x) => (
        <mesh key={x} position={[x, 0.18, 0]}>
          <cylinderGeometry args={[0.12, 0.2, 0.36, 12]} />
          <ToonMaterial emissive={island.accent} emissiveIntensity={1.6} color={island.accent} />
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

export default function WorldScene({ paused, reduced, tier, performanceStep, advanced, meteor }) {
  const night = useEnvironmentStore((state) => state.night);
  const focusTarget = useMemo(() => new Vector3(...ISLANDS.dashboard.camera.focus), []);
  const travelProgress = useRef(0);
  const fogColor = tier >= 2 ? '#1b1626' : DUSK;
  const Effects = StageEffects;
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
      {tier === 3 && performanceStep < 1 && <ToonClouds paused={paused} reduced={reduced} />}
      {tier >= 2 && <ToonDrones paused={paused} reduced={reduced} />}
      <NightValley tier={tier} paused={paused} reduced={reduced} />
      {tier >= 2 ? (
        <Suspense fallback={null}>
          <SpaceEnvironment tier={tier} paused={paused} reduced={reduced} />
        </Suspense>
      ) : (
        <>
          <mesh position={[0, -1.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[85, 96]} />
            <meshStandardMaterial color="#27363d" roughness={0.95} />
          </mesh>
        </>
      )}
      {tier >= 2 && <AbyssRibbons paused={paused} reduced={reduced} />}
      {tier >= 2 && <LumenFish tier={tier} paused={paused} reduced={reduced} />}
      {tier === 3 && <MemoryMeteor overlay={meteor} paused={paused} reduced={reduced} />}
      <LoreObjects />
      <Orbit radius={RING_RADIUS} color="#ae86cf" opacity={0.24} />
      <HubSandbox tier={tier} paused={paused} reduced={reduced} />
      <EnergyRail tier={tier} paused={paused} reduced={reduced} />
      {islands.map((island) => {
        const fallback = <IslandPlaceholder color={island.accent} />;
        return (
          <IslandCuller key={island.id} island={island} tier={tier}>
            <IslandDetail island={island} tier={tier}>
              {tier >= 2 && (
                <Suspense fallback={null}>
                  <IslandLights island={island} tier={tier} volume={performanceStep < 1} />
                </Suspense>
              )}
              {tier >= 2 && (
                <ObservatoryEcology island={island} tier={tier} paused={paused} reduced={reduced} />
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
      {tier >= 2 && (
        <Suspense fallback={null}>
          <StageAtmosphere tier={tier} paused={paused} reduced={reduced} />
        </Suspense>
      )}
      <RelicStone />
      <TravelRig
        reduced={reduced}
        paused={paused}
        focusTarget={focusTarget}
        travelProgress={travelProgress}
      />
      {tier === 3 && performanceStep < 1 && !reduced && (
        <Suspense fallback={null}>
          <TravelSpeedLines />
        </Suspense>
      )}
      <TravelPet
        tier={tier}
        paused={paused}
        reduced={reduced}
        progress={travelProgress}
        dissolve={advanced.dissolve && !reduced}
      />
      {tier >= 2 && performanceStep < 1 && !reduced && (
        <Suspense fallback={null}>
          <TravelMist key={tier} tier={tier} progress={travelProgress} />
        </Suspense>
      )}
      {tier >= 2 && (
        <Suspense fallback={null}>
          <Effects
            tier={tier}
            paused={paused}
            focusTarget={focusTarget}
            cinematic={performanceStep < 3}
            advanced={advanced}
            reduced={reduced}
          />
        </Suspense>
      )}
    </>
  );
}
