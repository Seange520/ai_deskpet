import { create } from 'zustand';
import { useWorldMap } from '../world/navigationStore';
import { useExploration } from '../world/explorationState';
import { STREET, REWARD, freshCircuit, actCircuit, advanceCircuit } from './circuit.mjs';
export const STREET_SAVE = 'sparkmate.seventh-checksum.street.v1';
function readReward() {
  try {
    return JSON.parse(localStorage.getItem(STREET_SAVE))?.completed === true;
  } catch {
    return false;
  }
}
const completed = readReward();
export function inStreetRange() {
  const [x, , z] = useWorldMap.getState().position;
  return Math.hypot(x - STREET.origin[0], z) < STREET.range;
}
export const useStreet = create((set, get) => ({
  ...freshCircuit(completed),
  xp: completed ? REWARD.xp : 0,
  prisms: completed ? REWARD.prisms : 0,
  dialogue: 0,
  storageError: false,
  dispatch: (action) => {
    const nav = useWorldMap.getState();
    if (!inStreetRange() || nav.open || nav.active || useExploration.getState().blocked) return;
    if (action.type === 'dismissDialogue') {
      set({ dialogue: 0 });
      return;
    }
    if (action.type === 'talk') {
      if (get().completed) set({ dialogue: get().dialogue + 1 });
      else set({ message: '摊主：每隔七秒就暗一下，压缩机一响，客人都以为我要收摊。' });
      return;
    }
    set(actCircuit(get(), action));
  },
  tick: (dt) => {
    const before = get(),
      next = advanceCircuit(before, dt);
    if (!before.completed && next.completed) {
      next.xp = REWARD.xp;
      next.prisms = REWARD.prisms;
      next.dialogue = before.dialogue + 1;
      try {
        localStorage.setItem(
          STREET_SAVE,
          JSON.stringify({ version: 1, completed: true, xp: REWARD.xp, prisms: REWARD.prisms }),
        );
      } catch {
        next.storageError = true;
      }
    }
    set(next);
  },
  closeScanner: () => set({ scanner: false }),
}));
