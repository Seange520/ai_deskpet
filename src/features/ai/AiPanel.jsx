import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Trash2 } from 'lucide-react';
import { useAi } from './aiStore.js';
import { diagnosticEvent, generateResponse } from './ai.mjs';
import { remember, exportMemory, readOnlyLayers } from './memory.mjs';
import { cleanInput } from './guard.mjs';
import { useStreet } from '../street/streetStore.js';
import { useTrust } from '../trust/trustStore.js';
const clue = '一条线索：先断电，再比较不同测点的记录；同一读数还缺哪一种独立证据？';
export default function AiPanel({ profile, corpus, onClose }) {
  const { memory, error, typing, update, clear, consent, setTyping } = useAi();
  const [tab, setTab] = useState('对话'),
    [input, setInput] = useState(''),
    [messages, setMessages] = useState([]),
    [busy, setBusy] = useState(false),
    [partial, setPartial] = useState('');
  const panel = useRef(null),
    timers = useRef(new Set()),
    behavior = useRef({}),
    alive = useRef(true),
    generation = useRef(0);
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };
  useEffect(() => {
    alive.current = true;
    panel.current?.querySelector('button')?.focus();
    return () => {
      alive.current = false;
      timers.current.forEach(clearTimeout);
    };
  }, []);
  useEffect(() => {
    const escape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', escape, true);
    return () => document.removeEventListener('keydown', escape, true);
  }, [onClose]);
  const exploration = useStreet((s) => s);
  const choices = useTrust((s) => s.save.choices);
  const layers = readOnlyLayers(profile, exploration, choices);
  async function send(e) {
    e.preventDefault();
    if (busy || !input.trim()) return;
    const text = cleanInput(input),
      result = generateResponse({
        input: text,
        profile,
        memory: useAi.getState().memory,
        corpus,
        off: new URLSearchParams(location.search).get('ai') === '0',
      });
    if (result.status === 'off') return;
    let next = result.memory;
    const event = /测量|读数/.test(text)
      ? { type: 'measurement', key: text }
      : /诊断.*(错|失败)/.test(text)
        ? { type: 'wrongDiagnosis' }
        : null;
    if (event) {
      const d = diagnosticEvent(behavior.current, event);
      behavior.current = d.state;
      if (d.key && !next.aideDiagnosis.some((i) => i.key === d.key))
        next = { ...next, aideDiagnosis: [...next.aideDiagnosis, { at: Date.now(), key: d.key }] };
    }
    update(next);
    setInput('');
    setBusy(true);
    setMessages((m) => [...m, { role: '你', text }]);
    const token = generation.current;
    later(() => {
      if (!alive.current || generation.current !== token) return;
      if (new URLSearchParams(location.search).get('ai') === '0') {
        setBusy(false);
        return;
      }
      let index = 0;
      const finish = () => {
        setMessages((m) => [
          ...m,
          {
            role: result.persona === 'verifier' ? '校验体' : '零',
            text: result.text,
            citations: result.citations,
          },
        ]);
        setPartial('');
        setBusy(false);
        update(remember(useAi.getState().memory, text, result.text));
      };
      const tick = () => {
        if (generation.current !== token) return;
        index += 4;
        setPartial(result.text.slice(0, index));
        if (index < result.text.length && useAi.getState().typing) later(tick, 16);
        else finish();
      };
      if (typing) tick();
      else finish();
    }, result.delayMs);
  }
  function erase() {
    generation.current++;
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    clear();
    setMessages([]);
    setPartial('');
    setBusy(false);
    behavior.current = {};
  }
  function download() {
    const url = URL.createObjectURL(new Blob([exportMemory(memory)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zero-memory.json';
    a.click();
    later(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <motion.section
      ref={panel}
      className="ai-panel"
      data-ai-panel
      role="dialog"
      aria-label="零的档案"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') onClose();
      }}
    >
      <header>
        <div>
          <small>LOCAL ARCHIVE / 开发预览</small>
          <h2>零的档案</h2>
        </div>
        <button aria-label="关闭零面板" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <div role="tablist" aria-label="档案栏目">
        {['对话', '记忆', '设置'].map((t) => (
          <button
            key={t}
            role="tab"
            id={'ai-tab-' + t}
            aria-controls="ai-content"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div id="ai-content" role="tabpanel" aria-labelledby={'ai-tab-' + tab} className="ai-content">
        {tab === '对话' && (
          <>
            <p className="ai-note">把你看到的现象留在这里。下一步由你决定。</p>
            <div className="ai-messages" aria-live="polite">
              {messages.map((m, i) => (
                <article key={i}>
                  <strong>{m.role}</strong>
                  <p>{m.text}</p>
                  {m.citations?.length > 0 && <small>课节：{m.citations.join('、')}</small>}
                </article>
              ))}
              {busy && <p role="status">{partial || '残响正在核对…'}</p>}
            </div>
            {memory.aideDiagnosis.length > 0 && (
              <p data-testid="ai-diagnosis" className="ai-clue">
                {clue}
              </p>
            )}
            <form onSubmit={send}>
              <label htmlFor="ai-input">描述现象（最多 500 字）</label>
              <textarea
                id="ai-input"
                value={input}
                onChange={(e) => setInput(cleanInput(e.target.value))}
                rows={2}
              />
              <button disabled={busy || !input.trim() || memory.aiUsage.rounds >= 60}>发送</button>
            </form>
            {memory.aiUsage.rounds >= 60 && <p>今日校验次数已用尽。下一步：回到课节，明天再来。</p>}
          </>
        )}
        {tab === '记忆' && (
          <>
            <h3>最近的核对 · {memory.recent.length}/12</h3>
            {memory.recent.map((m, i) => (
              <p key={i}>{m.text}</p>
            ))}
            {!memory.recent.length && <p>暂无对话记忆</p>}
            <h3>事件摘要 · {memory.summaries.length}/20</h3>
            {memory.summaries.map((m, i) => (
              <p key={i}>{m.text}</p>
            ))}
            <h3>偏好 · {memory.preferences.length}/3</h3>
            {memory.preferences.map((m, i) => (
              <p key={i}>{m.text}</p>
            ))}
            <h3>你曾经的选择（探索存档只读）</h3>
            <p>
              {layers.choices.map((choice) => choice.text).join('、') || '暂无已记录的探索选择'}
            </p>
            <p>
              教学语义：
              {
                Object.values(layers.semantic.kps || {}).filter((k) => k.status === 'mastered')
                  .length
              }{' '}
              项常亮；本次探索状态只读。
            </p>
            <div className="ai-actions">
              <button onClick={download}>
                <Download size={15} />
                导出记忆
              </button>
              <button onClick={erase}>
                <Trash2 size={15} />
                清空记忆
              </button>
            </div>
          </>
        )}
        {tab === '设置' && (
          <>
            <p>本地模板预览，无付费调用。每日最多 60 轮。</p>
            <label>
              <input
                type="checkbox"
                checked={memory.consent}
                onChange={(e) => consent(e.target.checked)}
              />
              允许本机保存记忆（180 天过期）
            </label>
            <label>
              <input
                type="checkbox"
                checked={typing}
                onChange={(e) => setTyping(e.target.checked)}
              />
              打字机效果
            </label>
            <label htmlFor="ai-preference">交流偏好</label>
            <select
              id="ai-preference"
              value={memory.preferences[0]?.text || ''}
              onChange={(e) =>
                update({
                  ...memory,
                  preferences: e.target.value ? [{ at: Date.now(), text: e.target.value }] : [],
                })
              }
            >
              <option value="">默认</option>
              <option>简短线索</option>
              <option>先问后答</option>
              <option>课节引用</option>
            </select>
            <p>模拟核对延迟：300–600ms。关闭：地址参数 ai=0。</p>
            <p>记忆授权只影响此独立档案，不修改维护者档案。</p>
          </>
        )}
      </div>
      <footer>
        今日 {memory.aiUsage.rounds}/60 轮 · {memory.aiUsage.characters} 字 · ¥0
      </footer>
      {error && <p role="alert">{error}</p>}
    </motion.section>
  );
}
