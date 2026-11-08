import VisualAvatar from './VisualAvatar';
import PlayerContactShadow from './PlayerContactShadow';
import RockFinish from './RockFinish';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { KeyboardControls, useKeyboardControls } from '@react-three/drei';
import {
  Physics,
  RigidBody,
  CuboidCollider,
  CylinderCollider,
  useRapier,
  useBeforePhysicsStep,
} from '@react-three/rapier';
import Ecctrl, { useJoystickControls } from 'ecctrl';
import { Vector3, Raycaster } from 'three';
import PetDissolve from '../space/PetDissolve';
import useReducedMotionPreference from '../../lib/useReducedMotionPreference';
import { useWorldMap } from './navigationStore';
import { advanceTeleport } from './teleportRig';
import WorldScene from './WorldScene';
import { ANCHORS } from './poi';
import { look, useExploration } from './explorationState';

const MAP = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'leftward', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'rightward', keys: ['KeyD', 'ArrowRight'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
];
function TerrainColliders() {
  return (
    <>
      <CylinderCollider args={[0.3, 3.98]} position={[0, -0.292, 0]} />
      {ANCHORS.map((a) => (
        <CylinderCollider
          key={a.id}
          args={[0.5, 4.78]}
          position={[a.position[0], -0.492, a.position[2]]}
        />
      ))}
      {ANCHORS.map((a) => (
        <CuboidCollider
          key={'bridge' + a.id}
          args={a.position[0] ? [4.5, 0.12, 1.2] : [1.2, 0.12, 4.5]}
          position={[a.position[0] / 2, -0.14, a.position[2] / 2]}
        />
      ))}
      {Array.from({ length: 64 }, (_, i) => {
        const t = (i / 64) * Math.PI * 2;
        return (
          <CuboidCollider
            key={i}
            args={[1.1, 0.15, 0.84]}
            position={[Math.cos(t) * 16, -0.19, Math.sin(t) * 16]}
            rotation={[0, -t, 0]}
          />
        );
      })}
      <CuboidCollider
        args={[1.175, 0.1, Math.sqrt(8) / 2]}
        position={[0, 0.93, 4.5]}
        rotation={[-Math.PI / 4, 0, 0]}
      />
      <CuboidCollider args={[1.175, 1, 1]} position={[0, 1, 6.5]} />
      <CuboidCollider args={[1.175, 1.25, 1]} position={[0, 1.25, 8.5]} />
      <CuboidCollider
        args={[1.175, 0.1, Math.sqrt(12.5) / 2]}
        position={[0, 1.18, 10.75]}
        rotation={[Math.PI / 4, 0, 0]}
      />
      {ANCHORS.map((a) => (
        <CuboidCollider
          key={'symbol' + a.id}
          args={
            a.id === 'hardware'
              ? [0.5, 1.85, 1.8]
              : a.id === 'dashboard'
                ? [1.5, 0.8, 1.6]
                : [1.8, 2, 1]
          }
          position={[a.position[0], a.id === 'dashboard' ? 0.8 : 2, a.position[2]]}
        />
      ))}
    </>
  );
}

