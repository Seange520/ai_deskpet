import { create } from 'zustand';
import { normalizeLegacyLight, useHardwareTelemetry } from '../../store/useHardwareTelemetry.js';
import { usePetState } from '../../store/usePetState.js';

// Transient presentation events only. Never write learning progress or sandbox runtime.
export const usePetActions = create((set) => ({
  event: { id: 0, type: 'idle', source: '' },
  sleeping: false,
  dark: usePetState.getState().status === 'sleeping',
  trigger: (type, source = 'manual') => {
    if (!['jump', 'spin', 'sleep', 'wake'].includes(type)) return;
    set((state) => ({
      sleeping: type === 'sleep',
      event: { id: state.event.id + 1, type, source },
    }));
  },
  setLight: (light) => useHardwareTelemetry.getState().setLightLevel(normalizeLegacyLight(light)),
}));

// Keep the existing interaction flags and event sequence for DOM controls and older callers.
const unsubscribe = usePetState.subscribe(({ status }, previous) => {
  const dark = status === 'sleeping';
  if (dark === (previous.status === 'sleeping')) return;
  usePetActions.setState(({ event }) => ({
    dark,
    sleeping: false,
    event: { id: event.id + 1, type: dark ? 'sleep' : 'wake', source: 'light' },
  }));
});

if (import.meta.hot) import.meta.hot.dispose(unsubscribe);
