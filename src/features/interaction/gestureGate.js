// Require stable, high-confidence recognition; hold gestures do not repeat actions.
export function createGestureGate({ stableMs = 150, cooldownMs = 1200, score = 0.65 } = {}) {
  let candidate = '',
    since = 0,
    fired = '',
    lastFire = -Infinity;
  return {
    update(category, confidence, now) {
      const name =
        ['Open_Palm', 'Closed_Fist'].includes(category) && confidence >= score ? category : '';
      if (candidate !== name) {
        candidate = name;
        since = now;
      }
      if (!name) {
        if (now - since >= 350) fired = '';
        return null;
      }
      if (now - since < stableMs || fired === name || now - lastFire < cooldownMs) return null;
      fired = name;
      lastFire = now;
      return name === 'Open_Palm' ? 'jump' : 'sleep';
    },
  };
}
