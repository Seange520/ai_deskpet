import { Component, createContext, lazy, Suspense, useContext, useState } from 'react';
import { useQualityTier } from '../../lib/qualityTier';
import './stage.css';
const SceneCanvas = lazy(() => import('./SceneCanvas'));
const StageContext = createContext({ ready: false });
export const useStageLayer = () => useContext(StageContext);
export default function StageLayer({ children }) {
  const quality = useQualityTier();
  const [ready, setReady] = useState(false);
  return (
    <StageContext.Provider value={{ ready: ready && quality.tier > 0 }}>
      <div
        className="render-shell"
        data-quality-tier={quality.tier}
        data-stage-ready={ready && quality.tier > 0}
      >
        <div className="visual-fallback" aria-hidden="true" />
        {quality.tier > 0 && (
          <StageLoadBoundary onFail={quality.fail}>
            <Suspense fallback={null}>
              <SceneCanvas quality={quality} onReady={setReady} />
            </Suspense>
          </StageLoadBoundary>
        )}
        <div className="hud-layer">{children}</div>
      </div>
    </StageContext.Provider>
  );
}

class StageLoadBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
