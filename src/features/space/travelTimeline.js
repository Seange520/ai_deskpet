export const TRAVEL_SECONDS = 2.4;

const chargeEnd = 0.28;
const launchEnd = 0.83;
const cruiseEnd = 1.73;
const brakeEnd = 2.08;
const smooth = (t) => t * t * (3 - 2 * t);

export function sampleTravel(seconds, out) {
  let t;
  if (seconds < chargeEnd) {
    t = seconds / chargeEnd;
    out.stage = 'charge';
    out.distance = 0.035 * smooth(t);
    out.fov = 6 * smooth(t);
    out.shake = 0.003 * Math.sin(Math.PI * t);
  } else if (seconds < launchEnd) {
    t = (seconds - chargeEnd) / (launchEnd - chargeEnd);
    out.stage = 'launch';
    out.distance = 0.035 + 0.295 * t ** 3;
    out.fov = 6 + 6 * smooth(t);
    out.shake = 0.005 * Math.sin(Math.PI * t);
  } else if (seconds < cruiseEnd) {
    t = (seconds - launchEnd) / (cruiseEnd - launchEnd);
    const t2 = t * t;
    const t3 = t2 * t;
    // Hermite tangents match launch and brake velocities at the joins.
    const slopeIn = (0.295 * 3 * 0.9) / 0.55;
    const slopeOut = (0.12 * 2 * 0.9) / 0.35;
    out.stage = 'cruise';
    out.distance = 0.33 + 0.61 * smooth(t) + slopeIn * (t3 - 2 * t2 + t) + slopeOut * (t3 - t2);
    out.fov = 12 - 5 * smooth(t);
    out.shake = 0;
  } else if (seconds < brakeEnd) {
    t = (seconds - cruiseEnd) / (brakeEnd - cruiseEnd);
    out.stage = 'brake';
    out.distance = 0.94 + 0.12 * (1 - (1 - t) ** 2);
    out.fov = 7 - 11 * smooth(Math.min(1, t * 2.5));
    out.shake = 0.004 * Math.sin(Math.PI * t);
  } else {
    t = Math.min(1, (seconds - brakeEnd) / (TRAVEL_SECONDS - brakeEnd));
    out.stage = 'settle';
    out.distance = 1.06 - 0.06 * smooth(t);
    out.fov = 4 * (smooth(t) - 1);
    out.shake = 0;
  }
  out.phaseProgress = t;
  return out;
}
