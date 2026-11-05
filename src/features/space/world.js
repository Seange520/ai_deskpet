import { CatmullRomCurve3, Vector3 } from 'three';
import { ISLAND_HUD } from './spaceLayout.js';

export const HUB = [0, 0, 0];
export const RING_RADIUS = 16;
export const TRAVEL_SECONDS = 2.3;

function island(id, radial, accent, fov) {
  const [x, z] = radial;
  const position = [x * RING_RADIUS, 0, z * RING_RADIUS];
  const cameraPosition = [position[0] + x * 11 + z * 3, 6.7, position[2] + z * 11 - x * 3];
  const focus = [position[0], 1.15, position[2]];
  const right = new Vector3(...focus)
    .sub(new Vector3(...cameraPosition))
    .cross(new Vector3(0, 1, 0))
    .normalize();
  const target = new Vector3(...focus).addScaledVector(
    right,
    ISLAND_HUD[id].side === 'left' ? -4.2 : 4.2,
  );
  target.y = 0.58;
  return {
    id,
    position,
    accent,
    camera: { position: cameraPosition, target: target.toArray(), focus, fov },
    hud: ISLAND_HUD[id],
  };
}

export const ISLANDS = {
  dashboard: island('dashboard', [0, 1], '#f9bf94', 43),
  hardware: island('hardware', [1, 0], '#80dcce', 43),
  code: island('code', [0, -1], '#aaa4ff', 42),
  ranking: island('ranking', [-1, 0], '#e5a2c7', 44),
};

export function buildTravelCurve(start, end, arcLift = 5) {
  const middle = new Vector3().lerpVectors(start, end, 0.5);
  // A small outward bow keeps the horizon moving laterally as the camera climbs.
  const outward = new Vector3(middle.x - HUB[0], 0, middle.z - HUB[2]).normalize();
  middle.addScaledVector(outward, arcLift * 0.42);
  middle.y += Math.max(0, arcLift - Math.abs(start.y - end.y) / 2);
  return new CatmullRomCurve3([start.clone(), middle, end.clone()]);
}
