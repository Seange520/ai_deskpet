// X/Z plane in metres; analytic slab intersections, no pathfinding.
export const DETECTION = Object.freeze({
  path: [
    [25, 7],
    [41, 7],
    [41, 8],
    [25, 8],
  ],
  speed: 1.4,
  viewRange: 9,
  fovDeg: 70,
  hearRange: 6,
  seenPerSec: 20,
  heardPerEvent: 8,
});
export const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export function patrolAt(path, speed, seconds) {
  const lengths = path.map((p, i) => distance(p, path[(i + 1) % path.length]));
  const total = lengths.reduce((a, b) => a + b, 0);
  if (!total) return { position: [...path[0]], heading: 0 };
  let travel = (((seconds * speed) % total) + total) % total;
  for (let i = 0; i < path.length; i++) {
    if (travel <= lengths[i] && lengths[i] > 0) {
      const a = path[i],
        b = path[(i + 1) % path.length],
        f = travel / lengths[i];
      return {
        position: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f],
        heading: Math.atan2(b[1] - a[1], b[0] - a[0]),
      };
    }
    travel -= lengths[i];
  }
  return { position: [...path[0]], heading: 0 };
}
export function intersectsBox(a, b, box) {
  let lo = 0,
    hi = 1;
  for (let axis = 0; axis < 2; axis++) {
    const d = b[axis] - a[axis];
    if (Math.abs(d) < 1e-9) {
      if (a[axis] < box.min[axis] || a[axis] > box.max[axis]) return false;
    } else {
      const t1 = (box.min[axis] - a[axis]) / d,
        t2 = (box.max[axis] - a[axis]) / d;
      lo = Math.max(lo, Math.min(t1, t2));
      hi = Math.min(hi, Math.max(t1, t2));
      if (lo > hi) return false;
    }
  }
  return hi > 0 && lo < 1;
}
export function visible(drone, player, boxes = [], config = DETECTION) {
  const d = distance(drone.position, player);
  if (d > config.viewRange) return false;
  if (d > 1e-9) {
    const angle =
      Math.atan2(player[1] - drone.position[1], player[0] - drone.position[0]) - drone.heading;
    if (Math.cos(angle) < Math.cos((config.fovDeg * Math.PI) / 360)) return false;
  }
  return !boxes.some((box) => intersectsBox(drone.position, player, box));
}
export function noiseLevel({ crouched = false, stationary = false, silent = false } = {}) {
  return silent ? 0 : (crouched ? 0.5 : 1) * (stationary ? 0.3 : 1);
}
export function heard(drone, player, stance = {}, config = DETECTION) {
  return distance(drone.position, player) <= config.hearRange ? noiseLevel(stance) : 0;
}
