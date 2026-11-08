import { caseMetadata, restoreCaseMetadata } from '../resonance/casePersistence.mjs';
import { create } from 'zustand';
import { useWorldMap } from '../world/navigationStore';
import { useExploration } from '../world/explorationState';
import { STREET, REWARD, freshCircuit, actCircuit, advanceCircuit } from './circuit.mjs';
export const STREET_SAVE = 'sparkmate.seventh-checksum.street.v1';
function readReward() {
  try {
    const d=JSON.parse(localStorage.getItem(STREET_SAVE));
    return d?.version===1&&d.completed===true&&d.xp===120&&d.prisms===1;
  } catch {
    return false;
  }
}
const completed = readReward();
function readCase(){try{return restoreCaseMetadata(JSON.parse(localStorage.getItem(STREET_SAVE))?.resonanceCase);}catch{return {};}}
function saveCase(s){if(!s.modifiers&&!s.resonanceAttempts)return;try{const d=JSON.parse(localStorage.getItem(STREET_SAVE)||'{}');localStorage.setItem(STREET_SAVE,JSON.stringify({...d,resonanceCase:caseMetadata(s)}));}catch{/* store reports reward write errors separately */}}

export function inStreetRange() {
  const [x, , z] = useWorldMap.getState().position;
  return Math.hypot(x - STREET.origin[0], z) < STREET.range;
}
export const useStreet = create((set, get) => ({
  ...freshCircuit(completed),
  ...readCase(),
  xp: completed ? REWARD.xp : 0,
  prisms: completed ? REWARD.prisms : 0,
  dialogue: 0,
  storageError: false,
    modifiers: null,
    setModifiers: modifiers => set({modifiers}),
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
    const next=actCircuit(get(), action, get().modifiers);
    set(next);saveCase(next);
  },
  tick: (dt) => {
    const before = get(),
      next = advanceCircuit(before, dt, before.modifiers);
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
  closeScanner: () => set(get().verifying ? {scanner:false,verifying:false} : {scanner:false}),
}));
