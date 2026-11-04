import { create } from 'zustand';

// Transient presentation events only. Never write learning progress or sandbox runtime.
export const usePetActions = create((set) => ({
  event: { id: 0, type: 'idle', source: '' },
  sleeping: false,
  dark: false,
  trigger: (type, source = 'manual') => {
    if (!['jump', 'spin', 'sleep', 'wake'].includes(type)) return;
    set((state) => ({
      sleeping: type === 'sleep',
      event: { id: state.event.id + 1, type, source },
    }));
  },
  setLight: (light) =>
    set((state) => {
      const dark = Number.isFinite(light) && light < 100;
      if (dark === state.dark) return state;
      return {
        dark,
        sleeping: false,
        event: { id: state.event.id + 1, type: dark ? 'sleep' : 'wake', source: 'light' },
      };
    }),
}));
