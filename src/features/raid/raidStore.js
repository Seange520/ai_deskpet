import { create } from 'zustand';
import {
  RAID_KEY,
  restoreSave,
  createRun,
  seedFor,
  settle,
  transition,
  cutPower,
  kitAction,
  measure,
  solve,
  takeLoot,
  rebuild,
  answerCode,
  activateSkill,
  tick,
} from './raid.mjs';
// Only meta/history/rewards are serialized. Active run remains session memory.
export function createRaidStore(storage, now = () => new Date().toISOString()) {
  let raw;
  try {
    raw = storage?.getItem(RAID_KEY);
  } catch {
    /* Session fallback. */
  }
  return create((set, get) => {
    const persist = (save) => {
      try {
        storage?.setItem(RAID_KEY, JSON.stringify(save));
      } catch {
        set({ storageError: true });
      }
    };
    const update = (run) => {
      const before = get();
      let save = before.save;
      if (
        ['extracted', 'failed'].includes(run.state) &&
        !['extracted', 'failed'].includes(before.run?.state)
      ) {
        save = settle(save, run, before.runId, now());
        persist(save);
      }
      set({ run, save });
    };
    return {
      save: restoreSave(raw),
      run: null,
      runId: null,
      storageError: false,
      start: (uidHash = 'local') => {
        const s = get();
        if (s.run && !['extracted', 'failed'].includes(s.run.state)) return;
        const runIndex = s.save.meta.runs;
        const date = now().slice(0, 10),
          seed = seedFor(date, uidHash, runIndex);
        set({ run: createRun(seed), runId: date + ':' + uidHash + ':' + runIndex });
      },
      dispatch: (event) => {
        const s = get().run;
        if (!s || ['extracted', 'failed'].includes(s.state)) return;
        const handlers = {
          enter: () => transition(s, 'entering'),
          begin: () => transition(s, 'running'),
          power: () => cutPower(s),
          scanner: () => kitAction(s, { type: 'scanner' }),
          mode: () => kitAction(s, { type: 'mode', mode: event.mode }),
          measure: () => measure(s, event.probe),
          solve: () => solve(s, event.probe),
          loot: () => takeLoot(s, event.id),
          rebuild: () => rebuild(s),
          code: () => answerCode(s, event.id),
          skill: () => activateSkill(s),
          leaveCheckpoint: () => transition(s, 'extracting'),
          extract: () => transition(s, 'extracted'),
          abandon: () => ({ ...s, state: 'failed', failure: 'abandoned' }),
        };
        if (handlers[event.type]) update(handlers[event.type]());
      },
      tick: (dt, input) => {
        if (get().run) update(tick(get().run, dt, input));
      },
      close: () => {
        const s = get();
        if (s.run && !['failed', 'extracted', 'idle'].includes(s.run.state))
          update({ ...s.run, state: 'failed', failure: 'abandoned' });
        set({ run: null, runId: null });
      },
    };
  });
}
let storage;
try {
  if (typeof localStorage !== 'undefined') storage = localStorage;
} catch {
  /* Session fallback. */
}
export const useRaid = createRaidStore(storage);

if (typeof window !== 'undefined')
  window.addEventListener('pagehide', () => useRaid.getState().close());
