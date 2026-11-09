import { Component, Suspense, lazy } from 'react';
import { useQualityTier } from '../../lib/qualityTier';
import { useMission } from './missionStore.mjs';
import MissionOverlay from './MissionOverlay.jsx';
import './mission.css';

const MissionScene = lazy(() => import('./MissionScene.jsx'));
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="alert">街景启动失败，请刷新页面重试。</p>
    ) : (
      this.props.children
    );
  }
}
export default function MissionR1Root() {
  const { tier, maxDpr } = useQualityTier();
  const error = useMission((s) => s.error);
  if (tier < 2) {
    const url = new URL(location.href);
    url.searchParams.set('quality', '3');
    return (
      <main className="mission-root mission-gate">
        <section className="mission-paper">
          <h1>晴光街 · 抢修委托</h1>
          <p>晴光街需要至少中等画质（Tier 2）。手机上会使用较低细节的街景。</p>
          <a href={url.href}>以 Tier 3 打开委托</a>
          <a href="?">返回学习枢纽</a>
        </section>
      </main>
    );
  }
  return (
    <main className="mission-root" data-testid="mission-root">
      <SceneBoundary>
        <Suspense
          fallback={
            <p className="mission-loading" role="status">
              正在铺开晴光街…
            </p>
          }
        >
          <MissionScene maxDpr={maxDpr} />
        </Suspense>
      </SceneBoundary>
      {error ? (
        <section className="mission-paper mission-error" role="alert">
          <h1>街景暂不可用</h1>
          <p>{error}</p>
          <a href="?">返回学习枢纽</a>
        </section>
      ) : (
        <MissionOverlay />
      )}
    </main>
  );
}
