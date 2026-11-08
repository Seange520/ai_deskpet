import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider, useBeforePhysicsStep, useRapier } from '@react-three/rapier';
import ToonMaterial from '../npr/ToonMaterial';
import { useWorldMap } from '../world/navigationStore';
import { effects } from './raid.mjs';
import { useRaid } from './raidStore';
import { DETECTION, patrolAt } from './patrol.mjs';
import { BOXES, FLOORS, FENCES, TARGETS, NODE, OCCLUDERS } from './layout.mjs';
export const activeRun = (r) =>
  r && ['entering', 'running', 'checkpoint', 'extracting'].includes(r.state);
function Solid({ position, size, color = '#394e60' }) {
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CuboidCollider args={size.map((v) => v / 2)} />
      <mesh receiveShadow castShadow>
        <boxGeometry args={size} />
        <ToonMaterial color={color} />
      </mesh>
    </RigidBody>
  );
}
export default function RaidScene({ paused = false }) {
  const { world } = useRapier();
  useBeforePhysicsStep(() => {
    const r = useRaid.getState().run;
    if (!activeRun(r)) return;
    const factor = effects(r).speedFactor * (crouch.current ? 0.5 : 1);
    if (factor === 1) return;
    world.forEachRigidBody((body) => {
      if (!body.userData?.nativeKCC) return;
      const p = body.translation(),
        n = body.nextTranslation();
      body.setNextKinematicTranslation({
        x: p.x + (n.x - p.x) * factor,
        y: n.y,
        z: p.z + (n.z - p.z) * factor,
      });
    });
  });
  const run = useRaid((s) => s.run),
    drone = useRef(),
    previous = useRef(null),
    step = useRef(0),
    crouch = useRef(false);
  useEffect(() => {
    const key = (e) => {
      if (e.code === 'ControlLeft' || e.code === 'ControlRight')
        crouch.current = e.type === 'keydown';
    };
    const blur = () => {
      crouch.current = false;
    };
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', key);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', key);
      window.removeEventListener('blur', blur);
    };
  }, []);
  useEffect(() => {
    if (run?.state === 'failed' && useWorldMap.getState().position[0] > 20.7)
      useWorldMap.getState().travel('hardware');
  }, [run?.state]);
  useEffect(() => () => useRaid.getState().close(), []);
  useFrame((_, dt) => {
    const s = useRaid.getState();
    if (!activeRun(s.run)) return;
    if (useWorldMap.getState().active || useWorldMap.getState().position[0] < 18) {
      s.dispatch({ type: 'abandon' });
      return;
    }
    if (paused) return;
    const p = useWorldMap.getState().position,
      old = previous.current;
    previous.current = [...p];
    const moving = old && Math.hypot(p[0] - old[0], p[2] - old[2]) > 0.002;
    step.current += dt;
    const footstep = moving && step.current > 0.5;
    if (footstep) step.current = 0;
    s.tick(Math.min(dt, 0.1), {
      player: [p[0], p[2]],
      boxes: OCCLUDERS,
      crouched: crouch.current,
      stationary: !moving,
      footstep,
    });
    const r = useRaid.getState().run;
    const d = patrolAt(DETECTION.path, DETECTION.speed, r.rooms[r.room].patrolClock);
    if (drone.current) {
      drone.current.position.set(d.position[0], 2, d.position[1]);
      drone.current.rotation.y = -d.heading;
    }
  });
  if (!activeRun(run)) return null;
  return (
    <group name="p10-raid-courtyard" userData={{ privateColliders: true }}>
      {FLOORS.map((v, i) => (
        <Solid key={'floor' + i} {...v} color="#4b5965" />
      ))}
      {FENCES.map((v, i) => (
        <Solid key={'fence' + i} {...v} color="#35485a" />
      ))}
      {BOXES.map((v, i) => (
        <Solid key={'cover' + i} {...v} />
      ))}
      {TARGETS.map((p, i) => (
        <group key={i} position={[p[0], 0, p[1]]} name={'p10-raid-room' + (i + 1)}>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[1.6, 1.2, 0.5]} />
            <ToonMaterial color={['#b18051', '#568d94', '#b26458'][i]} />
          </mesh>
          {[0, 1, 2].map((j) => (
            <mesh key={j} position={[-0.5 + j * 0.5, 1.25, 0]}>
              <sphereGeometry args={[0.1, 8, 6]} />
              <meshBasicMaterial color={run.rooms[i].solved ? '#a9e1cb' : '#f1c978'} />
            </mesh>
          ))}
          <mesh position={[0, 2, 0]} rotation={[0, 0, Math.PI / 4]} visible={!run.rooms[i].solved}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <ToonMaterial color="#efc472" />
          </mesh>
        </group>
      ))}
      <group position={[NODE[0], 0.7, NODE[1]]} name="p10-raid-node">
        <mesh>
          <cylinderGeometry args={[0.6, 0.8, 1.4, 6]} />
          <ToonMaterial color="#6a8396" />
        </mesh>
        <mesh position={[0, 1, 0]}>
          <octahedronGeometry args={[0.35]} />
          <meshBasicMaterial color="#a8e0ca" />
        </mesh>
      </group>
      <group position={[22.5, 1, 0]} name="p10-raid-gate">
        {[-0.65, 0.65].map((z) => (
          <mesh key={z} position={[0, 0, z]}>
            <boxGeometry args={[0.15, 2, 0.15]} />
            <ToonMaterial color="#d6a263" />
          </mesh>
        ))}
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[0.15, 0.2, 1.5]} />
          <ToonMaterial color="#e1b87c" />
        </mesh>
      </group>
      <group ref={drone} name="p10-raid-patrol">
        <mesh>
          <boxGeometry args={[0.8, 0.3, 0.6]} />
          <ToonMaterial color="#7b8e9e" />
        </mesh>
        <mesh position={[0.41, 0, 0]}>
          <sphereGeometry args={[0.12, 8, 6]} />
          <meshBasicMaterial color="#ed8464" />
        </mesh>
        {[-0.45, 0.45].map((z) => (
          <mesh key={z} position={[0, 0.15, z]}>
            <boxGeometry args={[1.2, 0.04, 0.12]} />
            <ToonMaterial color="#334858" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
