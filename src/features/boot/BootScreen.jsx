import { useCallback, useEffect, useRef, useState } from 'react';
import './boot.css';

const STAGES = [
  {
    id: 'wake',
    label: '唤醒校验协议',
    detail: 'SEVENTH CHECKSUM PROTOCOL',
    clip: '0 – 26',
  },
  {
    id: 'archive',
    label: '读取维护者档案',
    detail: 'LOCAL CORE · 本机分区',
    clip: '26 – 54',
  },
  {
    id: 'shader',
    label: '编译流明域渲染管线',
    detail: 'LUMEN REACH RENDER PIPELINE',
    clip: '54 – 86',
  },
  {
    id: 'enter',
    label: '同步城市残响',
    detail: 'ECHO SYNC · 流明域已就绪',
    clip: '86 – 100',
  },
];

const TIPS = [
  '停电不是事故，是协议在保护你——断电、验电、再动手。',
  '万用表先选档，再碰电路；错档的代价是保险丝，不是运气。',
  '继电器断开的一瞬间，磁场会把电压推得很高。续流二极管替你挨这一下。',
  'G0 是工作回流，不是保护地；别把两者当成一回事。',
  '零不会替你做决定，但会记住你走过的每一段路。',
  '每次读数都要留下条件：档位、量程、测点。证据比印象可靠。',
];

const STARS = Array.from({ length: 110 }, (_, i) => {
  const seed = (i + 7) * 9301 + 49297;
  const x = ((seed * 233280) % 1000) / 10;
  const y = (((seed * 49297) % 620) / 10) * 0.62;
  const size = ((i * 37) % 4) + 1;
  const delay = (i % 23) * 0.31;
  const opacity = 0.25 + ((i * 17) % 50) / 100;
  return { x, y, size, delay, opacity };
});

export function shouldShowBoot() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('boot') === '0') return false;
  if (params.get('boot') === '1') return true;
  if (
    params.get('quality') === '0' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return false;
  if (navigator.webdriver) return false;
  return true;
}

