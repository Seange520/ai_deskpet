import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const QUALITY_PRESETS = Object.freeze({
  cinematic: 3,
  balanced: 2,
  smooth: 1,
  custom: null,
});
export function advancedQualityEffects(tier, step) {
  const cinematic = tier === QUALITY_PRESETS.cinematic;
  return {
    ssr: cinematic && step < 2,
    gtao: cinematic && step < 3,
    selectiveBloom: cinematic && step < 3,
    motionBlur: cinematic && step < 1,
    dissolve: cinematic && step < 1,
  };
}

const defaults = { manual: false, preset: 'balanced', customTier: 2, customDpr: 1.25 };
const tiers = [1, 2, 3];
const dprs = [1, 1.25, 1.5];

export const useQualityStore = create(
  persist(
    (set) => ({
      ...defaults,
      selectPreset: (preset) => {
        if (Object.hasOwn(QUALITY_PRESETS, preset)) set({ manual: true, preset });
      },
      setCustomTier: (customTier) => {
        if (tiers.includes(customTier)) set({ manual: true, preset: 'custom', customTier });
      },
      setCustomDpr: (customDpr) => {
        if (dprs.includes(customDpr)) set({ manual: true, preset: 'custom', customDpr });
      },
      restoreAuto: () => set({ manual: false }),
    }),
    {
      name: 'sparkmate.quality.v1',
      partialize: ({ manual, preset, customTier, customDpr }) => ({
        manual,
        preset,
        customTier,
        customDpr,
      }),
      merge: (saved, current) => ({
        ...current,
        manual: saved?.manual === true,
        preset: Object.hasOwn(QUALITY_PRESETS, saved?.preset) ? saved.preset : defaults.preset,
        customTier: tiers.includes(saved?.customTier) ? saved.customTier : defaults.customTier,
        customDpr: dprs.includes(saved?.customDpr) ? saved.customDpr : defaults.customDpr,
      }),
    },
  ),
);
