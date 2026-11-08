import { Vector3, Quaternion, Matrix4 } from 'three';
import { buildTravelCurve } from '../space/world';
import { useWorldMap, landingFor } from './navigationStore';
import { TELEPORT_SECONDS, sampleTeleport } from './teleportTimeline';
// Called by the sole character camera writer. No second useFrame camera controller.
export function advanceTeleport({ flight, body, camera, motion, look, dt, reduced }) {
  const nav = useWorldMap.getState();
  if (!nav.active) {
    flight.current = null;
    return false;
  }
  if (!flight.current || flight.current.request !== nav.request) {
    const end = new Vector3(...landingFor(nav.destination)),
      start = new Vector3().copy(body.translation());
    const head = end.clone().add(new Vector3(0, 0.48, 0));
    const forward = new Vector3(
      Math.sin(look.yaw) * Math.cos(look.pitch),
      Math.sin(look.pitch),
      Math.cos(look.yaw) * Math.cos(look.pitch),
    );
    const endCamera = head.clone();
    // Preserve current FPS/TPS blend and view direction at arrival.
    endCamera.addScaledVector(forward, -4.2 * (1 - motion.blend));
    const endQ = new Quaternion().setFromRotationMatrix(
      new Matrix4().lookAt(endCamera, endCamera.clone().add(forward), camera.up),
    );
    flight.current = {
      request: nav.request,
      time: 0,
      start,
      end,
      startCamera: camera.position.clone(),
      endCamera,
      startQ: camera.quaternion.clone(),
      endQ,
      baseFov: camera.fov,
      cameraCurve: buildTravelCurve(
        camera.position.clone().add(new Vector3(0, 0, 0.12).applyQuaternion(camera.quaternion)),
        endCamera,
        6,
      ),
      playerCurve: buildTravelCurve(start, end, 6),
      scratch: new Vector3(),
    };
    motion.vy = 0;
    motion.jumpHeld = false;
  }
  const f = flight.current;
  f.time += Math.min(dt, 0.05);
  if (reduced) f.time = TELEPORT_SECONDS;
  const sample = sampleTeleport(f.time);
  if (nav.phase !== sample.phase) useWorldMap.setState({ phase: sample.phase });
  const position = f.playerCurve.getPointAt(sample.distance, f.scratch);
  body.setTranslation(position, true);
  body.setNextKinematicTranslation(position);
  camera.position.copy(f.cameraCurve.getPointAt(sample.distance));
  if (sample.phase === 'charge')
    camera.position
      .copy(f.startCamera)
      .addScaledVector(new Vector3(0, 0, 1).applyQuaternion(f.startQ), 0.12 * sample.local);
  if (sample.phase === 'settle') camera.position.y += Math.sin(Math.PI * sample.local) * 0.12;
  camera.quaternion.slerpQuaternions(f.startQ, f.endQ, sample.distance);
  camera.fov = f.baseFov + sample.fov;
  camera.updateProjectionMatrix();
  motion.dissolve = sample.dissolve;
  camera.userData.cameraOwner = 'p9-teleport';
  camera.userData.teleport = {
    phase: sample.phase,
    time: f.time,
    destination: nav.destination,
    dissolve: sample.dissolve,
    request: f.request,
  };
  camera.userData.player = { x: position.x, y: position.y, z: position.z, grounded: false };
  useWorldMap.setState({ position: position.toArray(), yaw: look.yaw });
  if (f.time >= TELEPORT_SECONDS) {
    body.setTranslation(f.end, true);
    body.setNextKinematicTranslation(f.end);
    motion.vy = 0;
    motion.grounded = false;
    motion.dissolve = 0;
    camera.position.copy(f.endCamera);
    camera.quaternion.copy(f.endQ);
    camera.fov = f.baseFov;
    camera.updateProjectionMatrix();
    flight.current = null;
    delete camera.userData.teleport;
    useWorldMap.getState().finish();
  }
  return true;
}
