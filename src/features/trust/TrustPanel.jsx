import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { MessageCircle, X, Flame } from 'lucide-react';
import { useWorldMap } from '../world/navigationStore';
import { nearHefi } from './HefiNpc';
import { useTrust, reportTrust } from './trustStore';
import { ACTS, TITLES, DIALOGUES, levelFor, prismCount, localDay } from './trust.mjs';
import { freshForge, actForge, advanceForge, SCRAPS, isTorch, wireLamp } from './forge.mjs';
import { hasChip } from './chipEffects.mjs';
import './trust.css';
const OPTIONS = [
  ['先修端子', '先换加热丝'],
  ['把焊枪还给你', '我想问问学徒的事'],
  ['点亮', '不点亮'],
];
export default function TrustEntry() {
  const nav = useWorldMap(),
    [open, setOpen] = useState(false),
    close = useCallback(() => setOpen(false), []);
  return createPortal(
    <>
      {nearHefi() && !nav.open && !nav.active && !open && (
        <button className="trust-entry" data-hefi-talk onClick={() => setOpen(true)}>
          <MessageCircle size={18} />
          赫菲 · 对话
        </button>
      )}
      {open && <TrustPanel onClose={close} />}
    </>,
    document.body,
  );
}
function TrustPanel({ onClose }) {
  const store = useTrust(),
    s = store.save,
    level = levelFor(s.trustPoints),
    ref = useRef(),
    previous = useRef(document.activeElement);
  const [act, setAct] = useState(null),
    [forge, setForge] = useState(freshForge),
    [readings, setReadings] = useState([]),
    [torch, setTorch] = useState(false),
    [lamp, setLamp] = useState({ powered: true, wired: false }),
    [message, setMessage] = useState(''),
    [line, setLine] = useState(0);
  useEffect(() => {
    store.reconcile();
    ref.current.focus();
    const key = (e) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
      if (e.key === 'Tab') {
        const nodes = [...ref.current.querySelectorAll('button,select,input')].filter(
            (n) => !n.disabled,
          ),
          first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
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
      store.flush();
      window.removeEventListener('keydown', key, true);
      previous.current?.focus();
    };
  }, [onClose]);
  useEffect(() => {
    if (act !== 0 || !forge.powered || forge.verified) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(),
        dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (!document.hidden && document.hasFocus()) setForge((v) => advanceForge(v, dt));
    }, 100);
    return () => clearInterval(timer);
  }, [act, forge.powered, forge.verified]);
  const emit = (kind, id) => reportTrust(kind, ACTS[act] || 'greet', id);
  function forgeAction(action) {
    const next = actForge(forge, action);
    setForge(next);
    if (next.measured && !forge.measured) emit('correctMeasure', 'heater');
    if (next.inspected && !forge.inspected) emit('correctDiagnose', 'terminal');
    if (next.repaired && !forge.repaired) emit('correctRepair', 'terminal');
  }
  function start(i) {
    store.dispatch({ type: 'start', id: ACTS[i] });
    setAct(i);
    setForge(freshForge());
    setReadings([]);
    setTorch(false);
    setLamp({ powered: true, wired: false });
    setMessage('');
  }
  const ready = act === 0 ? forge.verified : act === 1 ? torch : lamp.wired;
  const choice = s.choices.find((c) => c.act === ACTS[act]);
  function choose(text, index) {
    store.dispatch({
      type: 'choice',
      id: 'choice:' + ACTS[act],
      act: ACTS[act],
      optionId: String(index),
      text,
    });
    store.dispatch({
      type: 'value',
      id: ['furnace-terminal', 'torch-return', 'lamp-respect'][act],
    });
    emit('dialogue', 'choice');
  }
  function complete() {
    if (!ready || !choice) return;
    const result = {
      verified: true,
      ...(act === 0
        ? { elapsed: forge.elapsed, inBand: forge.inBand, resistance: 12 }
        : act === 1
          ? { item: '亡徒焊枪', length: 2, resistance: 0.2 }
          : { voltage: 24, isolated: true, lit: choice.optionId === '0' }),
    };
    store.dispatch({ type: 'complete', id: ACTS[act], result });
    emit('verifyPass', 'complete');
    setMessage('她把你这句话记在了工具柜上。');
  }
  return (
    <div className="modal-backdrop trust-shade">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label="赫菲"
        tabIndex={-1}
        ref={ref}
        data-trust-panel
        className="trust-panel"
      >
        <header>
          <div>
            <small>熔炉工坊 / 守炉人</small>
            <h1>
              <Flame size={24} />
              赫菲
            </h1>
          </div>
          <button aria-label="关闭信任面板" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="trust-layout">
          <aside>
            <h2>信任刻度 {level} / 7</h2>
            <div className="trust-scale" aria-label={'信任刻度 ' + level}>
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} className={i <= level ? 'lit' : ''}>
                  {i}
                </span>
              ))}
            </div>
            <p>{s.trustPoints} 点 · 本阶段上限 4 级</p>
            <blockquote>
              {s.chipUnlocked ? '孩子，灯在这儿。由你决定。' : DIALOGUES[level][line % 2]}
            </blockquote>
            {s.choices.length > 0 && (
              <p data-trust-quote>你说过：“{s.choices.at(-1).text}”。我记得。</p>
            )}
            <button
              onClick={() => {
                setLine((v) => v + 1);
                reportTrust('dialogue', 'greet', 'talk');
              }}
            >
              交谈
            </button>
            <button
              onClick={() => {
                store.dispatch({ type: 'value', id: 'listen-first' });
                setMessage('你说：“先听读数，再动手。”她把仪表推近了一点。');
              }}
            >
              先听读数，再动手
            </button>
            <button
              onClick={() => {
                store.dispatch({ type: 'value', id: 'respect-tools' });
                setMessage('你说：“旧工具也值得修好。”她给你留了一个位置。');
              }}
            >
              旧工具也值得修好
            </button>
            <button
              disabled={level < 1 || s.dailyGreeting.lastSeenDay === localDay()}
              onClick={() => {
                store.dispatch({ type: 'greet' });
                setMessage('今天也来了。炉火还暖着。');
                reportTrust('dialogue', 'greet', localDay());
              }}
            >
              每日问候
            </button>
            <button
              onClick={() => {
                const before = useTrust.getState().save.gifts.total;
                store.dispatch({ type: 'gift' });
                setMessage(
                  useTrust.getState().save.gifts.total > before
                    ? '她把元件放进了工具箱。'
                    : '他更看重你亲手修好的东西',
                );
              }}
            >
              送一枚备用元件
            </button>
            {import.meta.env.DEV && (
              <button
                data-trust-debug
                onClick={() =>
                  store.dispatch({ type: 'debug', id: 'debug:' + crypto.randomUUID() })
                }
              >
                开发调试 · +2 点
              </button>
            )}
            <h3>老匠之眼 · {s.chipUnlocked ? '已解锁' : '未解锁'}</h3>
            <p data-trust-chip>
              {s.chipUnlocked
                ? '隐藏接点旁浮起微光，只提示，不代替操作。'
                : '完成三幕并达到信任4级。'}
            </p>
            <p>记忆棱镜 {prismCount(s)} · XP 0</p>
            <details>
              <summary>选择记录</summary>
              {s.choices.map((c) => (
                <p key={c.id}>
                  {TITLES[ACTS.indexOf(c.act)]}：“{c.text}”
                </p>
              ))}
            </details>
          </aside>
          <main>
            <div className="trust-cards">
              {ACTS.map((id, i) => (
                <article key={id}>
                  <h2>{TITLES[i]}</h2>
                  <p>
                    信任 ≥{i + 2} ·{' '}
                    {s.invites[id].state === 'done'
                      ? '完成'
                      : s.invites[id].state === 'locked'
                        ? '未解锁'
                        : '可进入'}
                  </p>
                  <button
                    data-trust-act={i + 1}
                    disabled={s.invites[id].state === 'locked' || s.invites[id].state === 'done'}
                    onClick={() => start(i)}
                  >
                    进入邀约
                  </button>
                </article>
              ))}
            </div>
            {act !== null && (
              <section className="trust-act" data-trust-scene={act + 1}>
                <h2>{TITLES[act]}</h2>
                <p>可慢慢观察、测量与交谈；失败不扣资源，可以重来。</p>
                <svg
                  viewBox="0 0 600 130"
                  role="img"
                  aria-label={['旧熔炉工作台', '三堆废料', '纪念墙夜灯'][act]}
                >
                  <rect width="600" height="130" fill="#152c35" />
                  {act === 0 ? (
                    <>
                      <path
                        d="M40 105H150V35H270V105H560"
                        fill="none"
                        stroke="#b98b67"
                        strokeWidth="8"
                      />
                      <polyline
                        points={
                          '300,110 ' +
                          Array.from(
                            { length: 8 },
                            (_, i) =>
                              `${300 + i * 35},${110 - (Math.min(i, forge.elapsed) / 7) * 80}`,
                          ).join(' ')
                        }
                        fill="none"
                        stroke="#7fffe8"
                        strokeWidth="3"
                      />
                    </>
                  ) : act === 1 ? (
                    [70, 270, 470].map((x, i) => (
                      <path
                        key={x}
                        d={`M${x} 110l40 -75 50 75z`}
                        fill={['#9c7558', '#536b75', '#bdc2ae'][i]}
                      />
                    ))
                  ) : (
                    <>
                      <path d="M120 110V30H470V110" fill="#344858" />
                      <circle
                        cx="300"
                        cy="65"
                        r="18"
                        fill={s.invites[ACTS[2]].result?.lit ? '#ffe4a5' : '#56636a'}
                      />
                    </>
                  )}
                </svg>
                {act === 0 && (
                  <>
                    <p>标称加热丝约 12Ω。先隔离，再用通断与电阻读数检查。</p>
                    <div className="trust-actions">
                      {[
                        ['cut', '断电'],
                        ['measure', '通断 / 电阻测量'],
                        ['inspect', '检查端子'],
                        ['terminal', '替换端子'],
                        ['crimp', '重新压接'],
                        ['power', '通电观察'],
                      ].map(([id, label]) => (
                        <button key={id} onClick={() => forgeAction(id)}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <output data-forge-meter>
                      {forge.powered ? '通电' : '断电'} · {forge.temperature.toFixed(1)}°C ·{' '}
                      {forge.elapsed.toFixed(1)} / 7 秒 · 带内 {forge.inBand.toFixed(1)} / 3 秒
                      <br />
                      {forge.message}
                    </output>
                    <p>目标温度带 180–220°C，完整观察7秒且带内累计3秒。</p>
                    <blockquote>“熔炉不是脾气坏，是接触不好。”</blockquote>
                  </>
                )}
                {act === 1 && (
                  <>
                    <p>
                      寻找线长约2m、回路电阻约0.2Ω的一组。电源线中段断口已隔离，测的是保留线段。
                    </p>
                    {SCRAPS.map((item) => (
                      <div key={item.id}>
                        <button
                          onClick={() => {
                            setReadings((v) => [...new Set([...v, item.id])]);
                            emit('correctMeasure', item.id);
                          }}
                        >
                          {item.name} · 通断测量
                        </button>
                        {readings.includes(item.id) && (
                          <>
                            <output>
                              {item.length}m ·{' '}
                              {Number.isFinite(item.resistance)
                                ? item.resistance + 'Ω · 有声'
                                : '∞Ω · 无声'}
                            </output>
                            <button
                              onClick={() => {
                                setTorch(isTorch(item));
                                setMessage(
                                  isTorch(item)
                                    ? '这根线的读数与记录相符。'
                                    : '线段读数与记录不一致。',
                                );
                                if (isTorch(item)) emit('correctDiagnose', 'torch');
                              }}
                            >
                              取回这组线与焊枪
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    <blockquote>“你像我以前的学徒。肯蹲下来找一根线。”</blockquote>
                  </>
                )}
                {act === 2 && (
                  <>
                    <p>灯座额定24V。使用独立安全支路，断电后接线。</p>
                    <button
                      onClick={() => {
                        setLamp((v) => ({ ...v, powered: false, message: '支路已断电。' }));
                        emit('correctMeasure', 'zero-voltage');
                      }}
                    >
                      断开24V支路
                    </button>
                    <label>
                      支路电压
                      <select
                        aria-label="支路电压"
                        value={lamp.voltage || 24}
                        onChange={(e) =>
                          setLamp((v) => ({ ...v, voltage: +e.target.value, wired: false }))
                        }
                      >
                        <option value="24">24V</option>
                        <option value="48">48V</option>
                      </select>
                    </label>
                    <button
                      onClick={() => {
                        const next = wireLamp(lamp, lamp.voltage || 24);
                        setLamp(next);
                        if (next.wired) emit('correctRepair', 'safe-branch');
                      }}
                    >
                      连接灯座
                    </button>
                    <output>{lamp.message}</output>
                    <blockquote>“名字是六。工具箱上，刻着这个名字。孩子，灯由你决定。”</blockquote>
                  </>
                )}
                {hasChip() && <p className="trust-helper">老匠之眼：接点边缘有一线微光。</p>}
                <fieldset disabled={!ready || !!choice}>
                  <legend>选择 · 保留你的原话</legend>
                  {OPTIONS[act].map((text, i) => (
                    <button key={text} onClick={() => choose(text, i)}>
                      {text}
                    </button>
                  ))}
                </fieldset>
                {choice && <p>你：“{choice.text}”</p>}
                <button
                  data-trust-complete
                  disabled={!ready || !choice || s.invites[ACTS[act]].state === 'done'}
                  onClick={complete}
                >
                  完成
                </button>
              </section>
            )}
            <p role="status" data-trust-message>
              {message}
            </p>
            {store.storageError && <p role="alert">存档不可写，仅本次会话有效。</p>}
          </main>
        </div>
      </motion.section>
    </div>
  );
}
