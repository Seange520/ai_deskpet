import { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import HardwareSimulator from './components/HardwareSimulator';
import CodeLab from './components/CodeLab';

const STORAGE = 'sparkmate.progress.v1';
const initial = { materials: false, wiring: false, code: false };
const nav = [
  { id: 'dashboard', name: '学习仪表盘', en: 'Overview', icon: LayoutDashboard },
  { id: 'hardware', name: '硬件实验室', en: 'Hardware lab', icon: Cpu },
  { id: 'code', name: '代码魔改工坊', en: 'Code playground', icon: Code2 },
];
const materials = [
  ['ESP32-S3 开发板', '支持 USB 供电与下载的主控板。'],
  ['兼容显示屏', '建议先核对供电电压、接口与驱动支持。'],
  ['I2S 数字麦克风', '采集声音；供电接线后还需单独连接音频信号线。'],
  ['杜邦线与 USB 数据线', '准备公母接头匹配的跳线；USB 线需支持数据传输。'],
];

function loadProgress() {
  // 仅接受布尔值，防止旧格式或损坏的本地记录影响页面。
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE));
    return {
      materials: p?.materials === true,
      wiring: p?.wiring === true,
      code: p?.code === true && p?.wiring === true,
    };
  } catch {
    return initial;
  }
}

