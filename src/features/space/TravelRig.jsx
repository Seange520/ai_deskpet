import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { buildTravelCurve, LANDMARKS } from './world';
import { sampleTravel, TRAVEL_SECONDS } from './travelTimeline';
import { HUD_EXIT_MS } from './spaceLayout';
import { isSpaceTransition, useSpaceStore } from './spaceStore';

const shakeNoise = new SimplexNoise();

function getPose(id, camera) {
  const landmark = LANDMARKS[id];
  const spec = landmark.detailPose ?? landmark.camera;
  const position = new Vector3(...spec.position);
  const focus = new Vector3(...spec.focus);
  const target = new Vector3(...spec.target);
  if (id === 'hub') {
    // Back the overview camera away on narrow screens so the four anchors fit.
    position
      .sub(target)
      .multiplyScalar(Math.min(2, Math.max(1, 1.12 / camera.aspect)))
      .add(target);
  }
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

export default function TravelRig({ reduced, paused, focusTarget, travelProgress }) {
  const invalidate = useThree((state) => state.invalidate);
  const regress = useThree((state) => state.performance.regress);
  const state = useRef({
    flight: null,
    pose: null,
    request: -1,
    sample: {},
    pausedAt: 0,
    idleAt: 0,
  });
  const motion = useRef({ x: 0, y: 0 });
  const scratch = useMemo(
    () => ({
      right: new Vector3(),
      up: new Vector3(),
      angles: new Euler(),
      shake: new Quaternion(),
    }),
    [],
  );
  useLayoutEffect(() => {
    const unsubscribe = useSpaceStore.subscribe(() => invalidate());
    const resize = () => {
      state.current.pose = null;
      state.current.flight = null;
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
    const rig = state.current;
    if (paused) {
      rig.pausedAt = performance.now();
      return;
    }
    if (rig.pausedAt && rig.flight) rig.flight.startedAt += performance.now() - rig.pausedAt;
    rig.pausedAt = 0;
    invalidate();
  }, [paused, invalidate]);
  useLayoutEffect(() => {
    if (paused || reduced || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const reset = () => {
      motion.current = { x: 0, y: 0 };
      invalidate();
    };
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
    window.addEventListener('pointermove', move, { passive: true, capture: true });
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('blur', reset);
      motion.current = { x: 0, y: 0 };
    };
  }, [paused, reduced, invalidate]);

  useFrame(({ camera }) => {
    if (paused) return;
    const store = useSpaceStore.getState();
    const rig = state.current;
    const now = performance.now();

    if (!reduced && isSpaceTransition(store.phase)) {
      if (rig.flight?.request !== store.request) {
        const pose = getPose(store.destination, camera);
        const curve = buildTravelCurve(camera.position, pose.position, 2.8);
        motion.current = { x: 0, y: 0 };
        travelProgress.current = 0;
        rig.flight = {
          request: store.request,
          startedAt: rig.flight
            ? Math.max(now, rig.flight.startedAt)
            : now + (store.focus === 'hub' ? 0 : HUD_EXIT_MS),
          pose,
          curve,
          endTangent: curve.getTangentAt(1),
          length: curve.getLength(),
          fromQuaternion: camera.quaternion.clone(),
          fromFocus: focusTarget.clone(),
          fromFov: camera.fov,
        };
      }
      const flight = rig.flight;
      if (now >= flight.startedAt) {
        const elapsed = Math.min(TRAVEL_SECONDS, (now - flight.startedAt) / 1000);
        travelProgress.current = elapsed / TRAVEL_SECONDS;
        const sample = sampleTravel(elapsed, rig.sample);
        const distance = Math.min(1, sample.distance);
        camera.userData.travelStage = sample.stage;
        camera.userData.travelStageProgress = sample.phaseProgress;
        flight.curve.getPointAt(distance, camera.position);
        camera.position.addScaledVector(
          flight.endTangent,
          (sample.distance - distance) * flight.length,
        );
        camera.quaternion.slerpQuaternions(flight.fromQuaternion, flight.pose.quaternion, distance);
        if (sample.shake) {
          const time = elapsed * 14;
          scratch.angles.set(
            shakeNoise.noise(time, 0.5) * sample.shake,
            shakeNoise.noise(time, 2.3) * sample.shake,
            shakeNoise.noise(time, 4.1) * sample.shake * 0.6,
          );
          camera.quaternion.multiply(scratch.shake.setFromEuler(scratch.angles));
        }
        // Keep the launch breathing room and converge to the close lens through the approach.
        const approach = distance * distance * (3 - 2 * distance);
        camera.fov =
          flight.fromFov +
          (flight.pose.fov - flight.fromFov) * approach +
          sample.fov * (store.phase === 'entering' ? 0.55 : 1);
        camera.updateProjectionMatrix();
        focusTarget.lerpVectors(flight.fromFocus, flight.pose.focus, distance);
        if (elapsed === TRAVEL_SECONDS) {
          applyPose(camera, focusTarget, flight.pose);
          rig.pose = flight.pose;
          rig.request = store.request;
          rig.flight = null;
          rig.idleAt = now;
          store.arrived(store.request);
        }
      }
      invalidate();
      return;
    }

    travelProgress.current = 0;
    camera.userData.travelStage = 'idle';
    if (!rig.pose || rig.request !== store.request || rig.flight) {
      rig.pose = getPose(store.focus, camera);
      rig.request = store.request;
      rig.flight = null;
      rig.idleAt = now;
      applyPose(camera, focusTarget, rig.pose);
    }
    if (reduced) return;
    if (store.phase === 'idle') {
      scratch.right.set(1, 0, 0).applyQuaternion(rig.pose.quaternion);
      scratch.up.set(0, 1, 0).applyQuaternion(rig.pose.quaternion);
      const breathe = Math.sin((now - rig.idleAt) * 0.00115) * 0.055;
      camera.position
        .copy(rig.pose.position)
        .addScaledVector(scratch.right, motion.current.x * 0.11)
        .addScaledVector(scratch.up, breathe - motion.current.y * 0.065);
    }
    // Keep the Stage performance monitor and shader animation sampling active.
    invalidate();
  }, -0.5);

  return null;
}
