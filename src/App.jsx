import IdentityEntry, { LazyProfilePanel } from './features/identity/IdentityEntry';
import { BootScreen, shouldShowBoot } from './features/boot/BootScreen';
import { createPortal } from 'react-dom';
import useReducedMotionPreference from './lib/useReducedMotionPreference';
import { isLowPowerDevice } from './lib/visualCapabilities';
import { totalXP, levelFor, globalBadges, MAX_XP } from './stores/useLearningStore';
import { playSound, setMuted, startAmbient, stopAmbient } from './lib/sounds';
import Button from './components/Button';
import QualitySettings from './components/QualitySettings';
import { MOTION } from './motion';
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { GitBranch, Zap, X, Check, Package, RotateCcw, Orbit, Volume2, VolumeX } from 'lucide-react';
import { useQualityTier } from './lib/qualityTier';
import { useStageLayer } from './features/stage/StageLayer';
import { isSpaceTransition, useSpaceStore } from './features/space/spaceStore';
import HudChoreographer from './features/space/HudChoreographer';
import { useIslandAssetFailures } from './features/space/islandAssets';
import IslandHotspots, { islandName } from './features/space/IslandHotspots';
import Dashboard from './components/Dashboard';
import NumberTicker from './components/ui/NumberTicker';
import HardwareSimulator from './components/HardwareSimulator';
import CodeLab from './components/CodeLab';
import Companion from './components/Companion';
import Materials from './components/Materials';
import MakerRanking from './components/MakerRanking';
import Graduation from './components/Graduation';
import useHardwareProgress from './hooks/useHardwareProgress';
import { getHardwareRoute } from './data/hardwareRoutes';

const SimDemoEntry = import.meta.env.DEV ? lazy(() => import('./features/learning/sims/SimDemoEntry.jsx')) : null;
const TeachingPanel = lazy(() => import('./features/learning/TeachingPanel'));
const AiEntry = import.meta.env.DEV ? lazy(() => import('./features/ai/AiEntry.jsx')) : null;

const ResonancePanel = lazy(() => import('./features/resonance/ResonancePanel'));
const AssetPackEntry = lazy(() => import('./features/settings/AssetPackEntry.jsx'));

function ModalLayer({active,children}) { return active ? createPortal(children,document.body) : children; }

function HubOverview({ showMap }) {
  return (
    <div className="page hub-overview">
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">00 / CHECKSUM HUB</div>
          <h1>
            中央<span className="text-neon">枢纽</span>
          </h1>
          <p>群岛的航线在这里交汇。从导航坞选一座岛，继续你的创作旅程。</p>
        </div>
      </div>
      {showMap && (
        <svg className="hub-map" viewBox="0 0 420 260" aria-hidden="true">
          <path
            d="M210 179 C277 216 365 166 342 107 S263 39 210 45 S100 62 78 107 S130 214 210 179Z"
            fill="none"
            stroke="#72cfde"
            strokeWidth="2"
          />
          <g fill="#242b45" stroke="#8bddeb" strokeWidth="2">
            <ellipse cx="210" cy="179" rx="63" ry="40" />
            <ellipse cx="210" cy="45" rx="35" ry="19" />
            <ellipse cx="342" cy="107" rx="35" ry="19" />
            <ellipse cx="78" cy="107" rx="35" ry="19" />
          </g>
          <ellipse
            cx="210"
            cy="179"
            rx="51"
            ry="30"
            fill="none"
            stroke="#62aabf"
            strokeDasharray="2 7"
          />
          <path d="M210 148 230 177 210 204 190 177Z" fill="#f8bf8b" />
        </svg>
      )}
    </div>
  );
}

