import { navigateWithCamera, cancelCamera } from './lib/viewTransition';
import useReducedMotionPreference from './lib/useReducedMotionPreference';
import { isLowPowerDevice } from './lib/visualCapabilities';
import { totalXP, levelFor, globalBadges, MAX_XP } from './stores/useLearningStore';
import { playSound } from './lib/sounds';
import Button from './components/Button';
import { MOTION } from './motion';
import { TiltSurface, Depth } from './components/MicroEffects';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import {
  Zap,
  LayoutDashboard,
  Cpu,
  Code2,
  ArrowUpRight,
  ChevronRight,
  X,
  Check,
  Package,
  RotateCcw,
  Trophy,
  Orbit,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useQualityTier } from './lib/qualityTier';
import { useStageLayer } from './features/stage/StageLayer';
import { useSpaceStore } from './features/space/spaceStore';
import HudChoreographer from './features/space/HudChoreographer';
import { preloadIsland, useIslandAssetFailures } from './features/space/islandAssets';
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

const nav = [
  { id: 'dashboard', name: '学习仪表盘', en: 'Overview', icon: LayoutDashboard },
  { id: 'hardware', name: '硬件实验室', en: 'Hardware lab', icon: Cpu },
  { id: 'code', name: '代码魔改工坊', en: 'Code playground', icon: Code2 },
  { id: 'ranking', name: '创客排位', en: '一起慢慢发光', icon: Trophy },
  { id: 'hub', name: '中央枢纽', en: 'SparkMate Hub', icon: Orbit },
];

