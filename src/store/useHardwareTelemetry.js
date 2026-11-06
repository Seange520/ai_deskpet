import { create } from 'zustand';

const defaultLight = 100;
const defaultSound = 0;
const clampLevel = (value) => Math.max(0, Math.min(100, value));

// Legacy devices and the demo report raw light units. Raw 100 remains the sleep boundary.
export function normalizeLegacyLight(light) {
  return Number.isFinite(light) ? clampLevel(light / 5) : defaultLight;
}

export const useHardwareTelemetry = create((set) => ({
  lightLevel: defaultLight,
  soundLevel: defaultSound,
  isConnected: false,
  setLightLevel: (value) =>
    set((state) => {
      if (!Number.isFinite(value)) return state;
      const lightLevel = clampLevel(value);
      return lightLevel === state.lightLevel ? state : { lightLevel };
    }),
  setSoundLevel: (value) =>
    set((state) => {
      if (!Number.isFinite(value)) return state;
      const soundLevel = clampLevel(value);
      return soundLevel === state.soundLevel ? state : { soundLevel };
    }),
  setConnection: (isConnected) =>
    set((state) =>
      isConnected === state.isConnected
        ? state
        : { isConnected, lightLevel: defaultLight, soundLevel: defaultSound },
    ),
  ingest: ({ light, sound }) =>
    set((state) => {
      const lightLevel = Number.isFinite(light) ? normalizeLegacyLight(light) : state.lightLevel;
      const soundLevel = Number.isFinite(sound) ? clampLevel(sound) : state.soundLevel;
      return lightLevel === state.lightLevel && soundLevel === state.soundLevel
        ? state
        : { lightLevel, soundLevel };
    }),
}));
