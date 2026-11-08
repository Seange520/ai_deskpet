import { create } from 'zustand';
import { ENV_KEY, restoreEnv, runtime, actEnv, advanceCase, npcReaction } from './env.mjs';
import { pinClue, addHypothesis } from './caseBoard.mjs';
import { emitSyncEvent } from '../resonance/resonanceBridge.mjs';
let raw;
try {
  raw = localStorage.getItem(ENV_KEY);
} catch {
  /* Session fallback. */
}
export const useEnv = create((set, get) => {
  let timer,
    dirty = false;
  const flush = () => {
    clearTimeout(timer);
    if (!dirty) return;
    try {
      localStorage.setItem(ENV_KEY, JSON.stringify(get().save));
      dirty = false;
    } catch {
      set({ storageError: true });
    }
  };
  const update = (next) => {
    const changed = JSON.stringify(get().save) !== JSON.stringify(next.save);
    if (changed) next = { ...next, save: { ...next.save, updatedAt: new Date().toISOString() } };
    set(next);
    if (changed) {
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(flush, 100);
    }
  };
  if (typeof window !== 'undefined') window.addEventListener('pagehide', flush);
  const report = (kind, id) => {
    try {
      emitSyncEvent(kind, {
        caseId: 'env:seven_lamps',
        key: 'env:' + kind + ':' + id,
        evidenceId: id,
        readOnly: true,
      });
    } catch {
      /* Optional integration. */
    }
  };
  return {
    ...runtime(restoreEnv(raw)),
    storageError: false,
    flush,
    dispatch: (event) => {
      const before = get(),
        next = actEnv(before, event);
      update(next);
      if (event.type === 'measure' && next.reading?.ok)
        report('correctMeasure', next.reading.target + ':' + next.reading.category);
      if (event.type === 'wire' && !before.save.case.fixApplied && next.save.case.fixApplied)
        report('correctRepair', 'independent_ground');
      if (
        event.type === 'close' &&
        next.save.case.state === 'closed' &&
        before.save.case.state !== 'closed'
      )
        report('verifyPass', 'load');
    },
    tick: (dt) => update(advanceCase(get(), dt)),
    pin: (id, x, y) => {
      const s = get().save;
      update({ save: { ...s, board: pinClue(s.board, s.clues, id, x, y) } });
    },
    hypothesis: (id) => {
      const s = get().save;
      update({ save: { ...s, board: addHypothesis(s.board, id) } });
    },
    validate: () => report('correctDiagnose', 'evidence_categories'),
    react: (npc) => {
      const state = get(),
        reaction = npcReaction(state.save.npcReactions[npc], state.lastMeasurement);
      if (!reaction) return false;
      update({
        save: { ...state.save, npcReactions: { ...state.save.npcReactions, [npc]: reaction } },
      });
      return true;
    },
  };
});
