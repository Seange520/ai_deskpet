import { caseMetadata, restoreCaseMetadata, cleanCompletion } from '../resonance/casePersistence.mjs';
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
    const raw=localStorage.getItem(KICKBACK_SAVE),s=restoreKickback(raw),d=JSON.parse(raw||'{}');
    return {...s,...restoreCaseMetadata(d.resonanceCase),completionHistory:s.completed&&Array.isArray(d.completionHistory)?d.completionHistory.filter(h=>h?.completed===true).slice(-10):[]};
  } catch {
    return freshKickback();
  }
}
export const useKickback = create((set, get) => {
  function save(state) {
    try {
      const data=JSON.parse(serializeKickback(state));
      if(state.resonanceAttempts||state.modifiers)data.resonanceCase=caseMetadata(state);
      data.completionHistory=state.completionHistory||[];
      localStorage.setItem(KICKBACK_SAVE,JSON.stringify(data));
    } catch {
      set({ storageError: true });
    }
  }
  return {
    ...read(),
    encountered: false,
    storageError: false,
    modifiers: null,
    setModifiers: modifiers => set({modifiers}),
    dispatch: (action) => {
      const nav = useWorldMap.getState();
      if (!nearKickback() || nav.open || nav.active || useExploration.getState().blocked) return;
      const next = actKickback(get(), action, get().modifiers);
      set(next);
      if (['lesson', 'hypotheses', 'measure', 'diagnose', 'install'].includes(action.type))
        save(next);
    },
    tick: (dt) => {
      const before = get(),
        next = advanceKickback(before, dt, before.modifiers);
      if(!before.completed&&next.completed)next.completionHistory=[...(before.completionHistory||[]),{completed:true,clean:cleanCompletion(next)}];
      set(next);
      if ((!before.completed && next.completed)||next.resonanceDodgeUsed!==before.resonanceDodgeUsed) save(next);
    },
    encounter: () => {
      if (get().encountered) return;
      set({ ...actKickback(get(), { type: 'enter' }), encountered: true });
    },
    suspendView: () => set(get().verifying ? {open:false,courseOpen:false,scanner:false,verifying:false} : {open:false,courseOpen:false,scanner:false}),
  };
});
