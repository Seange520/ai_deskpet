import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';

function subscribe(listener) {
  const preference = window.matchMedia(query);
  preference.addEventListener('change', listener);
  return () => preference.removeEventListener('change', listener);
}

const getSnapshot = () => window.matchMedia(query).matches;
const getServerSnapshot = () => false;

export default function useReducedMotionPreference() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
