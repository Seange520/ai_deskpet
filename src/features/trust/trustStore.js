import { create } from 'zustand';
import { TRUST_KEY, PRISMS_KEY, restoreTrust, reduceTrust, prismCount } from './trust.mjs';
import { emitSyncEvent } from '../resonance/resonanceBridge.mjs';
import { useKickback } from '../street/kickbackStore';
export function reportTrust(kind, act, evidenceId) {
  try {
    emitSyncEvent(kind, {
      caseId: 'trust:' + act,
      key: `trust:${act}:${kind}:${evidenceId}`,
      evidenceId,
    });
  } catch {
    /* Optional bridge may be unavailable at runtime. */
  }
}
let initial;
try {
  initial = restoreTrust(localStorage.getItem(TRUST_KEY));
} catch {
  initial = restoreTrust(null);
}
export const useTrust = create((set, get) => {
  let timer;
  const persist = () => {
    clearTimeout(timer);
    try {
      localStorage.setItem(TRUST_KEY, JSON.stringify(get().save));
      localStorage.setItem(PRISMS_KEY, String(prismCount(get().save)));
    } catch {
      set({ storageError: true });
    }
  };
  if (typeof window !== 'undefined') window.addEventListener('pagehide', persist);
  return {
    save: initial,
    storageError: false,
    flush: persist,
    dispatch: (event) => {
      const previous = get().save,
        next = reduceTrust(previous, event);
      if (JSON.stringify(previous) === JSON.stringify(next)) return;
      set({ save: next });
      clearTimeout(timer);
      timer = setTimeout(persist, 100);
    },
    reconcile: () => {
      if (useKickback.getState().completed) get().dispatch({ type: 'case', caseId: 'kickback' });
    },
  };
});
