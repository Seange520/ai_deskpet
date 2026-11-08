import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { NotebookPen, X } from 'lucide-react';
import { useWorldMap } from '../world/navigationStore';
import { useExploration } from '../world/explorationState';
import { inStreetRange } from '../street/streetStore';
import { LENSES } from '../street/kickback.mjs';
import { ENV_CLUES, CASE_SEVEN_LAMPS } from './env.mjs';
import { HYPOTHESES, CATEGORY_LABELS, validateCase } from './caseBoard.mjs';
import { useEnv } from './envStore';
import NpcReactions from './NpcReactions';
import './env.css';
export default function EnvEntry() {
  const nav = useWorldMap(),
    blocked = useExploration((v) => v.blocked),
    [open, setOpen] = useState(false);
  const available = inStreetRange() && !nav.open && !nav.active;
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    const key = (e) => {
      if (e.code !== 'KeyN' || e.repeat || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (available && !blocked && !document.querySelector('[role="dialog"]')) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [available, blocked]);
  useEffect(() => {
    if (!available) setOpen(false);
  }, [available]);
  return createPortal(
    <>
      {available && !open && !blocked && (
        <button className="env-entry" data-env-notebook onClick={() => setOpen(true)}>
          <NotebookPen size={18} />
          街区笔记本 <kbd>N</kbd>
        </button>
      )}
      {open && <CaseBoardPanel onClose={close} />}
    </>,
    document.body,
  );
}
export function CaseBoardPanel({ onClose }) {
  const s = useEnv(),
    ref = useRef(),
    previous = useRef(document.activeElement);
  const [mode, setMode] = useState('voltage'),
    [range, setRange] = useState('20V'),
    [selected, setSelected] = useState(''),
    [validation, setValidation] = useState(false);
  const status = validateCase(s.save.board, s.save.case.evidence),
    dispatch = s.dispatch;
  useEffect(() => {
    ref.current.focus();
    const key = (e) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
      if (e.key === 'Tab') {
        const list = [...ref.current.querySelectorAll('button,select,input')].filter(
            (n) => !n.disabled,
          ),
          first = list[0],
          last = list.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', key, true);
    return () => {
      s.flush();
      window.removeEventListener('keydown', key, true);
      previous.current?.focus();
    };
  }, [onClose]);
  useEffect(() => {
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(),
        dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (document.hasFocus() && !document.hidden) s.tick(dt);
    }, 100);
    return () => clearInterval(timer);
  }, []);
  const measure = (id, probe, override) => {
    const actual = override || mode;
    dispatch({
      type: 'measure',
      id,
      probe,
      mode: actual,
      max: override
        ? undefined
        : LENSES.find((l) => l.id === mode).ranges.find((r) => r.id === range)?.max,
    });
  };
  return (
    <div className="modal-backdrop env-backdrop">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="街区案件板"
        className="env-panel"
        data-env-panel
      >
        <header>
          <div>
            <small>熔炉外街 / FIELD NOTES</small>
            <h1>七盏灯谋杀案</h1>
          </div>
          <button aria-label="关闭案件板" onClick={onClose}>
            <X />
          </button>
        </header>
        <p>[COPY-PENDING] 夜宵摊老板：这排灯，今晚又一盏接一盏地暗了。</p>
        <div className="env-layout">
          <main>
            <svg
              viewBox="0 0 640 210"
              role="img"
              aria-label="熔炉外街俯视图，点击钉住现象"
              data-env-map
              onClick={(e) => {
                if (!selected) return;
                const box = e.currentTarget.getBoundingClientRect();
                s.pin(
                  selected,
                  (e.clientX - box.left) / box.width,
                  (e.clientY - box.top) / box.height,
                );
              }}
            >
              <rect width="640" height="210" fill="#132c36" />
              <path d="M20 100H620" stroke="#48616a" strokeWidth="40" />
              <text x="20" y="30" fill="#b8c8c5">
                北侧 / 七盏灯
              </text>
              {CASE_SEVEN_LAMPS.lamps.map((l, i) => (
                <g key={l.id}>
                  <circle cx={50 + i * 85} cy="64" r="8" fill="#d0ad76" />
                  <text x={40 + i * 85} y="88" fill="#bfd5d1">
                    {l.id}
                  </text>
                </g>
              ))}
              <text x="210" y="155" fill="#bed6ce">
                G0
              </text>
              <text x="400" y="155" fill="#bed6ce">
                夜宵摊
              </text>
              {s.save.board.pins.map((p, i) => (
                <g key={p.clueId} transform={'translate(' + p.x * 640 + ',' + p.y * 210 + ')'}>
                  <title>{ENV_CLUES.find((c) => c.id === p.clueId)?.phenomenon}</title>
                  <circle r="10" fill="#e6a689" />
                  <text y="4" textAnchor="middle" fill="#152c35" fontSize="11">
                    {i + 1}
                  </text>
                </g>
              ))}
            </svg>
            <p>[COPY-PENDING] 选已测卡片，再点击地图钉住。假设只保留你的思路。</p>
            <div className="env-clues">
              {ENV_CLUES.map((c) => (
                <article key={c.id} data-env-clue={c.id}>
                  <h3>{c.phenomenon}</h3>
                  <small>[COPY-PENDING] {c.explanation}</small>
                  <p>[COPY-PENDING] {c.hint}</p>
                  <button data-env-measure-clue={c.id} onClick={() => measure(c.id, c.probe)}>
                    测量 · {c.probe}
                  </button>
                  {s.save.clues[c.id]?.found && (
                    <>
                      <p>
                        {s.save.clues[c.id].value} {c.unit} · {c.learning}
                      </p>
                      <button
                        aria-pressed={selected === c.id}
                        data-env-pin={c.id}
                        onClick={() => setSelected(c.id)}
                      >
                        选择现象卡
                      </button>
                    </>
                  )}
                </article>
              ))}
            </div>
            <fieldset>
              <legend>预设假设</legend>
              {HYPOTHESES.map((h) => (
                <button
                  key={h.id}
                  data-env-hypothesis={h.id}
                  aria-pressed={s.save.board.hypotheses.some((v) => v.id === h.id)}
                  onClick={() => s.hypothesis(h.id)}
                >
                  {h.text}
                </button>
              ))}
            </fieldset>
            <button
              data-env-validate
              onClick={() => {
                setValidation(true);
                if (status.valid) s.validate();
              }}
            >
              核对证据类别
            </button>
            {validation && (
              <p data-env-missing>
                {!status.valid ? '证据还不足以结案' : '证据类别已齐全'}
                {status.missing.length > 0 &&
                  ' · 缺失：' + status.missing.map((e) => CATEGORY_LABELS[e]).join('、')}
              </p>
            )}
            <NpcReactions />
          </main>
          <aside>
            <h2>万用表 · M1 现场仪表</h2>
            <label>
              测量档位
              <select
                data-env-mode
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value);
                  setRange(LENSES.find((l) => l.id === e.target.value).ranges[0].id);
                }}
              >
                {LENSES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              量程
              <select data-env-range value={range} onChange={(e) => setRange(e.target.value)}>
                {LENSES.find((l) => l.id === mode).ranges.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <output className="env-reading" data-env-reading>
              {s.reading?.ok
                ? String(s.reading.value) + ' ' + s.reading.unit
                : s.reading?.message || '等待测量'}
              <small>{s.reading?.detail}</small>
            </output>
            <p>{s.powered ? '● 带电 / 24V仿真' : '○ 支路隔离'}</p>
            <button data-env-isolate onClick={() => dispatch({ type: 'isolate' })}>
              断电隔离支路
            </button>
            <div className="env-probes">
              {CASE_SEVEN_LAMPS.lamps.map((l) => (
                <div key={l.id}>
                  <b>{l.id}</b>
                  <button data-env-ground={l.id} onClick={() => measure(l.id, 'ground')}>
                    接地两端
                  </button>
                  <button data-env-chain={l.id} onClick={() => measure(l.id, 'chain')}>
                    接地链
                  </button>
                  <button data-env-socket={l.id} onClick={() => measure(l.id, 'socket')}>
                    灯座压差
                  </button>
                </div>
              ))}
            </div>
            <button data-env-inspect onClick={() => measure('L8', 'terminal', 'inspect')}>
              拆检接地排
            </button>
            <button data-env-wire onClick={() => dispatch({ type: 'wire' })}>
              补独立接地线
            </button>
            <button data-env-power onClick={() => dispatch({ type: 'power' })}>
              送电并观察
            </button>
            <progress max="10" value={s.save.case.verifiedSeconds} />
            <p data-env-seconds>{s.save.case.verifiedSeconds.toFixed(1)} / 10秒</p>
            <button
              data-env-close-case
              onClick={() => {
                setValidation(true);
                dispatch({ type: 'close' });
              }}
            >
              申请结案
            </button>
            <p role="status" data-env-status>
              {s.message}
            </p>
            {s.save.case.state === 'closed' && (
              <div data-env-closed>
                <h2>已结案</h2>
                <p>{s.save.case.reportLine}</p>
                <p>修复：补独立接地线 · 负载观察 {s.save.case.verifiedSeconds}秒</p>
                <p>
                  用时{' '}
                  {Math.max(
                    0,
                    Math.round(
                      (Date.parse(s.save.case.closedAt) -
                        (s.save.history[0]?.at || Date.parse(s.save.case.closedAt))) /
                        1000,
                    ),
                  )}
                  秒
                </p>
                <p>100 XP · 记忆棱镜 ×1</p>
              </div>
            )}
            <button
              data-env-eye
              aria-pressed={!!s.eye}
              onClick={() => useEnv.setState({ eye: !s.eye })}
            >
              鹰眼线路记忆
            </button>
            {s.storageError && <p role="alert">存档不可写，仅本次会话有效。</p>}
          </aside>
        </div>
      </motion.section>
    </div>
  );
}
