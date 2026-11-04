import { create } from 'zustand';

export const environmentRegression = import.meta.env?.VITE_SPARKMATE_ENVIRONMENT === 'regression';
export const isNightHour = (hour) => hour >= 19 || hour < 6;
const localHour = () => (environmentRegression ? 12 : new Date().getHours());

const initialHour = localHour();

// Presentation only. No persistence, learning actions or hardware commands.
export const useEnvironmentStore = create((set) => ({
  mode: 'auto',
  hour: initialHour,
  night: isNightHour(initialHour),
  idleSleeping: false,
  syncClock: (hour = localHour()) =>
    set((state) => {
      const night = state.mode === 'auto' ? isNightHour(hour) : state.mode === 'night';
      return state.hour === hour && state.night === night ? state : { hour, night };
    }),
  setMode: (mode) => {
    if (!['auto', 'day', 'night'].includes(mode)) return;
    set((state) => ({ mode, night: mode === 'auto' ? isNightHour(state.hour) : mode === 'night' }));
  },
  setIdleSleeping: (idleSleeping) =>
    set((state) => (state.idleSleeping === idleSleeping ? state : { idleSleeping })),
}));
