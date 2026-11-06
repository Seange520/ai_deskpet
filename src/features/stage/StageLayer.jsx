import { createContext, lazy, Suspense, useContext, useRef, useState } from 'react';
import { useQualityTier } from '../../lib/qualityTier';
import ValleyFallback from '../space/ValleyFallback';
import RenderBoundary from './RenderBoundary';
import './stage.css';
const SceneCanvas = lazy(() => import('./SceneCanvas'));
const StageContext = createContext({ ready: false });
export const useStageLayer = () => useContext(StageContext);
export default function StageLayer({ children }) {
  const quality = useQualityTier();
  const [ready, setReady] = useState(false);
  const dock = useRef(null);
  return (
    <StageContext.Provider value={{ ready: ready && quality.tier > 0, dock }}>
      <div
        className="render-shell"
        data-quality-tier={quality.tier}
        data-stage-ready={ready && quality.tier > 0}
      >
        <div className="visual-fallback" aria-hidden="true">
          {(!ready || quality.tier === 0) && <ValleyFallback />}
        </div>
        {quality.tier > 0 && (
          <RenderBoundary onFail={quality.fail}>
            <Suspense fallback={null}>
              <SceneCanvas quality={quality} onReady={setReady} dock={dock} />
            </Suspense>
          </RenderBoundary>
        )}
        <div className="hud-layer">{children}</div>
      </div>
    </StageContext.Provider>
  );
}
