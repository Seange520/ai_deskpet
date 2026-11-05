import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  isLowPowerDevice,
  readQualityOverride,
  deviceQualityTier,
  detectedQualityTier,
} from './visualCapabilities';

const qualityOverride = () => readQualityOverride(location.search);
function initialQuality() {
  return deviceQualityTier({
    lowPower: isLowPowerDevice(),
    coarse: matchMedia('(pointer: coarse)').matches,
    narrow: matchMedia('(max-width: 767px)').matches,
    noHover: matchMedia('(hover: none)').matches,
  });
}
const QualityContext = createContext({ tier: 0 });
export function QualityProvider({ children }) {
  const [override, setOverride] = useState(qualityOverride);
  const [automatic, setAutomatic] = useState(initialQuality);
  const [ceiling, setCeiling] = useState(3);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const query = matchMedia('(max-width: 767px), (pointer: coarse), (hover: none)');
    const sync = () => {
      setOverride(qualityOverride());
      setAutomatic(initialQuality());
    };
    if (query.addEventListener) query.addEventListener('change', sync);
    else query.addListener(sync);
    window.addEventListener('popstate', sync);
    return () => {
      if (query.removeEventListener) query.removeEventListener('change', sync);
      else query.removeListener(sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);
  const detect = useCallback((gpu) => {
    setAutomatic(detectedQualityTier(initialQuality(), gpu));
    // Unknown GPUs keep the conservative device default; never auto-promote to Tier 3.
  }, []);
  const degrade = useCallback(() => setCeiling((value) => Math.max(1, value - 1)), []);
  const fail = useCallback(() => setFailed(true), []);
  const tier = failed ? 0 : Math.min(override ?? automatic, ceiling);
  return (
    <QualityContext.Provider value={{ tier, override, detect, degrade, fail }}>
      {children}
    </QualityContext.Provider>
  );
}
export const useQualityTier = () => useContext(QualityContext);
