import { lazy, Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Vector3 } from 'three';
import { useIslandContent } from './islandAssets';
import { isSpaceTransition, useSpaceStore } from './spaceStore';
import { LANDMARKS } from './world';
const PetDissolve = lazy(() => import('./PetDissolve'));

function dockAt(id) {
  const { position, camera, hud } = LANDMARKS[id];
  if (id === 'dashboard') return new Vector3(position[0], 1.4, position[2]);
  const outward = new Vector3(
    camera.position[0] - position[0],
    0,
    camera.position[2] - position[2],
  ).normalize();
  const side = hud.side === 'left' ? 1 : -1;
  const lateral = new Vector3(outward.z, 0, -outward.x).multiplyScalar(
    (id === 'hub' ? 1.62 : 1.92) * side,
  );
  return new Vector3(position[0], 1.4, position[2])
    .addScaledVector(outward, id === 'hub' ? 2.47 : 0.85)
    .add(lateral);
}
const docks = Object.fromEntries(Object.keys(LANDMARKS).map((id) => [id, dockAt(id)]));

function PetPlaceholder() {
  return (
    <mesh name="space-travel-pet-placeholder" position={[0, 0.55, 0]}>
      <octahedronGeometry args={[0.62, 0]} />
      <meshBasicMaterial color="#f9bf94" wireframe />
    </mesh>
  );
}

function PetBody({ tier, paused, reduced, travelRoot }) {
  const Content = useIslandContent('dashboard');
  return Content ? (
    <Content tier={tier} paused={paused} reduced={reduced} travelRoot={travelRoot} />
  ) : (
    <PetPlaceholder />
  );
}

export default function TravelPet({ tier, paused, reduced, progress, dissolve }) {
  const pet = useRef(null);
  const state = useRef({ request: -1, airborne: false, landing: null });
  const initial = useRef(docks[useSpaceStore.getState().focus]);
  const scratch = useMemo(
    () => ({
      target: new Vector3(),
      hover: new Vector3(),
    }),
    [],
  );

  useFrame(({ camera }, delta) => {
    if (paused) return;
    const group = pet.current;
    const { focus, destination, phase, request } = useSpaceStore.getState();
    const flight = state.current;
    const dt = Math.min(delta, 0.06);
    const dock = docks[focus];
    group.userData.dock = focus;
    const moving = isSpaceTransition(phase);
    const flying = !reduced && moving && progress.current > 0;

    if (flying) {
      flight.airborne = true;
      flight.landing = null;
      const approach = MathUtils.smoothstep(progress.current, 0.71, 0.98);
      scratch.hover.copy(docks[destination]);
      scratch.hover.y += 0.95;
      scratch.target
        .set(2.08 * Math.min(1, camera.aspect / 1.42), -0.97, -6.1)
        .applyQuaternion(camera.quaternion)
        .add(camera.position)
        .lerp(scratch.hover, approach);
      group.position.lerp(scratch.target, 1 - Math.exp(-12 * dt));
      group.scale.setScalar(
        MathUtils.damp(group.scale.x, MathUtils.lerp(0.54, 1, approach), 11, dt),
      );
      group.userData.motion = 'escort';
    } else if (reduced || (!flight.airborne && flight.request !== request && !moving)) {
      flight.airborne = false;
      flight.landing = null;
      group.position.copy(dock);
      group.scale.setScalar(1);
      group.userData.motion = 'docked';
    } else if (flight.airborne && !moving) {
      flight.airborne = false;
      flight.landing = { from: group.position.clone(), elapsed: 0 };
    }

    if (flight.landing && !flying) {
      const landing = flight.landing;
      landing.elapsed += dt;
      const t = Math.min(1, landing.elapsed / 0.48);
      const fall = Math.min(1, t / 0.68);
      const rebound = Math.max(0, (t - 0.68) / 0.32);
      group.position.lerpVectors(landing.from, dock, 1 - (1 - t) ** 3);
      group.position.y =
        MathUtils.lerp(landing.from.y, dock.y, fall ** 2) +
        Math.sin(Math.PI * rebound) * (1 - rebound) * 0.14;
      group.scale.setScalar(MathUtils.damp(group.scale.x, 1, 16, dt));
      group.userData.motion = t < 1 ? 'landing' : 'docked';
      if (t === 1) {
        flight.landing = null;
        group.position.copy(dock);
        group.scale.setScalar(1);
      }
    }
    flight.request = request;
    const yaw = Math.atan2(
      camera.position.x - group.position.x,
      camera.position.z - group.position.z,
    );
    if (reduced) group.rotation.y = yaw;
    else
      group.rotation.y +=
        Math.atan2(Math.sin(yaw - group.rotation.y), Math.cos(yaw - group.rotation.y)) *
        (1 - Math.exp(-14 * dt));
  });

  return (
    <group name="space-travel-pet" ref={pet} position={initial.current}>
      <Suspense fallback={<PetPlaceholder />}>
        <PetBody tier={tier} paused={paused} reduced={reduced} travelRoot={pet} />
      </Suspense>
      {dissolve && (
        <Suspense fallback={null}>
          <PetDissolve pet={pet} paused={paused} />
        </Suspense>
      )}
    </group>
  );
}
