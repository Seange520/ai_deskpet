import { useState } from 'react';
import { measurementPass } from './learning.mjs';
export default function ModeMeterSim({ checks, onComplete }) {
  const [mode, setMode] = useState('voltage'),
    [range, setRange] = useState('200'),
    [live, setLive] = useState(false),
    [read, setRead] = useState({}),
    [answers, setAnswers] = useState({}),
    [message, setMessage] = useState('');
  const modeFor = (c) =>
    c.unit === 'Ω' ? 'resistance' : c.unit === 'V' ? 'voltage' : 'instrument';
  function measure(c) {
    onComplete(undefined, []);
    const ok =
      mode === modeFor(c) &&
      (!live || mode !== 'resistance') &&
      (typeof c.expected !== 'number' || Math.abs(c.expected) <= Number(range));
    setRead((v) => ({
      ...v,
      [c.id]: {
        probe: c.probe || c.id,
        mode,
        range,
        reading: ok ? String(c.expected) : 'OL',
        live,
        valid: ok,
      },
    }));
    setMessage(
      ok ? '读数已采集，请记录后校验。' : '请检查档位、量程和断电状态。',
    );
  }
  function submit() {
    const records = checks.map((c) => ({
      id: c.id,
      type: 'measurement',
      score:
        read[c.id]?.valid && measurementPass(c, answers[c.id] ?? '') ? 1 : 0,
      context: { ...read[c.id], recorded: answers[c.id], unit: c.unit },
    }));
    const score = records.filter((e) => e.score === 1).length / checks.length;
    onComplete(score, records);
    setMessage(score === 1 ? '测量记录通过。' : '还有读数需要复查，可以重测。');
  }
  return (
    <section className="teaching-meter" aria-label="DOM 万用表仿真">
      <p>教学仿真 · 数值为预置模型，不能代替真机测量。</p>
      <label>
        <input
          type="checkbox"
          checked={live}
          onChange={(e) => setLive(e.target.checked)}
        />
        模拟供电
      </label>
      <label>
        模式
        <select
          aria-label="万用表模式"
          value={mode}
          onChange={(e) => {
            if (live && e.target.value === 'resistance') {
              setMessage('请先断电，再切换电阻档。');
              return;
            }
            setMode(e.target.value);
          }}
        >
          <option value="voltage">电压</option>
          <option value="resistance">电阻 / 通断</option>
          <option value="instrument">仪器 / 计算</option>
        </select>
      </label>
      <label>
        量程
        <select
          aria-label="万用表量程"
          value={range}
          onChange={(e) => setRange(e.target.value)}
        >
          {[20, 200, 2000, 200000].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      {checks.map((c) => (
        <div key={c.id} className="teaching-measure-row">
          <button type="button" data-probe={c.id} onClick={() => measure(c)}>
            测量 {c.probe || c.id}
          </button>
          <output aria-live="polite" data-display={c.id}>
            {read[c.id]?.reading ?? '—'} {c.unit}
          </output>
          <label>
            {c.formula || c.probe || c.id} ({c.unit})
            <input
              aria-label={'记录 ' + c.id}
              data-reading={c.id}
              value={answers[c.id] ?? ''}
              onChange={(e) => {
                setAnswers((a) => ({ ...a, [c.id]: e.target.value }));
                onComplete(undefined, []);
              }}
            />
          </label>
        </div>
      ))}
      <button type="button" data-meter-submit onClick={submit}>
        校验测量记录
      </button>
      <p role="status">{message}</p>
    </section>
  );
}
