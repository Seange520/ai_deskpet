import DebugChallenge from './DebugChallenge';
import { useLearningStore } from '../stores/useLearningStore';
import Button from './Button';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Layers3,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  MousePointer2,
} from 'lucide-react';
import ExplodedView from './ExplodedView';
import RouteSelect from './RouteSelect';
import { getHardwareRoute } from '../data/hardwareRoutes';
import { routeLessons } from '../data/routeLessons';
import BurnoutOverlay from './BurnoutOverlay';

const pathFor = (a, b) => `M${a.x},${a.y} C${a.x + 140},${a.y} ${b.x - 140},${b.y} ${b.x},${b.y}`;

export default function HardwareSimulator({
  routeId = 'classic',
  onRouteChange,
  onMaterials,
  completed,
  onComplete,
  onNext,
}) {
  const fail = useLearningStore((s) => s.fail);
  const recover = useLearningStore((s) => s.recover);
  const route = getHardwareRoute(routeId),
    lesson = route.wiring;
  const sources = lesson.pairs.map(([id], i) => ({
    id,
    x: 110,
    y: lesson.pairs.length === 2 ? 145 + i * 100 : 110 + i * 60,
  }));
  const targets = lesson.pairs.map(([, id], i) => ({
    id,
    x: 490,
    y: lesson.pairs.length === 2 ? 145 + i * 100 : 110 + i * 60,
  }));
  const valid = Object.fromEntries(lesson.pairs);
  const [mode, setMode] = useState('normal');
  const [exploded, setExploded] = useState(false);
  const [wires, setWires] = useState(completed ? Object.fromEntries(lesson.pairs) : {});
  const [drag, setDrag] = useState(null);
  const [error, setError] = useState(null);
  const [hud, setHud] = useState(null);
  const [celebrate, setCelebrate] = useState(false);
  const [burned, setBurned] = useState(false);
  const svgRef = useRef(null),
    errorTimer = useRef(null),
    celebrationTimer = useRef(null);
  const reduced = useReducedMotion();
  const success = !burned && Object.keys(wires).length === lesson.pairs.length;
  useEffect(
    () => () => {
      clearTimeout(errorTimer.current);
      clearTimeout(celebrationTimer.current);
    },
    [],
  );

  function point(e) {
    // getScreenCTM 包含 viewBox 留白和布局变换，避免用简单宽度比例导致偏移。
    const svg = svgRef.current,
      p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  function connect(source, target) {
    // 白名单验证只接受电源正确配对；错误线只是反馈，绝不计入已完成接线。
    if (success || burned) return;
    if (valid[source] !== target) {
      fail(source === 'VCC' && target === 'GND');
      setError({ source, target, id: Date.now() });
      clearTimeout(errorTimer.current);
      if (source === 'VCC' && target === 'GND') {
        setBurned(true);
        setCelebrate(false);
        setHud(null);
        clearTimeout(celebrationTimer.current);
      } else errorTimer.current = setTimeout(() => setError(null), 2500);
      return;
    }
    setError(null);
    const next = { ...wires, [source]: target };
    setWires(next);
    if (Object.keys(next).length === lesson.pairs.length) {
      setCelebrate(true);
      onComplete();
      clearTimeout(celebrationTimer.current);
      celebrationTimer.current = setTimeout(() => setCelebrate(false), 1500);
    }
  }
  function finish(e) {
    // 指针捕获确保鼠标离开引脚后仍能持续拖线；释放时用圆形命中区寻找目标。
    if (!drag || drag.keyboard) return;
    const p = point(e),
      target = targets.find((t) => Math.hypot(t.x - p.x, t.y - p.y) < 35);
    if (target) connect(drag.source, target.id);
    setDrag(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function keyboard(e, kind, id) {
    // 键盘路径复用相同校验逻辑，与鼠标拖拽具有一致的关卡反馈。
    if (e.key === 'Escape') {
      setDrag(null);
      return;
    }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (kind === 'source') {
      const s = sources.find((p) => p.id === id);
      setDrag({ source: id, x: s.x + 100, y: s.y, keyboard: true });
    } else if (drag?.keyboard) {
      connect(drag.source, id);
      setDrag(null);
    }
  }
  function reset() {
    recover();
    setBurned(false);
    setWires({});
    setDrag(null);
    setError(null);
    setCelebrate(false);
    clearTimeout(errorTimer.current);
    clearTimeout(celebrationTimer.current);
  }

  return (
    <div className="page workbench-page page-hero">
      {burned && <BurnoutOverlay onReset={reset} />}
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">LEVEL 02 / NEIGHBORHOOD FORGE</div>
          <h1>
            认识它，然后<span className="text-neon">连接它。</span>
          </h1>
          <p>{route.description}</p>
        </div>
        <div className="heading-actions">
          <span className="pill">
            <span className="status-dot" /> 虚拟实验环境
          </span>
          <a className="btn exploded-entry" href="/?exploded=1" target="_blank" rel="noreferrer">
            全零件说明书 →
          </a>
        </div>
      </div>
      <div className="route-toolbar">
        <RouteSelect routeId={routeId} onChange={onRouteChange} />
        <span className="route-context">{route.difficulty} · 本路线独立进度</span>
        <Button className="btn" onClick={onMaterials}>
          准备物料 · {route.name}
        </Button>
      </div>
      <div className="lab-mode" role="group" aria-label="实验模式">
        {['normal', 'debug'].map((value) => (
          <Button
            key={value}
            className="btn"
            aria-pressed={mode === value}
            onClick={() => {
              setMode(value);
              setDrag(null);
              setError(null);
              setHud(null);
              setCelebrate(false);
              clearTimeout(errorTimer.current);
              clearTimeout(celebrationTimer.current);
            }}
          >
            {value === 'normal' ? '正常模式' : 'Debug 挑战'}
          </Button>
        ))}
      </div>
      {mode === 'debug' ? (
        <DebugChallenge key={routeId} routeId={routeId} />
      ) : (
        <div className="lab-grid">
          <section className="panel hardware-gallery">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">01 / EXPLORE</span>
                <h2>{route.name}</h2>
              </div>
              <Button
                className={`btn small ${exploded ? 'active' : ''}`}
                onClick={() => setExploded(!exploded)}
              >
                <Layers3 size={16} />
                {exploded ? '合拢' : '拆解'}
              </Button>
            </div>
            <div className="hero-art camera-art-frame">
              <ExplodedView routeId={routeId} exploded={exploded} />
            </div>
            <div className="gallery-note">
              <Info size={16} />
              <span>点击「拆解」探索结构。示意布局不代表真实排针位置。</span>
            </div>
          </section>
          <section className="panel wiring-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">02 / CONNECT</span>
                <h2>让第一束电流，找到方向</h2>
              </div>
              <Button className="icon-btn" aria-label="重置接线" onClick={reset}>
                <RotateCcw size={17} />
              </Button>
            </div>
            <p className="panel-description">{lesson.description}</p>
            <div className="wiring-stage">
              <div className="wire-device-labels">
                <span>
                  {lesson.sourceTitle}
                  <small>{lesson.sourceName}模块</small>
                </span>
                <span>
                  {lesson.targetTitle || 'ESP32-S3'}
                  <small>主控 / 参考地{lesson.targetNames ? ' / 独立电源' : ''}</small>
                </span>
              </div>
              <svg
                ref={svgRef}
                viewBox="0 0 600 360"
                className="wiring-svg"
                aria-label={`${route.name}连线模拟器：拖拽左侧引脚到右侧，或使用 Tab 与回车操作`}
                onPointerMove={(e) => {
                  if (drag && !drag.keyboard) {
                    const p = point(e);
                    setDrag({ ...drag, x: p.x, y: p.y });
                  }
                }}
                onPointerUp={finish}
                onPointerCancel={() => setDrag(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setDrag(null);
                }}
              >
                <defs>
                  <pattern id="wireGrid" width="22" height="22" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r=".8" fill="#ffffff15" />
                  </pattern>
                  <filter id="wireGlow">
                    <feGaussianBlur stdDeviation="3" />
                  </filter>
                </defs>
                <rect width="600" height="360" fill="url(#wireGrid)" rx="14" />
                <rect
                  x="31"
                  y="89"
                  width="80"
                  height="210"
                  rx="10"
                  fill="#1b2930"
                  stroke="#30454d"
                />
                <rect
                  x="490"
                  y="89"
                  width="80"
                  height="210"
                  rx="10"
                  fill="#192c28"
                  stroke="#37554a"
                />
                {Object.entries(wires).map(([source, target]) => {
                  const a = sources.find((s) => s.id === source),
                    b = targets.find((t) => t.id === target),
                    d = pathFor(a, b);
                  return (
                    <g key={source}>
                      <path
                        d={d}
                        stroke="#6EE7B7"
                        strokeWidth="8"
                        opacity=".3"
                        filter="url(#wireGlow)"
                        fill="none"
                      />
                      <path d={d} stroke="#6EE7B7" strokeWidth="3" fill="none" />
                      <path
                        d={d}
                        className={success ? 'flow-wire' : ''}
                        stroke="#edfff9"
                        strokeWidth="3"
                        strokeDasharray="5 20"
                        fill="none"
                      />
                    </g>
                  );
                })}
                {drag && (
                  <path
                    d={pathFor(
                      sources.find((s) => s.id === drag.source),
                      drag,
                    )}
                    stroke="#6EE7B7"
                    strokeWidth="3"
                    strokeDasharray="6 5"
                    fill="none"
                    pointerEvents="none"
                  />
                )}
                {error && (
                  <motion.path
                    key={error.id}
                    d={pathFor(
                      sources.find((s) => s.id === error.source),
                      targets.find((s) => s.id === error.target),
                    )}
                    stroke="#FF4D4D"
                    strokeWidth="4"
                    fill="none"
                    animate={reduced ? {} : { x: [0, -7, 7, -5, 5, 0] }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
                {[
                  ['source', sources],
                  ['target', targets],
                ].map(([kind, pins]) =>
                  pins.map((p) => (
                    <g
                      key={`${kind}-${p.id}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${kind === 'source' ? lesson.sourceName : lesson.targetNames?.[p.id] || '主板'} ${p.id} 引脚`}
                      onPointerEnter={() => setHud(`${kind}-${p.id}`)}
                      onPointerLeave={() => setHud(null)}
                      onFocus={() => setHud(`${kind}-${p.id}`)}
                      onBlur={() => setHud(null)}
                      onKeyDown={(e) => keyboard(e, kind, p.id)}
                      onPointerDown={(e) => {
                        if (kind !== 'source' || success) return;
                        e.preventDefault();
                        svgRef.current.setPointerCapture(e.pointerId);
                        const q = point(e);
                        setDrag({ source: p.id, x: q.x, y: q.y });
                      }}
                      className="pin"
                    >
                      <circle cx={p.x} cy={p.y} r="25" fill="transparent" />
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="13"
                        fill="#0d171a"
                        stroke={drag?.source === p.id ? '#fff' : '#6EE7B7'}
                        strokeWidth="2"
                      />
                      <circle cx={p.x} cy={p.y} r="5" fill="#6EE7B7" />
                      <text
                        x={kind === 'source' ? p.x - 25 : p.x + 25}
                        y={p.y + 5}
                        textAnchor={kind === 'source' ? 'end' : 'start'}
                        fill="#d3dbdc"
                        fontSize="13"
                        fontFamily="monospace"
                      >
                        {p.id}
                      </text>
                    </g>
                  )),
                )}
              </svg>
              <AnimatePresence>
                {hud && (
                  <motion.div
                    className="pin-hud"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <b>
                      {hud.endsWith('GND') ? 'GND · 共同参考地' : lesson.sourceName + ' · 引脚提示'}
                    </b>
                    <p>{lesson.hud}</p>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {celebrate && !reduced && (
                  <div className="particles" aria-hidden="true">
                    {Array.from({ length: 24 }, (_, i) => (
                      <motion.i
                        key={i}
                        style={{ background: i % 3 ? '#6ee7b7' : '#fff' }}
                        initial={{ x: 0, y: 0, opacity: 1 }}
                        animate={{
                          x: Math.cos((i / 24) * Math.PI * 2) * 150,
                          y: Math.sin((i / 24) * Math.PI * 2) * 120,
                          opacity: 0,
                          scale: 0,
                        }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.008 }}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
            <div
              className={`wire-feedback ${error ? 'is-error' : success ? 'is-success' : ''}`}
              role={burned ? undefined : error ? 'alert' : 'status'}
              aria-live="polite"
            >
              {error ? (
                <>
                  <AlertTriangle size={19} />
                  <span>
                    <b>危险！可能烧毁主板！</b>
                    <small>这是模拟警告。{lesson.description}</small>
                  </span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 size={19} />
                  <span>
                    <b>{lesson.success}</b>
                    <small>+250 XP · 本路线的示意接线已完成。</small>
                  </span>
                </>
              ) : (
                <>
                  <MousePointer2 size={18} />
                  <span>
                    拖拽左侧引脚到右侧目标
                    <small>键盘：Tab 选引脚 → 回车拿起 → Tab 选目标 → 回车连接；Esc 取消。</small>
                  </span>
                </>
              )}
            </div>
            <Button className="btn primary full" disabled={!success} onClick={onNext}>
              前往誊写房 <ArrowRight size={17} />
            </Button>
            <section className="workbench-warnings" aria-label="创客避坑指南">
              <h3>
                <AlertTriangle size={18} />
                老创客的避坑笔记
              </h3>
              {routeLessons[route.id].warnings.map((w) => (
                <div className="pitfall-card" key={w.title}>
                  <AlertTriangle size={16} />
                  <div>
                    <b>{w.text}</b>
                    <p>{w.detail}</p>
                  </div>
                </div>
              ))}
            </section>
          </section>
        </div>
      )}
      <div className="learning-tip">
        <Info size={19} />
        <div>
          <b>创客知识卡 · {route.name}接线范围</b>
          <p>{lesson.note}</p>
        </div>
      </div>
    </div>
  );
}
