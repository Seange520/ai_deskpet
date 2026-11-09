import { create } from 'zustand';
import { MEMORY_KEY, freshMemory, restoreMemory, pruneMemory } from './memory.mjs';
export function createAiStore(storage, quotaStorage) {
  let memory;
  try {
    memory = restoreMemory(storage?.getItem(MEMORY_KEY));
  } catch {
    memory = freshMemory();
  }
  try {
    const quota = restoreMemory(quotaStorage?.getItem(MEMORY_KEY)).aiUsage;
    const current = pruneMemory(memory).aiUsage;
    memory.aiUsage = quota.rounds > current.rounds ? quota : current;
  } catch {}
  return create((set, get) => ({
    memory,
    error: '',
    typing: true,
    update(value) {
      const next = pruneMemory(value);
      try {
        quotaStorage?.setItem(MEMORY_KEY, JSON.stringify({ version: 1, aiUsage: next.aiUsage }));
      } catch {}
      try {
        if (next.consent) storage?.setItem(MEMORY_KEY, JSON.stringify(next));
        else storage?.removeItem(MEMORY_KEY);
        set({ memory: next, error: '' });
      } catch {
        set({ memory: next, error: '本机存储不可用，本次记录仅保留在会话中。' });
      }
    },
    consent(value) {
      get().update({ ...get().memory, consent: value === true });
    },
    clear() {
      // Keep quota in session so deletion cannot bypass the daily limit.
      const aiUsage = get().memory.aiUsage;
      try {
        storage?.removeItem(MEMORY_KEY);
        set({ memory: { ...freshMemory(), aiUsage }, error: '' });
      } catch {
        set({ error: '清空失败，请检查本机存储。' });
      }
    },
    setTyping(typing) {
      set({ typing });
    },
  }));
}
let storage, quotaStorage;
try {
  storage = globalThis.localStorage;
  quotaStorage = globalThis.sessionStorage;
} catch {}
export const useAi = createAiStore(storage, quotaStorage);
