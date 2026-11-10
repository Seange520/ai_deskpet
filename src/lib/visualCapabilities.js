export const DESKTOP_VISUAL_QUERY = '(min-width: 768px) and (hover: hover) and (pointer: fine)';

export function isLowPowerDevice() {
  return (
    (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4) ||
    navigator.connection?.saveData === true
  );
}

// Quality policy is presentation-only; URL overrides never enter a persisted store.
export function readQualityOverride(search) {
  const value = new URLSearchParams(search).get('quality');
  if (value === 'dom') return 0;
  return /^[0-3]$/.test(value ?? '') ? Number(value) : null;
}
export function deviceQualityTier({ lowPower, coarse, narrow, noHover }) {
  return lowPower || coarse || narrow || noHover ? 0 : 2;
}
export function detectedQualityTier(initial, gpu) {
  if (gpu.tier === 0) return 0;
  return gpu.type === 'BENCHMARK' ? Math.min(initial, 2, gpu.tier) : initial;
}
export const QUALITY_BUDGETS = Object.freeze({
  0: { maxDpr: 1, environment: false },
  1: { maxDpr: 1, environment: false },
  2: { maxDpr: 1.25, environment: true },
  // 无大世界开放负载：Tier 3 放开到 2× DPR（RTX/高分屏可吃满）
  3: { maxDpr: 2, environment: true },
});
