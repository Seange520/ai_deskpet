import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { buildTravelCurve, ISLANDS, TRAVEL_SECONDS } from './world';
import { HUD_EXIT_MS } from './spaceLayout';
import { useSpaceStore } from './spaceStore';

const easeInOut = (t) => t * t * (3 - 2 * t);
const widescreen = () => window.innerWidth >= 1440;

function getPose(id, camera) {
  const spec = ISLANDS[id].camera;
  const position = new Vector3(...spec.position);
  const focus = new Vector3(...spec.focus);
  const target = widescreen() ? new Vector3(...spec.target) : focus;
  const quaternion = new Quaternion().setFromRotationMatrix(
    new Matrix4().lookAt(position, target, camera.up),
  );
  return { position, focus, quaternion, fov: spec.fov };
}

function applyPose(camera, focusTarget, pose) {
  camera.position.copy(pose.position);
  camera.quaternion.copy(pose.quaternion);
  camera.fov = pose.fov;
  camera.updateProjectionMatrix();
  focusTarget.copy(pose.focus);
}

export default function TravelRig({ reduced, paused, focusTarget }) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const regress = useThree((state) => state.performance.regress);
  const state = useRef({
    flight: null,
    pose: null,
    request: -1,
    arrivingAt: 0,
    pausedAt: 0,
    idleAt: 0,
  });
  const motion = useRef({ x: 0, y: 0 });
  const scratch = useMemo(() => ({ right: new Vector3(), up: new Vector3() }), []);
  useLayoutEffect(() => {
    const unsubscribe = useSpaceStore.subscribe(() => invalidate());
    const resize = () => {
      state.current.pose = null;
      regress();
      invalidate();
    };
    window.addEventListener('resize', resize);
    invalidate();
    return () => {
      unsubscribe();
      window.removeEventListener('resize', resize);
    };
  }, [invalidate, regress]);
  useLayoutEffect(() => {
    if (paused) {
      state.current.pausedAt = performance.now();
      return;
    }
    const rig = state.current;
    if (rig.pausedAt && rig.flight) rig.flight.startedAt += performance.now() - rig.pausedAt;
    if (rig.pausedAt && rig.arrivingAt) rig.arrivingAt += performance.now() - rig.pausedAt;
    rig.pausedAt = 0;
    invalidate();
  }, [paused, invalidate]);
  useLayoutEffect(() => {
    if (reduced || paused || !matchMedia('(hover: hover) and (pointer: fine)').matches) {
      motion.current = { x: 0, y: 0 };
      return;
    }
    const move = (event) => {
      if (
        event.pointerType !== 'mouse' ||
        useSpaceStore.getState().phase !== 'idle' ||
        event.target.closest?.('[data-space-hud], .companion')
      ) {
        reset();
        return;
      }
      motion.current = {
        x: (event.clientX / innerWidth) * 2 - 1,
        y: (event.clientY / innerHeight) * 2 - 1,
      };
      invalidate();
    };
    const reset = () => {
      motion.current = { x: 0, y: 0 };
      invalidate();
    };
    window.addEventListener('pointermove', move, { passive: true, capture: true });
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('blur', reset);
    };
  }, [paused, reduced, invalidate]);

  useFrame(() => {
    if (paused) return;
    const store = useSpaceStore.getState();
    const rig = state.current;
    const now = performance.now();
    if (reduced && store.phase !== 'idle') {
      store.jumpTo(store.destination);
      applyPose(camera, focusTarget, getPose(store.destination, camera));
      rig.pose = null;
      rig.flight = null;
      return;
    }
    if (!rig.pose) {
      rig.pose = getPose(store.focus, camera);
      if (!rig.flight) applyPose(camera, focusTarget, rig.pose);
    }
    if (store.phase === 'departing' && rig.flight?.request !== store.request) {
      const pose = getPose(store.destination, camera);
      motion.current = { x: 0, y: 0 };
      rig.flight = {
        request: store.request,
        // Keep the original exit deadline on retarget; an airborne redirect starts immediately.
        startedAt: rig.flight ? Math.max(now, rig.flight.startedAt) : now + HUD_EXIT_MS,
        pose,
        curve: buildTravelCurve(camera.getWorldPosition(new Vector3()), pose.position),
        fromQuaternion: camera.getWorldQuaternion(new Quaternion()),
        fromFocus: focusTarget.clone(),
        fromFov: camera.fov,
      };
    }
    const flight = rig.flight;
    if (store.phase === 'departing') {
      if (now < flight.startedAt) {
        invalidate();
        return;
      }
      flight.startedAt = now;
      store.depart(store.request);
    }
    if (
      flight?.request === store.request &&
      (store.phase === 'departing' || store.phase === 'traveling')
    ) {
      const progress = Math.min(1, (now - flight.startedAt) / (TRAVEL_SECONDS * 1000));
      const t = easeInOut(progress);
      flight.curve.getPointAt(t, camera.position);
      camera.quaternion.slerpQuaternions(flight.fromQuaternion, flight.pose.quaternion, t);
      camera.fov = flight.fromFov + (flight.pose.fov - flight.fromFov) * t;
      camera.updateProjectionMatrix();
      focusTarget.lerpVectors(flight.fromFocus, flight.pose.focus, t);
      if (progress === 1) {
        applyPose(camera, focusTarget, flight.pose);
        rig.pose = flight.pose;
        rig.request = store.request;
        rig.flight = null;
        rig.arrivingAt = now;
        rig.idleAt = now;
        store.arrived(store.request);
      }
      invalidate();
      return;
    }
    if (rig.request !== store.request || reduced) {
      rig.pose = getPose(store.focus, camera);
      rig.request = store.request;
      rig.flight = null;
      rig.idleAt = now;
      applyPose(camera, focusTarget, rig.pose);
    }
    if (store.phase === 'arriving' && now - rig.arrivingAt >= 320) store.settle(store.request);
    if (reduced) return;
    // Camera-local parallax plus a small vertical breathe around the settled pose.
    scratch.right.set(1, 0, 0).applyQuaternion(rig.pose.quaternion);
    scratch.up.set(0, 1, 0).applyQuaternion(rig.pose.quaternion);
    const breathe = Math.sin((now - rig.idleAt) * 0.00115) * 0.055;
    camera.position
      .copy(rig.pose.position)
      .addScaledVector(scratch.right, motion.current.x * 0.11)
      .addScaledVector(scratch.up, breathe - motion.current.y * 0.065);
    invalidate();
  }, -0.5);

  return null;
}
