import { useEffect, useState } from 'react';

export function useSceneQuality() {
  const [smallScreen, setSmallScreen] = useState(
    () => window.matchMedia?.('(max-width: 700px)')?.matches ?? false,
  );
  useEffect(() => {
    const query = window.matchMedia?.('(max-width: 700px)');
    if (!query) return;
    const update = () => setSmallScreen(query.matches);
    if (query.addEventListener) {
      query.addEventListener('change', update);
      return () => query.removeEventListener('change', update);
    }
    query.addListener?.(update);
    return () => query.removeListener?.(update);
  }, []);
  const lowPower =
    (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4);
  return smallScreen || lowPower;
}
