import { TRUST_KEY, restoreTrust } from './trust.mjs';
export function hasChip(storage = globalThis.localStorage) {
  try {
    return restoreTrust(storage?.getItem(TRUST_KEY)).chipUnlocked;
  } catch {
    return false;
  }
}
