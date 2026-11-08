export const TELEPORT_SECONDS = 1.15;
const smooth = (t) => t * t * (3 - 2 * t);
export function sampleTeleport(seconds) {
  const t = Math.max(0, Math.min(TELEPORT_SECONDS, seconds));
  if (t < 0.28) {
    const p = smooth(t / 0.28);
    return { phase: 'charge', distance: 0, fov: -7 * p, dissolve: p, local: p };
  }
  if (t < 0.83) {
    const p = smooth((t - 0.28) / 0.55);
    return { phase: 'dash', distance: p, fov: -7 + 19 * p, dissolve: 1, local: p };
  }
  const p = smooth((t - 0.83) / 0.32);
  return { phase: 'settle', distance: 1, fov: 12 * (1 - p), dissolve: 1 - p, local: p };
}