export default function App() {
  const panel = useRef(null);
  const [booting, setBooting] = useState(() => shouldShowBoot());
  const hasNavigated = useRef(false);
  const focusOnArrival = useRef(null);
  const modalTrigger = useRef(null);
  function openModal(type) {
    modalTrigger.current = document.activeElement;
    setModal(type);
  }
  const page = useSpaceStore((state) => state.focus);
  const islandUnavailable = useIslandAssetFailures((state) => state[page]);
  const phase = useSpaceStore((state) => state.phase);
  const destination = useSpaceStore((state) => state.destination);
  const { tier } = useQualityTier();
  const { ready, dock, exploring } = useStageLayer();
  const reduced = useReducedMotionPreference();
  const inFlight = isSpaceTransition(phase);
  const cinematic = tier >= 2 && ready && !reduced;
  const overview = phase === 'idle';
  const projected = overview && ready && tier > 0;
  const {
    routeId,
    feedback,
    muted,
    toggleMuted,
    progress,
    allProgress,
    debugProgress,
    selectRoute,
    complete: markComplete,
    storageError,
    reset: resetProgress,
  } = useHardwareProgress();
  const route = getHardwareRoute(routeId);
  function switchRoute(id) {
    if (!selectRoute(id)) return false;
    setChecked(allProgress[id]?.materials ? getHardwareRoute(id).components.map((_, i) => i) : []);
    setToast('');
    return true;
  }
  function chooseRoute(id, destination) {
    if (!switchRoute(id)) return;
    navigate('hardware', undefined, destination === 'materials');
    if (destination === 'materials') openModal('materials');
  }
  const [modal, setModal] = useState(null),
    [checked, setChecked] = useState([]);
  const [celebrations, setCelebrations] = useState(0);
  const [kitAdded, setKitAdded] = useState({});
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  const xp = totalXP(allProgress, debugProgress);
  const badges = globalBadges(allProgress);
  useEffect(() => {
    setToast(feedback.toast);
  }, [feedback.id, feedback.toast]);
  useEffect(() => {
    const click = (e) => {
      if (
        e.target.closest?.('button:not(:disabled), [role="button"]') &&
        !e.target.closest?.('[data-sound-toggle]')
      )
        playSound('click', muted);
    };
    document.addEventListener('click', click, true);
    return () => document.removeEventListener('click', click, true);
  }, [muted]);
  // 静音开关同步到音频层；取消静音时恢复氛围音（挂载时不创建音频上下文，保持惰性）。
  const audioMounted = useRef(false);
  useEffect(() => {
    setMuted(muted);
    if (muted) {
      stopAmbient();
      return;
    }
    if (!audioMounted.current) {
      audioMounted.current = true;
      return;
    }
    startAmbient();
  }, [muted]);
  useEffect(() => {
    if (muted) return undefined;
    const kick = () => startAmbient();
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
  }, [muted]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        stopAmbient();
        return;
      }
      if (!muted) startAmbient();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [muted]);
  // 弹窗打开时阻止背景滚动；关闭后把焦点还给触发按钮。
  useEffect(() => {
    if (!modal) return;
    const previous = modalTrigger.current;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (e) => {
      if (e.key === 'Escape') {
        if (modal === 'identity') { e.preventDefault(); e.stopPropagation(); }
        setModal(null);
      }
    };
    document.addEventListener('keydown', close, modal === 'identity');
    return () => {
      document.removeEventListener('keydown', close, modal === 'identity');
      document.body.style.overflow = oldOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [modal]);
  function complete(key) {
    if (markComplete(key)) setCelebrations((n) => n + 1);
  }
  useLayoutEffect(() => {
    const space = useSpaceStore.getState();
    if (!cinematic && isSpaceTransition(space.phase)) {
      space.jumpTo(space.destination);
    } else if (cinematic && space.request === 0 && !hasNavigated.current) {
      space.jumpTo('hub');
    }
  }, [cinematic]);

  useLayoutEffect(() => {
    if (isSpaceTransition(phase)) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    const target = focusOnArrival.current;
    focusOnArrival.current = null;
    const active = document.activeElement;
    if (!target || (active !== target.source && active !== document.body)) return;
    if (phase === 'idle') {
      dock.current
        ?.querySelector(`[data-island="${target.island}"]`)
        ?.focus({ preventScroll: true });
    } else {
      const heading = panel.current?.querySelector('h1, h2');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
  }, [page, phase, dock]);

  function navigate(id, event, immediate = false) {
    const space = useSpaceStore.getState();
    hasNavigated.current = true;
    if (id === space.destination && !isSpaceTransition(space.phase)) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    focusOnArrival.current =
      !modal && event?.detail === 0
        ? {
            source: event.currentTarget,
            island: space.focus === 'hub' ? space.destination : space.focus,
          }
        : null;
    if (cinematic && !modal && !immediate) space.travelTo(id);
    else space.jumpTo(id);
  }
  function reset() {
    resetProgress();
    setChecked([]);
    setModal(null);
    useSpaceStore.getState().jumpTo('dashboard');
    setCelebrations(0);
    setKitAdded({});
    setToast('');
  }

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'} transition={MOTION}>
        {booting &&
          createPortal(
            <BootScreen
              onDone={() => {
                setBooting(false);
                playSound('chime', muted);
                startAmbient();
              }}
            />,
            document.body,
          )}
      {import.meta.env.DEV && tier === 3 && new URLSearchParams(location.search).get('sims') === '1' && <Suspense fallback={null}><SimDemoEntry /></Suspense>}
      <div
        className="app-shell"
        data-low-power={isLowPowerDevice()}
        data-space-phase={phase}
        data-space-focus={page}
      >
        <main className="main-content" inert={modal ? '' : undefined}>
          <header className="topbar" data-space-hud>
            <div className="space-brand-group">
              <Button
                className="space-brand"
                onClick={(event) => navigate('hub', event)}
                aria-label="第七校验 首页"
              >
                <Zap size={20} fill="currentColor" aria-hidden="true" />
                <span className="space-brand-text">
                  第七校验
                  <small className="project-chip">{route.name}</small>
                </span>
              </Button>
              {!overview && (
                <Button className="space-return" onClick={(event) => navigate('hub', event)}>
                  <Orbit size={17} aria-hidden="true" />
                  <span>返回大世界</span>
                </Button>
              )}
            </div>
            <div className="experience">
              <div className="experience-text">
                <span>
                  <Zap size={13} /> LV.{levelFor(xp)} {xp >= 500 ? '进阶创客' : '新手创客'}
                </span>
                <span>
                  <NumberTicker value={xp} /> <small>/ {MAX_XP} XP</small>
                </span>
              </div>
              <div
                className="xp-track"
                role="progressbar"
                aria-label="全局学习进度"
                aria-valuemin={0}
                aria-valuemax={MAX_XP}
                aria-valuenow={xp}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(xp / MAX_XP) * 100}%` }}
                  transition={MOTION}
                />
              </div>
            </div>
            <Button
              className="icon-btn"
              data-sound-toggle
              aria-label={muted ? '开启音效' : '静音音效'}
              aria-pressed={muted}
              title={muted ? '音效已静音' : '音效已开启'}
              onClick={toggleMuted}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </Button>
            <QualitySettings />
            {import.meta.env.DEV && tier === 3 && new URLSearchParams(location.search).get('aiTest') === '1' && new URLSearchParams(location.search).get('ai') !== '0' && <Suspense fallback={null}><AiEntry disabled={Boolean(modal)} /></Suspense>}
            <ModalLayer active={new URLSearchParams(location.search).get('world') === 'p9'}><Button style={new URLSearchParams(location.search).get('world') === 'p9' ? {position:'fixed',left:16,top:16,zIndex:30,visibility:'visible',width:'auto',paddingInline:10} : {width:'auto',paddingInline:10}} disabled={Boolean(modal)} className="icon-btn teaching-entry" aria-label="校验之径" data-testid="teaching-entry" onClick={() => openModal('teaching')}>校验之径</Button></ModalLayer>
            <ModalLayer active={new URLSearchParams(location.search).get('world') === 'p9'}><IdentityEntry disabled={Boolean(modal)} onClick={() => openModal('identity')} /></ModalLayer>
            {tier === 3 && !exploring && <ModalLayer active={new URLSearchParams(location.search).get('world') === 'p9'}><Button className="icon-btn" style={new URLSearchParams(location.search).get('world') === 'p9' ? {position:'fixed',right:24,top:24,zIndex:30,visibility:'visible'} : undefined} aria-label="共鸣链" data-testid="resonance-entry" onClick={() => openModal('resonance')}><GitBranch size={18}/></Button></ModalLayer>}
            <Button
              className="icon-btn"
              aria-label="重置学习进度"
              title="重置学习进度"
              onClick={() => openModal('reset')}
            >
              <RotateCcw size={17} />
            </Button>
          </header>
          <IslandHotspots
            dock={dock}
            projected={projected}
            page={page}
            destination={destination}
            busy={inFlight}
            tier={tier}
            onNavigate={navigate}
          />
          {storageError && (
            <div className="storage-note" role="status" data-space-hud>
              浏览器存储不可用，本次学习进度将只保留到关闭页面。
            </div>
          )}
          {page === 'hub' ? (
            overview &&
            (projected ? (
              <div className="space-overview-caption" aria-hidden="true">
                <span className="eyebrow">CHECKSUM / NIGHT VALLEY</span>
                <p>选择一座岛，开始探索。</p>
              </div>
            ) : (
              <HubOverview showMap />
            ))
          ) : (
            <div ref={panel}>
              <HudChoreographer key={page} phase={phase} cinematic={cinematic}>
                {tier > 0 && islandUnavailable && (
                  <div className="storage-note" role="alert">
                    暂时无法载入此岛的 3D 内容。请检查网络连接，教学功能仍可使用。
                  </div>
                )}
                {page === 'dashboard' ? (
                  <Dashboard
                    progress={progress}
                    badges={badges}
                    routeId={routeId}
                    onChooseRoute={chooseRoute}
                    onNavigate={navigate}
                    onMaterials={() => {
                      setChecked(progress.materials ? route.components.map((_, i) => i) : []);
                      openModal('materials');
                    }}
                  />
                ) : page === 'hardware' ? (
                  <HardwareSimulator
                    key={routeId}
                    routeId={routeId}
                    onRouteChange={switchRoute}
                    onMaterials={() => {
                      setChecked(progress.materials ? route.components.map((_, i) => i) : []);
                      openModal('materials');
                    }}
                    completed={progress.wiring}
                    onComplete={() => complete('wiring')}
                    onNext={(event) => navigate('code', event)}
                  />
                ) : page === 'ranking' ? (
                  <MakerRanking xp={xp} />
                ) : (
                  <CodeLab
                    key={routeId}
                    routeId={routeId}
                    unlocked={progress.wiring}
                    completed={progress.code}
                    onComplete={() => {
                      complete('code');
                      openModal('success');
                    }}
                    onHardware={(event) => navigate('hardware', event)}
                  />
                )}
              </HudChoreographer>
            </div>
          )}
          {phase === 'detail' && (
            <footer className="app-footer" data-space-hud>
              <span>
                THE SEVENTH CHECKSUM <i>®</i> LEARN. BUILD. BEFRIEND.
              </span>
              <span>
                从 0 到 1，让好奇发生。 <a href="./site/index.html">关于本作 / 官网</a>
                {' · '}
                <AssetPackEntry />
              </span>
            </footer>
          )}
        </main>
        <Companion celebrations={celebrations} feedback={feedback} hidden={Boolean(modal)} />
        {toast && (
          <div className="kit-toast" role="status" data-space-hud>
            {toast}
          </div>
        )}
        <AnimatePresence>
          {modal && (<ModalLayer active={modal === 'resonance' || modal === 'teaching' || modal === 'identity'}>
            <motion.div
              className="modal-backdrop" style={modal === 'resonance' || modal === 'teaching' || modal === 'identity' ? {visibility:'visible',zIndex:1000} : undefined}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModal(null)}
            >
              <motion.section
                className={`modal panel ${modal === 'materials' || modal === 'shop' ? 'materials-modal' : ''} ${modal === 'success' ? 'graduation-modal' : ''} ${modal === 'resonance' ? 'resonance-modal' : ''} ${modal === 'teaching' ? 'teaching-modal' : ''} ${modal === 'identity' ? 'identity-modal' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                initial={{ scale: 0.96, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    const buttons = e.currentTarget.querySelectorAll(
                      'button:not(:disabled):not([tabindex="-1"]),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)',
                    );
                    const first = buttons[0],
                      last = buttons[buttons.length - 1];
                    if (e.shiftKey && document.activeElement === first) {
                      e.preventDefault();
                      last.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                      e.preventDefault();
                      first.focus();
                    }
                  }
                }}
              >
                <Button
                  autoFocus
                  className="modal-close icon-btn"
                  aria-label="关闭弹窗"
                  onClick={() => setModal(null)}
                >
                  <X size={20} />
                </Button>
                {modal === 'identity' ? (<Suspense fallback={<h2 id="modal-title">维护者档案载入中</h2>}><LazyProfilePanel /></Suspense>) : modal === 'teaching' ? (<Suspense fallback={<h2 id="modal-title">校验之径载入中</h2>}><TeachingPanel /></Suspense>) : modal === 'resonance' ? (<Suspense fallback={<h2 id="modal-title">共鸣链载入中</h2>}><ResonancePanel /></Suspense>) : modal === 'materials' || modal === 'shop' ? (
                  <Materials
                    key={routeId}
                    routeId={routeId}
                    onRouteChange={switchRoute}
                    checked={checked}
                    onCheck={(i) =>
                      setChecked((c) => (c.includes(i) ? c.filter((n) => n !== i) : [...c, i]))
                    }
                    onComplete={() => {
                      complete('materials');
                      setModal(null);
                      navigate('hardware');
                    }}
                    shop={modal === 'shop'}
                    kitAdded={Boolean(kitAdded[routeId])}
                    onAdd={() => {
                      setKitAdded((current) => ({ ...current, [routeId]: true }));
                      setToast('已加入我的新手套装 · 不会产生订单或扣款');
                    }}
                  />
                ) : modal === 'reset' ? (
                  <>
                    <RotateCcw className="text-neon" size={30} />
                    <h2 id="modal-title">重新开启创造之旅？</h2>
                    <p>这会清除本机保存的经验与关卡徽章，恢复「初入江湖」初始成就。</p>
                    <div className="modal-actions">
                      <Button className="btn" onClick={() => setModal(null)}>
                        保留进度
                      </Button>
                      <Button className="btn danger-btn" onClick={reset}>
                        确认重置
                      </Button>
                    </div>
                  </>
                ) : (
                  <Graduation
                    routeId={routeId}
                    onShop={() => setModal('shop')}
                    onOverview={() => {
                      setModal(null);
                      navigate('dashboard');
                    }}
                  />
                )}
              </motion.section>
            </motion.div>
          </ModalLayer>)}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
