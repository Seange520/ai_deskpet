import { create } from 'zustand';
import { useWorldMap } from '../world/navigationStore';
import { useExploration } from '../world/explorationState';
import {
  KICKBACK,
  KICKBACK_SAVE,
  freshKickback,
  restoreKickback,
  serializeKickback,
  actKickback,
  advanceKickback,
} from './kickback.mjs';
export function nearKickback() {
  const [x, , z] = useWorldMap.getState().position;
  return Math.hypot(x - KICKBACK.origin[0], z - KICKBACK.origin[2]) < KICKBACK.range;
}
function read() {
  try {
    return restoreKickback(localStorage.getItem(KICKBACK_SAVE));
  } catch {
    return freshKickback();
  }
}
export const useKickback = create((set, get) => {
  function save(state) {
    try {
      localStorage.setItem(KICKBACK_SAVE, serializeKickback(state));
    } catch {
      set({ storageError: true });
    }
  }
  return {
    ...read(),
    encountered: false,
    storageError: false,
    dispatch: (action) => {
      const nav = useWorldMap.getState();
      if (!nearKickback() || nav.open || nav.active || useExploration.getState().blocked) return;
      const next = actKickback(get(), action);
      set(next);
      if (['lesson', 'hypotheses', 'measure', 'diagnose', 'install'].includes(action.type))
        save(next);
    },
    tick: (dt) => {
      const before = get(),
        next = advanceKickback(before, dt);
      set(next);
      if (!before.completed && next.completed) save(next);
    },
    encounter: () => {
      if (get().encountered) return;
      set({ ...actKickback(get(), { type: 'enter' }), encountered: true });
    },
    suspendView: () => set({ open: false, courseOpen: false, scanner: false }),
  };
});
