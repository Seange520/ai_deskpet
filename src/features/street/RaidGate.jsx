import { createPortal } from 'react-dom';
import { lazy, Suspense } from 'react';
import { useQualityTier } from '../../lib/qualityTier';
const Scene = lazy(() => import('../raid/RaidScene'));
const Overlay = lazy(() => import('../raid/RaidOverlay'));
export function RaidSceneGate(props) {
  const { tier } = useQualityTier();
  return tier === 3 ? (
    <Suspense fallback={null}>
      <Scene {...props} />
    </Suspense>
  ) : null;
}
export function RaidOverlayGate() {
  const { tier } = useQualityTier();
  return tier === 3 ? (
    <Suspense fallback={null}>{createPortal(<Overlay />, document.body)}</Suspense>
  ) : null;
}
