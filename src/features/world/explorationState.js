import { create } from 'zustand';
// Session-only presentation/input. Never writes a teaching or quality store.
export const useExploration = create(() => ({
  fps: false,
  blocked: false,
  touch: false,
  jump: false,
  jumpQueued: false,
}));
export const look = { yaw: 0, pitch: -0.12 };
export function resetExploration() {
  useExploration.setState({ fps: false, blocked: false, jump: false, jumpQueued: false });
  look.yaw = 0;
  look.pitch = -0.12;
}