const STEP = 1 / 60;
function Course() {
  return (
    <group name="p9-m1-course">
      <mesh position={[0, 0.93, 4.5]} rotation={[-Math.PI / 4, 0, 0]}>
        <boxGeometry args={[2.35, 0.2, Math.sqrt(8)]} />
        <RockFinish color="#8fa5a3" />
      </mesh>
      <mesh position={[0, 1, 6.5]}>
        <boxGeometry args={[2.35, 2, 2]} />
        <RockFinish color="#8fa5a3" />
      </mesh>
      <mesh name="p9-step-0.5m" position={[0, 1.25, 8.5]}>
        <boxGeometry args={[2.35, 2.5, 2]} />
        <RockFinish color="#b6a18a" />
      </mesh>
      <mesh position={[0, 1.18, 10.75]} rotation={[Math.PI / 4, 0, 0]}>
        <boxGeometry args={[2.35, 0.2, Math.sqrt(12.5)]} />
        <RockFinish color="#a6b7c6" />
      </mesh>
    </group>
  );
}
function Player({ paused, inputElement }) {
  const bodyData = useMemo(() => ({ canJump: false }), []);
  const reduced = useReducedMotionPreference(),
    shell = useRef(null),
    flight = useRef(null);
  const body = useRef(null),
    model = useRef(null),
    controller = useRef(null);
  const motion = useRef({
    vy: 0,
    grounded: false,
    jumpHeld: false,
    blend: 0,
    initialized: false,
    steps: 0,
  });
  const [, getKeys] = useKeyboardControls();
  const { world, rapier } = useRapier();
  const { camera, scene } = useThree();
  const scratch = useMemo(
    () => ({
      head: new Vector3(),
      ideal: new Vector3(),
      forward: new Vector3(),
      direction: new Vector3(),
      tps: new Vector3(),
      target: new Vector3(),
      ray: new Raycaster(),
      offset: new Vector3(),
      previous: new Vector3(),
    }),
    [],
  );
  useEffect(() => {
    const kcc = world.createCharacterController(0.015);
    kcc.setMaxSlopeClimbAngle(Math.PI / 4 + 0.002);
    kcc.setMinSlopeSlideAngle(Math.PI / 4 + 0.01);
    kcc.enableAutostep(0.51, 0.2, false);
    kcc.enableSnapToGround(0.25);
    controller.current = kcc;
    return () => {
      controller.current = null;
      world.removeCharacterController(kcc);
    };
  }, [world]);
  // ecctrl's camera is disabled; its private pivot is removed on unmount.
  useEffect(() => {
    const pivots = scene.children.filter(
      (o) => o.type === 'Object3D' && o.children.length === 1 && o.children[0].type === 'Object3D',
    );
    return () => pivots.forEach((o) => scene.remove(o));
  }, [scene]);
  useBeforePhysicsStep(() => {
    const rb = body.current,
      kcc = controller.current;
    if (!rb || !kcc) return;
    if (useWorldMap.getState().active || useWorldMap.getState().open) return;
    const state = motion.current,
      keys = getKeys(),
      joy = useJoystickControls.getState();
    const blocked = paused || useExploration.getState().blocked;
    const focused = document.activeElement === inputElement;
    let x = focused && !blocked ? Number(keys.leftward) - Number(keys.rightward) : 0;
    let z = focused && !blocked ? Number(keys.forward) - Number(keys.backward) : 0;
    if (!blocked && joy.curJoystickDis > 0) {
      x += Math.cos(joy.curJoystickAng);
      z += Math.sin(joy.curJoystickAng);
    }
    const len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    const speed = (focused && keys.run) || joy.curRunState ? 4.2 : 2.5;
    const sin = Math.sin(look.yaw),
      cos = Math.cos(look.yaw);
    const dx = (x * cos + z * sin) * speed * STEP,
      dz = (-x * sin + z * cos) * speed * STEP;
    const jump =
      !blocked &&
      ((focused && keys.jump) ||
        useExploration.getState().jump ||
        useExploration.getState().jumpQueued);
    if (blocked) {
      state.jumpHeld = false;
      state.vy = 0;
      return;
    }
    if (jump && !state.jumpHeld && state.grounded) state.vy = 5;
    state.jumpHeld = jump;
    if (useExploration.getState().jumpQueued) useExploration.setState({ jumpQueued: false });
    state.vy = Math.max(-18, state.vy - 9.81 * STEP);
    kcc.computeColliderMovement(
      rb.collider(0),
      { x: dx, y: state.vy * STEP, z: dz },
      rapier.QueryFilterFlags.EXCLUDE_SENSORS,
    );
    const move = kcc.computedMovement(),
      pos = rb.translation();
    rb.setNextKinematicTranslation({ x: pos.x + move.x, y: pos.y + move.y, z: pos.z + move.z });
    state.grounded = kcc.computedGrounded();
    if ((state.grounded && state.vy < 0) || (move.y < state.vy * STEP - 0.001 && state.vy > 0))
      state.vy = 0;
    state.steps++;
    if (pos.y < -12) {
      rb.setTranslation({ x: 0, y: 1.2, z: 1.6 }, true);
      state.vy = 0;
    }
    if (model.current) model.current.rotation.y = look.yaw + (len > 0 ? Math.atan2(x, z) : 0);
    rb.userData = {
      ...rb.userData,
      grounded: state.grounded,
      physicsSteps: state.steps,
      nativeKCC: true,
      vy: state.vy,
    };
  });
  useFrame((_, dt) => {
    const rb = body.current;
    if (!rb || paused || useExploration.getState().blocked) return;
    if (useWorldMap.getState().open) return;
    if (advanceTeleport({ flight, body: rb, camera, motion: motion.current, look, dt, reduced })) {
      if (model.current) model.current.visible = true;
      return;
    }
    const state = motion.current,
      s = scratch,
      pos = rb.translation();
    const k = 1 - Math.exp(-12 * Math.min(dt, 0.05));
    state.blend += ((useExploration.getState().fps ? 1 : 0) - state.blend) * k;
    s.head.set(pos.x, pos.y + 0.48, pos.z);
    s.forward.set(
      Math.sin(look.yaw) * Math.cos(look.pitch),
      Math.sin(look.pitch),
      Math.cos(look.yaw) * Math.cos(look.pitch),
    );
    s.tps.copy(s.head).addScaledVector(s.forward, -4.2);
    s.direction.subVectors(s.tps, s.head).normalize();
    s.ray.set(s.head, s.direction);
    s.ray.far = 4.2;
    const terrain = scene.getObjectByName('p9-world-graybox'),
      course = scene.getObjectByName('p9-m1-course'),
      assets = scene.getObjectByName('p9-blender-assets');
    const hit = s.ray
      .intersectObjects([terrain, course, assets].filter(Boolean), true)
      .find((h) => h.distance > 0.1);
    if (hit) s.tps.copy(s.head).addScaledVector(s.direction, Math.max(0.15, hit.distance - 0.18));
    s.ideal.lerpVectors(s.tps, s.head, state.blend);
    if (!state.initialized) {
      camera.position.copy(s.ideal);
      state.initialized = true;
    } else camera.position.lerp(s.ideal, 1 - Math.exp(-18 * Math.min(dt, 0.05)));
    s.target.copy(camera.position).addScaledVector(s.forward, 10);
    camera.lookAt(s.target);
    camera.fov += (65 + state.blend * 7 - camera.fov) * k;
    camera.near = 0.06;
    camera.far = 165;
    camera.updateProjectionMatrix();
    camera.userData.cameraOwner = 'p9-character';
    camera.userData.fpsBlend = state.blend;
    camera.userData.player = {
      x: pos.x,
      y: pos.y,
      z: pos.z,
      grounded: state.grounded,
      physicsSteps: state.steps,
    };
    if (model.current) model.current.visible = state.blend < 0.85;
    state.mapClock = (state.mapClock || 0) + Math.min(dt, 0.05);
    if (state.mapClock >= 0.1) {
      state.mapClock = 0;
      useWorldMap.setState({ position: [pos.x, pos.y, pos.z], yaw: look.yaw });
    }
  }, -0.1);
  useEffect(
    () => () => {
      delete camera.userData.cameraOwner;
      delete camera.userData.fpsBlend;
      delete camera.userData.player;
      delete camera.userData.teleport;
      useWorldMap.getState().reset();
    },
    [camera],
  );
  return (
    <Ecctrl
      ref={body}
      name="p9-player"
      userData={bodyData}
      type="kinematicPosition"
      position={[0, 1.1, 1.6]}
      capsuleHalfHeight={0.35}
      capsuleRadius={0.3}
      disableControl
      disableFollowCam
      camCollision={false}
      camListenerTarget="none"
      autoBalance={false}
      enabledRotations={[false, false, false]}
      friction={0}
    >
      <group ref={shell} name="p9-player-shell">
        <group ref={model} name="command-pet">
          <VisualAvatar />
        </group>
        <PetDissolve pet={shell} paused={paused} amount={() => motion.current.dissolve || 0} />
      </group>
    </Ecctrl>
  );
}
export default function Exploration({ paused, inputElement }) {
  const blocked = useExploration((s) => s.blocked);
  const mapOpen = useWorldMap((s) => s.open);
  if (!inputElement) return null;
  // Wait for the real input surface before creating the physics/player world.
  return (
    <KeyboardControls
      key={inputElement ? 'ready' : 'waiting'}
      map={MAP}
      domElement={inputElement || new EventTarget()}
    >
      <Physics
        timeStep={STEP}
        paused={paused || blocked || mapOpen}
        gravity={[0, -9.81, 0]}
        interpolate
      >
        <WorldScene
          survey={false}
          paused={paused || blocked}
          colliderWrapper={({ key, position, half }) => (
            <RigidBody key={key} type="fixed" colliders={false} position={position}>
              <CuboidCollider args={half} />
            </RigidBody>
          )}
          terrainWrapper={(geometry) => (
            <RigidBody type="fixed" colliders={false} name="p9-terrain">
              <TerrainColliders />
              {geometry}
              <Course />
            </RigidBody>
          )}
        />
        <Player paused={paused || blocked} inputElement={inputElement} />
        <PlayerContactShadow/>
      </Physics>
    </KeyboardControls>
  );
}
