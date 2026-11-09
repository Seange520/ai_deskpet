import { createContext, lazy, Suspense, useContext, useRef, useState } from 'react';
import { useQualityTier } from '../../lib/qualityTier';
import ValleyFallback from '../space/ValleyFallback';
import RenderBoundary from './RenderBoundary';
import './stage.css';
import { RelicOverlay } from '../space/RelicOverlay';
import EvolutionOverlay from '../space/EvolutionOverlay';
import LoreOverlay from '../space/LoreOverlay';
import './lore.css';
const ExplorationOverlay = lazy(() => import('../world/ExplorationOverlay'));
const WorldMap = lazy(() => import('../world/WorldMap'));
const WorldPreview = lazy(() => import('../world/WorldPreview'));
const SceneCanvas = lazy(() => import('./SceneCanvas'));
const RenderPrototype = lazy(() => import('../render/RenderPrototype'));
const StageContext = createContext({ ready: false });
export const useStageLayer = () => useContext(StageContext);
export default function StageLayer({ children }) {
  const quality = useQualityTier();
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(
    () => new URLSearchParams(location.search).get('world') === 'p9',
  );
  const [exploring, setExploring] = useState(false);
  const [inputElement, setInputElement] = useState(null);
  const [view, setView] = useState('hub');
  const previewEnabled = new URLSearchParams(location.search).get('world') === 'p9';
  const active = previewEnabled && preview && quality.tier === 3 && ready;
  const dock = useRef(null);
  const relic = useRef(null);
  const meteor = useRef(null);
  const renderMode = new URLSearchParams(location.search).get('render');
  // Mission owns its canvas and HUD; do not boot the main world behind it.
  if (new URLSearchParams(location.search).get('mission') === 'r1') return children;
  if (quality.tier === 3 && ['toon', 'standard'].includes(renderMode)) {
    return (
      <RenderBoundary onFail={quality.fail}>
        <Suspense fallback={<p role="status">正在准备渲染对比场景…</p>}>
          <RenderPrototype initialMode={renderMode} />
        </Suspense>
      </RenderBoundary>
    );
  }
  return (
    <StageContext.Provider
      value={{ ready: ready && quality.tier > 0, dock, exploring: active && exploring }}
    >
      <div
        className="render-shell"
        data-quality-tier={quality.tier}
        data-world-preview={active}
        onKeyDown={(event) => {
          if (active && event.key === 'Escape') {
            event.preventDefault();
            setExploring(false);
            setPreview(false);
          }
        }}
        data-stage-ready={ready && quality.tier > 0}
      >
        <div className="visual-fallback" aria-hidden="true">
          {(!ready || quality.tier === 0) && <ValleyFallback />}
        </div>
        {quality.tier > 0 && (
          <RenderBoundary onFail={quality.fail}>
            <Suspense fallback={null}>
              <SceneCanvas
                quality={quality}
                preview={previewEnabled && preview && quality.tier === 3}
                view={view}
                exploring={active && exploring}
                inputElement={inputElement}
                onReady={setReady}
                dock={dock}
                relic={relic}
                meteor={meteor}
              />
            </Suspense>
          </RenderBoundary>
        )}
        <div className="hud-layer" inert={active ? '' : undefined}>
          {children}
        </div>
        {previewEnabled && !(active && exploring) && (
          <Suspense fallback={null}>
            <WorldPreview
              active={active}
              available={quality.tier === 3 && ready}
              view={view}
              onView={setView}
              onExplore={() => setExploring(true)}
              onToggle={() => setPreview((p) => !p)}
            />
          </Suspense>
        )}
        {active && exploring && (
          <Suspense fallback={null}>
            <ExplorationOverlay
              onSurface={setInputElement}
              onExit={() => {
                setExploring(false);
                setPreview(false);
              }}
            />
          </Suspense>
        )}
        {previewEnabled && (
          <Suspense fallback={null}>
            <WorldMap
              exploring={active && exploring}
              tier={quality.tier}
              onSurveySelect={active && !exploring ? setView : undefined}
            />
          </Suspense>
        )}
        {!active && <RelicOverlay overlay={relic} tier={quality.tier} ready={ready} />}
        {!active && <LoreOverlay meteor={meteor} tier={quality.tier} />}
        {!active && <EvolutionOverlay tier={quality.tier} />}
      </div>
    </StageContext.Provider>
  );
}
