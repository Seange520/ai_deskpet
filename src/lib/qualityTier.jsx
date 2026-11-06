import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { QUALITY_PRESETS, useQualityStore } from '../stores/useQualityStore';
import {
  isLowPowerDevice,
  readQualityOverride,
  deviceQualityTier,
  detectedQualityTier,
  QUALITY_BUDGETS,
} from './visualCapabilities';

function qualitySelection() {
  return {
    override: readQualityOverride(location.search),
    overrideAdaptive: new URLSearchParams(location.search).get('adaptive') === '1',
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
  const [{ override, overrideAdaptive }, setSelection] = useState(qualitySelection);
  const { manual, preset, customTier, customDpr } = useQualityStore();
  const [baseTier, setBaseTier] = useState(initialQuality);
  const [detected, setDetected] = useState(null);
  const [startupFps, setStartupFps] = useState(null);
  const [declines, setDeclines] = useState(0);
  const [failed, setFailed] = useState(false);
  const autoMode = override === null && !manual;
  const adaptive = override === null ? !manual : overrideAdaptive;
  useEffect(() => {
    const query = matchMedia('(max-width: 767px), (pointer: coarse), (hover: none)');
    const sync = () => {
      setSelection(qualitySelection());
      setBaseTier(initialQuality());
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
  useEffect(() => {
    if (!autoMode) {
      setDetected(null);
      setStartupFps(null);
    }
    if (!adaptive) setDeclines(0);
  }, [autoMode, adaptive]);

  const detect = useCallback((gpu) => setDetected(detectedQualityTier(initialQuality(), gpu)), []);
  const detectRenderer = useCallback((suggested) => setDetected(suggested), []);
  const autoTier = Math.min(baseTier, detected ?? baseTier);
  const measuredTier =
    autoTier > 1 && startupFps !== null && startupFps < 40 ? autoTier - 1 : autoTier;
  const requestedTier =
    override ?? (manual ? (QUALITY_PRESETS[preset] ?? customTier) : measuredTier);
  const performanceStep = adaptive ? declines : 0;
  const degrade = useCallback(() => {
    // Tier 2 has no reflector to retire, so its next useful step is postprocessing.
    setDeclines((step) => Math.min(4, step === 1 && requestedTier === 2 ? 3 : step + 1));
  }, [requestedTier]);
  const fail = useCallback(() => setFailed(true), []);
  const tier = failed ? 0 : Math.min(requestedTier, performanceStep >= 4 ? 1 : 3);
  const budget = QUALITY_BUDGETS[tier].maxDpr;
  const maxDpr =
    override === null && manual && preset === 'custom' ? Math.min(budget, customDpr) : budget;
  return (
    <QualityContext.Provider
      value={{
        tier,
        override,
        autoMode,
        adaptive,
        performanceStep,
        maxDpr,
        startupFps,
        detect,
        detectRenderer,
        onStartupFps: setStartupFps,
        degrade,
        fail,
      }}
    >
      {children}
    </QualityContext.Provider>
  );
}
export const useQualityTier = () => useContext(QualityContext);
