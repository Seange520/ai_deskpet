import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  isLowPowerDevice,
  readQualityOverride,
  deviceQualityTier,
  detectedQualityTier,
} from './visualCapabilities';

function qualitySelection() {
  const override = readQualityOverride(location.search);
  return {
    override,
    adaptive: override === null || new URLSearchParams(location.search).get('adaptive') === '1',
  };
}
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
  const [{ override, adaptive }, setSelection] = useState(qualitySelection);
  const [automatic, setAutomatic] = useState(initialQuality);
  const [declines, setDeclines] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const query = matchMedia('(max-width: 767px), (pointer: coarse), (hover: none)');
    const sync = () => {
      setSelection(qualitySelection());
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
  const requestedTier = override ?? automatic;
  const performanceStep = adaptive ? declines : 0;
  const degrade = useCallback(() => {
    // Tier 2 has no reflector to retire, so its next useful step is postprocessing.
    setDeclines((step) => Math.min(4, step === 1 && requestedTier === 2 ? 3 : step + 1));
  }, [requestedTier]);
  const fail = useCallback(() => setFailed(true), []);
  const tier = failed ? 0 : Math.min(requestedTier, performanceStep >= 4 ? 1 : 3);
  return (
    <QualityContext.Provider
      value={{ tier, override, adaptive, performanceStep, detect, degrade, fail }}
    >
      {children}
    </QualityContext.Provider>
  );
}
export const useQualityTier = () => useContext(QualityContext);