export default function App() {
  const modalTrigger = useRef(null);
  function openModal(type) {
    modalTrigger.current = document.activeElement;
    setModal(type);
  }
  const [page, setPage] = useState('dashboard'),
    [progress, setProgress] = useState(loadProgress);
  const [modal, setModal] = useState(null),
    [checked, setChecked] = useState([]),
    [storageError, setStorageError] = useState(false);
  const xp =
    (progress.materials ? 100 : 0) + (progress.wiring ? 250 : 0) + (progress.code ? 150 : 0);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(progress));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [progress]);
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
  const complete = (key) => setProgress((p) => ({ ...p, [key]: true }));
  function navigate(id) {
    setPage(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function reset() {
    setProgress({ ...initial });
    setChecked([]);
    setModal(null);
    setPage('dashboard');
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <aside className="sidebar">
          <button
            className="brand"
            onClick={() => navigate('dashboard')}
            aria-label="SparkMate 首页"
          >
            <span className="brand-mark">
              <Zap size={24} fill="currentColor" />
            </span>
            <span>
              SparkMate<small>IDEAS INTO LITTLE FRIENDS</small>
            </span>
          </button>
          <div className="workspace-label">
            WORKSPACE <span>个人学习空间</span>
          </div>
          <nav aria-label="主导航">
            {nav.map((n) => (
              <button
                className={`nav-item ${page === n.id ? 'selected' : ''}`}
                key={n.id}
                aria-label={n.name}
                onClick={() => navigate(n.id)}
                aria-current={page === n.id ? 'page' : undefined}
              >
                <n.icon size={19} />
                <span>
                  {n.name}
                  <small>{n.en}</small>
                </span>
                {page === n.id && <ChevronRight size={14} />}
              </button>
            ))}
          </nav>
          <div className="sidebar-project">
            <span className="eyebrow">CURRENT PROJECT</span>
            <div className="project-chip">
              <Cpu size={20} />
              <div>
                AI 实体桌宠<small>ESP32-S3 · 入门系列</small>
              </div>
              <span className="status-dot" />
            </div>
            <div className="tiny-progress">
              <span style={{ width: `${xp / 5}%` }} />
            </div>
            <span>{Object.values(progress).filter(Boolean).length} / 3 关卡完成</span>
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
            <button className="reset-link" onClick={() => openModal('reset')}>
              <RotateCcw size={13} /> 重置学习进度
            </button>
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
        <main className="main-content">
          <header className="topbar">
            <div className="breadcrumb">
              工作空间 <ChevronRight size={13} />
              <b>{nav.find((n) => n.id === page).name}</b>
            </div>
            <div className="experience">
              <div className="experience-text">
                <span>
                  <Zap size={13} /> LV.{xp >= 500 ? '2' : '1'} {xp >= 500 ? '初级创客' : '新手创客'}
                </span>
                <span>
                  {xp} <small>/ 500 XP</small>
                </span>
              </div>
              <div className="xp-track">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xp / 5}%` }}
                  transition={{ type: 'spring', stiffness: 65, damping: 20 }}
                />
              </div>
            </div>
            <span className="top-avatar">S</span>
          </header>
          {storageError && (
            <div className="storage-note" role="status">
              浏览器存储不可用，本次学习进度将只保留到关闭页面。
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {page === 'dashboard' ? (
                <Dashboard
                  progress={progress}
                  onNavigate={navigate}
                  onMaterials={() => {
                    setChecked(progress.materials ? [0, 1, 2, 3] : []);
                    openModal('materials');
                  }}
                />
              ) : page === 'hardware' ? (
                <HardwareSimulator
                  completed={progress.wiring}
                  onComplete={() => complete('wiring')}
                  onNext={() => navigate('code')}
                />
              ) : (
                <CodeLab
                  unlocked={progress.wiring}
                  completed={progress.code}
                  onComplete={() => {
                    complete('code');
                    openModal('success');
                  }}
                  onHardware={() => navigate('hardware')}
                />
              )}
            </motion.div>
          </AnimatePresence>
          <footer className="app-footer">
            <span>
              SPARKMATE <i>®</i> LEARN. BUILD. BEFRIEND.
            </span>
            <span>从 0 到 1，让好奇发生。</span>
          </footer>
        </main>
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
                className="modal panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                initial={{ scale: 0.96, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    const buttons = e.currentTarget.querySelectorAll('button:not(:disabled),input');
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
                <button
                  autoFocus
                  className="modal-close icon-btn"
                  aria-label="关闭弹窗"
                  onClick={() => setModal(null)}
                >
                  <X size={20} />
                </button>
                {modal === 'materials' ? (
                  <>
                    <Package className="text-neon" size={30} />
                    <div className="eyebrow">LEVEL 01 / MAKER CHECKLIST</div>
                    <h2 id="modal-title">认识你的创客工具箱</h2>
                    <p>先逐一认识这些部件。不需要现在购买，理解用途即可。</p>
                    <div className="checklist">
                      {materials.map(([name, description], i) => (
                        <label key={name}>
                          <input
                            type="checkbox"
                            checked={checked.includes(i)}
                            onChange={() =>
                              setChecked((c) =>
                                c.includes(i) ? c.filter((n) => n !== i) : [...c, i],
                              )
                            }
                          />
                          <span>
                            <b>{name}</b>
                            <small>{description}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                    <button
                      className="btn primary full"
                      disabled={checked.length !== 4}
                      onClick={() => {
                        complete('materials');
                        setModal(null);
                        navigate('hardware');
                      }}
                    >
                      <Check size={17} />
                      我已认识全部物料 · +100 XP
                    </button>
                  </>
                ) : modal === 'reset' ? (
                  <>
                    <RotateCcw className="text-neon" size={30} />
                    <h2 id="modal-title">重新开启创造之旅？</h2>
                    <p>这会清除本机保存的经验与关卡徽章，恢复「初入江湖」初始成就。</p>
                    <div className="modal-actions">
                      <button className="btn" onClick={() => setModal(null)}>
                        保留进度
                      </button>
                      <button className="btn danger-btn" onClick={reset}>
                        确认重置
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Trophy className="text-neon" size={42} />
                    <div className="eyebrow">ACHIEVEMENT UNLOCKED</div>
                    <h2 id="modal-title">你好，桌宠创造者。</h2>
                    <p>你已经完成供电连线，并用参数改变了桌宠。下一站，把这份好奇带进真实硬件。</p>
                    <button
                      className="btn primary full"
                      onClick={() => {
                        setModal(null);
                        navigate('dashboard');
                      }}
                    >
                      查看我的成就 <ArrowUpRight size={17} />
                    </button>
                  </>
                )}
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
