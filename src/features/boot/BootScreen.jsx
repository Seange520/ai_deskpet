import { useCallback, useEffect, useRef, useState } from 'react';
import './boot.css';

const STAGES = [
  { id: 'wake', label: '唤醒校验协议', detail: '第七校验 · 本地核心' },
  { id: 'archive', label: '读取本地档案', detail: '维护者记录 · 本机分区' },
  { id: 'shader', label: '预编译着色器', detail: '流明域渲染管线 · 首帧缓存' },
  { id: 'enter', label: '进入流明域', detail: '校验之径已就绪' },
];

const STARS = Array.from({ length: 72 }, (_, i) => {
  const seed = (i + 1) * 9301 + 49297;
  const x = (seed * 233280 % 1000) / 10;
  const y = ((seed * 49297) % 1000) / 10;
  const size = ((i * 37) % 3) + 1;
  const delay = (i % 17) * 0.22;
  return { x, y, size, delay };
});

export function shouldShowBoot() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('boot') === '0') return false;
  if (params.get('boot') === '1') return true;
  if (params.get('quality') === '0' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (navigator.webdriver) return false;
  return true;
}

export function BootScreen({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [skippable, setSkippable] = useState(false);
  const done = useRef(false);
  const raf = useRef(0);
  const target = useRef(4);
  const shownAt = useRef(performance.now());

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setLeaving(true);
    window.setTimeout(() => onDone?.(), 560);
  }, [onDone]);

  const simulate = useCallback(() => {
    const tick = () => {
      if (done.current) return;
      setProgress((value) => {
        const next = Math.min(100, value + (target.current - value) * 0.06 + 0.22);
        return next;
      });
      raf.current = window.requestAnimationFrame(tick);
    };
    raf.current = window.requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
    const run = async () => {
      simulate();
      await wait(150);
      target.current = 30;
      try {
        await document.fonts?.ready;
      } catch {
        /* fonts API 不可用时直接进入下一阶段 */
      }
      await wait(260);
      if (cancelled) return;
      target.current = 55;
      try {
        ['sparkmate.checksum.profile.v1', 'sparkmate.routes.v2', 'sparkmate.seventh-checksum.kickback.v1'].forEach((key) => window.localStorage.getItem(key));
      } catch {
        /* 隐私模式下忽略 */
      }
      await wait(320);
      if (cancelled) return;
      target.current = 88;
      try {
        await Promise.all([import('../stage/SceneCanvas.jsx'), import('../world/Exploration.jsx')]);
      } catch {
        /* 预取失败不阻塞进入 */
      }
      await wait(340);
      if (cancelled) return;
      target.current = 100;
      await wait(320);
      if (cancelled) return;
      setProgress(100);
      const minShow = Math.max(0, 2600 - (performance.now() - shownAt.current));
      if (minShow > 0) await wait(minShow);
      finish();
    };
    run();
    const skipTimer = window.setTimeout(() => setSkippable(true), 1400);
    return () => {
      cancelled = true;
      window.clearTimeout(skipTimer);
      window.cancelAnimationFrame(raf.current);
    };
    // simulate/finish 引用稳定，仅首挂载执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (!skippable) return;
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
        event.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish, skippable]);

  const stageIndex = progress < 30 ? 0 : progress < 55 ? 1 : progress < 88 ? 2 : 3;
  const stage = STAGES[stageIndex];
  const elapsed = (performance.now() - shownAt.current) / 1000;

  return (
    <section
      className={`boot-screen${leaving ? ' boot-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="进入第七校验"
      data-testid="boot-screen"
      onClick={() => skippable && finish()}
    >
      <div className="boot-stars" aria-hidden="true">
        {STARS.map((star, index) => (
          <i
            key={index}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>
      <div className="boot-vignette" aria-hidden="true" />
      <div className="boot-frame">
        <header className="boot-brand" aria-label="第七校验 THE SEVENTH CHECKSUM">
          <span className="boot-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" role="presentation">
              <path d="M32 4 56 18v28L32 60 8 46V18Z" />
              <path d="M32 14 47 23v16l-15 9-15-9V23Z" className="boot-mark-inner" />
              <path d="M32 4v10M56 18 47 23M56 46 47 41M32 60V50M8 46l9-5M8 18l9 5" className="boot-mark-ticks" />
            </svg>
          </span>
          <div className="boot-wordmark">
            <p className="boot-kicker">SEVENTH CHECKSUM PROTOCOL</p>
            <h1>第七校验</h1>
            <p className="boot-subtitle">THE SEVENTH CHECKSUM · 流明域</p>
          </div>
        </header>

        <div className="boot-log" role="status" aria-live="polite">
          <div className="boot-stage">
            <span className="boot-stage-index">{String(stageIndex + 1).padStart(2, '0')}</span>
            <span className="boot-stage-label">{stage.label}</span>
            <span className="boot-stage-detail">{stage.detail}</span>
          </div>
          <div
            className="boot-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-valuetext={`${stage.label} ${Math.round(progress)}%`}
            data-testid="boot-progress"
          >
            <span style={{ width: `${Math.round(progress)}%` }} />
          </div>
          <div className="boot-meta">
            <span>{Math.round(progress)}%</span>
            <span className="boot-meta-right">v0.9.8-alpha · LOCAL CORE {elapsed >= 9 ? '· SLOW LINK' : ''}</span>
          </div>
          <ol className="boot-stage-list">
            {STAGES.map((item, index) => (
              <li key={item.id} className={index < stageIndex ? 'is-done' : index === stageIndex ? 'is-active' : ''}>
                <span aria-hidden="true">{index < stageIndex ? '✓' : index === stageIndex ? '▸' : '·'}</span>
                {item.label}
              </li>
            ))}
          </ol>
        </div>

        <footer className="boot-footer">
          <span>维护者终端 · 校验编号补码待写入</span>
          <span className="boot-skip">{skippable ? '按任意键 / 点击跳过' : '正在读取本地分区'}</span>
        </footer>
      </div>
    </section>
  );
}

export default BootScreen;