export function BootScreen({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [skippable, setSkippable] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const done = useRef(false);
  const raf = useRef(0);
  const target = useRef(6);
  const shownAt = useRef(performance.now());

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setLeaving(true);
    window.setTimeout(() => onDone?.(), 640);
  }, [onDone]);

  const simulate = useCallback(() => {
    const tick = () => {
      if (done.current) return;
      setProgress((value) => {
        const next = Math.min(
          100,
          value + (target.current - value) * 0.055 + 0.16,
        );
        return next;
      });
      raf.current = window.requestAnimationFrame(tick);
    };
    raf.current = window.requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const wait = (ms) =>
      new Promise((resolve) => window.setTimeout(resolve, ms));
    const run = async () => {
      simulate();
      await wait(180);
      target.current = 26;
      try {
        await document.fonts?.ready;
      } catch {
        /* fonts API 不可用时直接进入下一阶段 */
      }
      await wait(280);
      if (cancelled) return;
      target.current = 54;
      try {
        [
          'sparkmate.checksum.profile.v1',
          'sparkmate.routes.v2',
          'sparkmate.seventh-checksum.kickback.v1',
        ].forEach((key) => window.localStorage.getItem(key));
      } catch {
        /* 隐私模式下忽略 */
      }
      await wait(300);
      if (cancelled) return;
      target.current = 86;
      try {
        await Promise.all([
          import('../stage/SceneCanvas.jsx'),
          import('../world/Exploration.jsx'),
        ]);
      } catch {
        /* 预取失败不阻塞进入 */
      }
      await wait(360);
      if (cancelled) return;
      target.current = 100;
      await wait(420);
      if (cancelled) return;
      setProgress(100);
      const minShow = Math.max(
        0,
        2800 - (performance.now() - shownAt.current),
      );
      if (minShow > 0) await wait(minShow);
      if (cancelled) return;
      setReady(true);
    };
    run();
    const tipTimer = window.setInterval(
      () => setTipIndex((i) => (i + 1) % TIPS.length),
      3200,
    );
    const skipTimer = window.setTimeout(() => setSkippable(true), 1200);
    return () => {
      cancelled = true;
      window.clearInterval(tipTimer);
      window.clearTimeout(skipTimer);
      window.cancelAnimationFrame(raf.current);
    };
    // simulate/finish 引用稳定，仅首挂载执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = () => {
      if (skippable) finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish, skippable]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(finish, 9000);
    return () => window.clearTimeout(timer);
  }, [ready, finish]);

  const stageIndex =
    progress < 26 ? 0 : progress < 54 ? 1 : progress < 86 ? 2 : 3;
  const stage = STAGES[stageIndex];

  return (
    <section
      className={`boot-screen${leaving ? ' boot-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="进入第七校验"
      data-testid="boot-screen"
      data-boot-progress={Math.round(progress)}
      onClick={() => ready && finish()}
    >
      {/* 天空与远景 */}
      <div className="boot-sky" aria-hidden="true">
        <div className="boot-aurora boot-aurora-a" />
        <div className="boot-aurora boot-aurora-b" />
        <div className="boot-stars">
          {STARS.map((star, index) => (
            <i
              key={index}
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                opacity: star.opacity,
                animationDelay: `${star.delay}s`,
              }}
            />
          ))}
        </div>
        <svg
          className="boot-city-layer boot-city-back"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path d="M0 320V150l40-8 12-52 18 44 18-6v-88l22-12 20 18v70l30-6 14-44 18 40 16 4V96l26-14 24 20v92l36-8 16-48 18 44 22 4V84l24-16 22 18v104l34-6 18-52 16 46 20 6v-74l26-14 24 18v96l34-4 14-46 20 42 18 6v-70l22-10 20 16v86l30-4 16-44 18 40 18 4v-92l26-14 24 18v100l34-8 14-40 20 36 16 6V96l22-12 20 16v86l28-6 14-38 18 34 16 4v-78l24-14 22 18v86l30-4 12-36 18 32 16 6V96l22-12 20 16v86l28-4V320Z" />
        </svg>
        <svg
          className="boot-city-layer boot-city-front"
          viewBox="0 0 1440 260"
          preserveAspectRatio="none"
        >
          <path d="M0 260V170l52-16 18-38 24 30 28-10v-42l30-18 28 22v56l40-8 20-40 22 36 26 6v-56l34-20 30 24v62l44-8 20-42 24 38 30 6v-60l36-22 32 26v70l40-4 18-44 24 40 26 4v-62l34-22 30 26v66l38-6 18-40 24 36 26 6v-60l34-20 30 24v64l40-4 18-44 24 40 26 6v-62l34-22 30 26v60l38-6v112Z" />
        </svg>
        <div className="boot-fog" />
        <div className="boot-scanlines" />
      </div>

      <div className="boot-vignette" aria-hidden="true" />

      <div className="boot-top">
        <span className="boot-top-chip">校验协议 · CHECKSUM PROTOCOL</span>
        <span className="boot-top-right">LOCAL CORE · v0.9.8-alpha</span>
      </div>

      <div className="boot-center">
        <div className="boot-brand" aria-label="第七校验 THE SEVENTH CHECKSUM">
          <span className="boot-mark" aria-hidden="true">
            <svg viewBox="0 0 96 96" role="presentation">
              <path
                className="boot-mark-ring"
                d="M48 6 84 27v42L48 90 12 69V27Z"
              />
              <path
                className="boot-mark-ring2"
                d="M48 18 73 33v30L48 78 23 63V33Z"
              />
              <path
                className="boot-mark-core"
                d="M48 30 62 38v20L48 66 34 58V38Z"
              />
              <path
                className="boot-mark-ticks"
                d="M48 6v9M84 27l-7.5 4.3M84 69l-7.5-4.3M48 90v-9M12 69l7.5-4.3M12 27l7.5 4.3"
              />
            </svg>
          </span>
          <div className="boot-wordmark">
            <p className="boot-kicker">THE SEVENTH CHECKSUM</p>
            <h1>第七校验</h1>
            <p className="boot-subtitle">
              <span>流明域</span>
              <i aria-hidden="true" />
              <span>LUMEN REACH</span>
            </p>
            <p className="boot-tagline">
              每一次读数，都是城市醒来的一次心跳。
            </p>
          </div>
        </div>
      </div>

      <div className="boot-tip" aria-live="polite">
        <span className="boot-tip-label">维护者提示</span>
        <p key={tipIndex} className="boot-tip-text">
          {TIPS[tipIndex]}
        </p>
      </div>

      {ready && (
        <button
          type="button"
          className="boot-enter"
          data-boot-enter
          onClick={finish}
        >
          <span className="boot-enter-cn">点击进入流明域</span>
          <span className="boot-enter-en">ENTER LUMEN REACH</span>
        </button>
      )}

      <div className="boot-loading">
        <div className="boot-loading-head">
          <span className="boot-stage-index">
            {String(stageIndex + 1).padStart(2, '0')} / 04
          </span>
          <span className="boot-stage-label">{stage.label}</span>
          <span className="boot-stage-detail">{stage.detail}</span>
          <span className="boot-percent">{Math.round(progress)}%</span>
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
          <i className="boot-progress-head" style={{ left: `${Math.round(progress)}%` }} />
        </div>
        <div className="boot-loading-foot">
          <span className="boot-build-clip">SECTOR {stage.clip}</span>
          <span className="boot-copy">
            © 第七校验项目组 · 本地核心 · 教学仿真非真机认证
          </span>
          <span className="boot-skip">
            {skippable ? '点击任意位置 / 按任意键进入' : '正在校验本地分区…'}
          </span>
        </div>
      </div>
    </section>
  );
}

export default BootScreen;