function HubOverview({ showMap }) {
  return (
    <div className="page hub-overview">
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">00 / SPARKMATE HUB</div>
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

function moveDockFocus(event) {
  const buttons = Array.from(event.currentTarget.querySelectorAll('button'));
  const index = buttons.indexOf(event.target);
  if (index < 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

  let next;
  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      next = (index + buttons.length - 1) % buttons.length;
      break;
    case 'ArrowRight':
    case 'ArrowDown':
      next = (index + 1) % buttons.length;
      break;
    case 'Home':
      next = 0;
      break;
    case 'End':
      next = buttons.length - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  buttons[next].focus();
}

export default function App() {
  const dock = useRef(null);
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
  const { ready } = useStageLayer();
  const reduced = useReducedMotionPreference();
  const inFlight = phase === 'departing' || phase === 'traveling';
  const cinematic = tier >= 2 && ready && !reduced;
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
  // 弹窗打开时阻止背景滚动；关闭后把焦点还给触发按钮。
  useEffect(() => {
    if (!modal) return;
    const previous = modalTrigger.current;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (e) => {
      if (e.key === 'Escape') setModal(null);
    };
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.body.style.overflow = oldOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [modal]);
  function complete(key) {
    if (markComplete(key)) setCelebrations((n) => n + 1);
  }
  useEffect(() => () => cancelCamera(), []);
  useLayoutEffect(() => {
    const space = useSpaceStore.getState();
    if (!cinematic && space.phase !== 'idle') {
      focusOnArrival.current = null;
      space.jumpTo(space.destination);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [cinematic]);
  useLayoutEffect(() => {
    if (phase !== 'arriving') return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (focusOnArrival.current && document.activeElement === focusOnArrival.current) {
      const heading = document.querySelector('.space-hud-panel h1');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
    focusOnArrival.current = null;
  }, [page, phase]);
  function navigate(id, event, immediate = false) {
    const space = useSpaceStore.getState();
    if (id === page && space.phase === 'idle') {
      cancelCamera();
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    if (tier <= 1 || reduced) {
      const order = nav.map(({ id }) => id);
      navigateWithCamera(() => space.jumpTo(id), {
        event,
        direction: order.indexOf(id) < order.indexOf(page) ? 'backward' : 'forward',
      });
      return;
    }
    cancelCamera();
    if (cinematic && !modal && !immediate) {
      if (id === space.destination) return;
      focusOnArrival.current = null;
      if (event?.currentTarget?.closest('.space-hud-panel')) {
        const button = dock.current.querySelector(`[data-island="${id}"]`);
        button?.focus({ preventScroll: true });
        if (event.detail === 0) focusOnArrival.current = button;
      }
      space.travelTo(id);
    } else {
      space.jumpTo(id);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
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
      <div
        className="app-shell"
        data-low-power={isLowPowerDevice()}
        data-space-phase={phase}
        data-space-focus={page}
      >
        <aside className="sidebar" data-space-hud inert={modal ? '' : undefined}>
          <Button
            className="brand"
            onClick={(event) => navigate('dashboard', event)}
            aria-label="SparkMate 首页"
          >
            <span className="brand-mark">
              <Zap size={24} fill="currentColor" />
            </span>
            <span>
              SparkMate<small>IDEAS INTO LITTLE FRIENDS</small>
            </span>
          </Button>
          <div className="workspace-label">
            WORKSPACE <span>个人学习空间</span>
          </div>
          <nav ref={dock} className="space-dock" aria-label="主导航" onKeyDown={moveDockFocus}>
            <span className="sr-only" aria-live="polite" aria-atomic="true">
              {inFlight
                ? `正在飞往${nav.find((n) => n.id === destination).name}`
                : `当前岛屿：${nav.find((n) => n.id === page).name}`}
            </span>
            {nav.map((n) => (
              <TiltSurface key={n.id} navigation>
                <Button
                  className={`nav-item ${page === n.id ? 'selected' : ''}`}
                  key={n.id}
                  aria-label={n.name}
                  data-island={n.id}
                  onPointerEnter={tier > 0 ? () => preloadIsland(n.id) : undefined}
                  onFocus={tier > 0 ? () => preloadIsland(n.id) : undefined}
                  data-pending={inFlight && destination === n.id ? '' : undefined}
                  onClick={(event) => navigate(n.id, event)}
                  aria-current={page === n.id ? 'page' : undefined}
                >
                  <Depth depth={1}>
                    <n.icon size={19} />
                  </Depth>
                  <Depth depth={0.35}>
                    {n.name}
                    <small>{n.en}</small>
                  </Depth>
                  {page === n.id && <ChevronRight size={14} />}
                </Button>
              </TiltSurface>
            ))}
          </nav>
          <div className="sidebar-project">
            <span className="eyebrow">CURRENT PROJECT</span>
            <div className="project-chip">
              <Cpu size={20} />
              <div>
                {route.name}
                <small>ESP32-S3 · {route.difficulty}</small>
              </div>
              <span className="status-dot" />
            </div>
            <div
              className="tiny-progress"
              role="progressbar"
              aria-label="全局学习进度"
              aria-valuemin={0}
              aria-valuemax={MAX_XP}
              aria-valuenow={xp}
            >
              <span style={{ width: `${(xp / MAX_XP) * 100}%` }} />
            </div>
            <span>
              全局 {xp} / {MAX_XP} XP · 本路线 {Object.values(progress).filter(Boolean).length} / 3
              关卡完成
            </span>
          </div>
          <div className="sidebar-bottom">
            <div className="maker-note">
              <Zap size={18} />
              <p>
                保持好奇。
                <br />
                <span>下一个火花，就在你手中。</span>
              </p>
            </div>
            <Button className="reset-link" onClick={() => openModal('reset')}>
              <RotateCcw size={13} /> 重置学习进度
            </Button>
            <div className="profile">
              <div className="avatar">
                S<span />
              </div>
              <div>
                未来创造者<small>INDEPENDENT MAKER</small>
              </div>
              <span className="online-indicator" />
            </div>
          </div>
        </aside>
        <main className="main-content" inert={modal ? '' : undefined}>
          <header className="topbar" data-space-hud>
            <div className="breadcrumb">
              工作空间 <ChevronRight size={13} />
              <b>{nav.find((n) => n.id === page).name}</b>
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
              <div className="xp-track">
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
            <span className="top-avatar">S</span>
          </header>
          {storageError && (
            <div className="storage-note" role="status" data-space-hud>
              浏览器存储不可用，本次学习进度将只保留到关闭页面。
            </div>
          )}
          <HudChoreographer key={page} focus={page} phase={phase} cinematic={cinematic}>
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
            ) : page === 'hub' ? (
              <HubOverview showMap={tier === 0 || !ready} />
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
          <footer className="app-footer" data-space-hud>
            <span>
              SPARKMATE <i>®</i> LEARN. BUILD. BEFRIEND.
            </span>
            <span>从 0 到 1，让好奇发生。</span>
          </footer>
        </main>
        <Companion celebrations={celebrations} feedback={feedback} hidden={Boolean(modal)} />
        {toast && (
          <div className="kit-toast" role="status" data-space-hud>
            {toast}
          </div>
        )}
        <AnimatePresence>
          {modal && (
            <motion.div
              className="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModal(null)}
            >
              <motion.section
                className={`modal panel ${modal === 'materials' || modal === 'shop' ? 'materials-modal' : ''} ${modal === 'success' ? 'graduation-modal' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                initial={{ scale: 0.96, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    const buttons = e.currentTarget.querySelectorAll(
                      'button:not(:disabled),input:not(:disabled),select:not(:disabled)',
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
                {modal === 'materials' || modal === 'shop' ? (
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
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
