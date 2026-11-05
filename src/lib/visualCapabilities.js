export const DESKTOP_VISUAL_QUERY = '(min-width: 768px) and (hover: hover) and (pointer: fine)';

export function isLowPowerDevice() {
  return (
    (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4) ||
    navigator.connection?.saveData === true
  );
}
