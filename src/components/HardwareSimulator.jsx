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
import { Board, Pet, Microphone } from './Visuals';

// 坐标统一在 600×360 SVG 视口中，缩放时仍可准确命中。
const sources = [
  { id: 'VCC', x: 110, y: 145 },
  { id: 'GND', x: 110, y: 245 },
];
const targets = [
  { id: '3V3', x: 490, y: 145 },
  { id: 'GND', x: 490, y: 245 },
];
const valid = { VCC: '3V3', GND: 'GND' };
const pathFor = (a, b) => `M${a.x},${a.y} C${a.x + 140},${a.y} ${b.x - 140},${b.y} ${b.x},${b.y}`;

export default function HardwareSimulator({ completed, onComplete, onNext }) {
  const [exploded, setExploded] = useState(false);
  const [wires, setWires] = useState(completed ? { VCC: '3V3', GND: 'GND' } : {});
  const [drag, setDrag] = useState(null);
  const [error, setError] = useState(null);
  const [hud, setHud] = useState(null);
  const [celebrate, setCelebrate] = useState(false);
  const svgRef = useRef(null),
    errorTimer = useRef(null),
    celebrationTimer = useRef(null);
  const reduced = useReducedMotion();
  const success = Object.keys(wires).length === 2;
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
    if (success) return;
    if (valid[source] !== target) {
      setError({ source, target, id: Date.now() });
      clearTimeout(errorTimer.current);
      errorTimer.current = setTimeout(() => setError(null), 2500);
      return;
    }
    setError(null);
    const next = { ...wires, [source]: target };
    setWires(next);
    if (Object.keys(next).length === 2) {
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
    setWires({});
    setDrag(null);
    setError(null);
    setCelebrate(false);
    clearTimeout(errorTimer.current);
    clearTimeout(celebrationTimer.current);
  }

  return (
    <div className="page">
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">LEVEL 02 / THE HARDWARE LAB</div>
          <h1>
            认识它，然后<span className="text-neon">连接它。</span>
          </h1>
          <p>把抽象的电路，变成看得见的第一次成功。</p>
        </div>
        <span className="pill">
          <span className="status-dot" /> 虚拟实验环境
        </span>
      </div>
      <div className="lab-grid">
        <section className="panel hardware-gallery">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">01 / EXPLORE</span>
              <h2>一眼看懂，你的桌宠</h2>
            </div>
            <Button
              className={`btn small ${exploded ? 'active' : ''}`}
              onClick={() => setExploded(!exploded)}
            >
              <Layers3 size={16} />
              {exploded ? '合拢' : '拆解'}
            </Button>
          </div>
          <div className={`exploded-scene ${exploded ? 'is-exploded' : ''}`}>
            <div className="scene-grid" />
            <div className="assembly">
              <div className="assembly-board">
                <Board />
              </div>
              <div className="assembly-screen">
                <Pet />
              </div>
              <div className="assembly-mic">
                <Microphone />
              </div>
            </div>
            <div className="part-label part-a">
              01 <span>显示屏 / 表情窗口</span>
            </div>
            <div className="part-label part-b">
              02 <span>ESP32-S3 / 大脑</span>
            </div>
            <div className="part-label part-c">
              03 <span>I2S 麦克风 / 耳朵</span>
            </div>
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
          <p className="panel-description">
            为麦克风连接电源：<b>VCC → 3V3</b>，<b>GND → GND</b>。
          </p>
          <div className="wiring-stage">
            <div className="wire-device-labels">
              <span>
                MICROPHONE<small>麦克风模块</small>
              </span>
              <span>
                ESP32-S3<small>主控开发板</small>
              </span>
            </div>
            <svg
              ref={svgRef}
              viewBox="0 0 600 360"
              className="wiring-svg"
              aria-label="电源接线模拟器：拖拽左侧引脚到右侧，或使用 Tab 与回车操作"
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
              <rect x="31" y="89" width="80" height="210" rx="10" fill="#1b2930" stroke="#30454d" />
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
                      stroke="#00FFD1"
                      strokeWidth="8"
                      opacity=".3"
                      filter="url(#wireGlow)"
                      fill="none"
                    />
                    <path d={d} stroke="#00FFD1" strokeWidth="3" fill="none" />
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
                  stroke="#00FFD1"
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
                  transition={{ duration: 0.4 }}
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
                    aria-label={`${kind === 'source' ? '麦克风' : '主板'} ${p.id} 引脚`}
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
                      stroke={drag?.source === p.id ? '#fff' : '#00FFD1'}
                      strokeWidth="2"
                    />
                    <circle cx={p.x} cy={p.y} r="5" fill="#00FFD1" />
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
                  <b>{hud.endsWith('GND') ? 'GND · 共同参考地' : 'VCC / 3V3 · 3.3V 电源'}</b>
                  <p>
                    GPIO 是可编程输入/输出引脚。I²C 是使用 SDA、SCL
                    两根信号线的通信总线；本练习只接电源，I2S 麦克风的音频通信另需
                    BCLK、WS、数据线。
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {celebrate && (
                <div className="particles" aria-hidden="true">
                  {Array.from({ length: 24 }, (_, i) => (
                    <motion.i
                      key={i}
                      style={{ background: i % 3 ? '#00ffd1' : '#fff' }}
                      initial={{ x: 0, y: 0, opacity: 1 }}
                      animate={{
                        x: Math.cos((i / 24) * Math.PI * 2) * 150,
                        y: Math.sin((i / 24) * Math.PI * 2) * 120,
                        opacity: 0,
                        scale: 0,
                      }}
                      transition={{ duration: reduced ? 0.01 : 1.2, delay: i * 0.008 }}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
          <div
            className={`wire-feedback ${error ? 'is-error' : success ? 'is-success' : ''}`}
            role={error ? 'alert' : 'status'}
            aria-live="polite"
          >
            {error ? (
              <>
                <AlertTriangle size={19} />
                <span>
                  <b>危险！可能烧毁主板！</b>
                  <small>这是模拟警告。请将 VCC 接到 3V3，GND 接到 GND。</small>
                </span>
              </>
            ) : success ? (
              <>
                <CheckCircle2 size={19} />
                <span>
                  <b>电源连接正确！下一步已解锁。</b>
                  <small>+250 XP · 你已掌握供电与共地的基本概念。</small>
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
            前往代码魔改工坊 <ArrowRight size={17} />
          </Button>
        </section>
      </div>
      <div className="learning-tip">
        <Info size={19} />
        <div>
          <b>创客知识卡 · 为什么要共地？</b>
          <p>
            GND 是电压比较的共同基准。真实接线前先断电，并核对具体开发板和麦克风的数据手册；不要把
            VCC 接到未知 GPIO 或直接接 5V。本模块是电源概念模拟，不代表完整硬件连接或电路仿真。
          </p>
        </div>
      </div>
    </div>
  );
}
