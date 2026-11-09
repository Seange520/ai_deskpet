import { useState } from 'react';
import { Gauge } from 'lucide-react';
import { evaluate } from './checks.mjs';

export function useEvidence(data) {
  const [evidence, setEvidence] = useState([]);
  const record = (values, checks = data.checks) => {
    const result = evaluate({ values, evidence }, checks);
    setEvidence(result.evidence);
    return result;
  };
  return { evidence, record };
}
export function SimFrame({ data, evidence, children }) {
  const count = data.checks.filter(
    (c) => evidence.find((e) => e.id === c.id)?.attempts.at(-1)?.passed,
  ).length;
  return (
    <section className="sim-card" data-sim={data.id} data-complete={count === data.checks.length}>
      <h2>
        <Gauge size={22} aria-hidden="true" />
        {data.title}
      </h2>
      <p>{data.instructions}</p>
      {children}
      <details>
        <summary>
          校验证据 · {count}/{data.checks.length} 通过
        </summary>
        <ul>
          {evidence.map((e) => (
            <li key={e.id}>
              {e.id} · {e.type} · {e.attempts.length} 次尝试 ·{' '}
              {e.attempts.at(-1).passed ? '通过' : '待重试'}
            </li>
          ))}
        </ul>
      </details>
      <output className="sim-progress" aria-live="polite">
        {count === data.checks.length
          ? '全部通过 · 可以复盘'
          : `已通过 ${count}/${data.checks.length}，可随时重试`}
      </output>
    </section>
  );
}
export const data = {
  id: 'meter',
  title: '万用表 · 先选档，再测量',
  instructions: '测量 24V 电源、断电线路通断和 220Ω 电阻。电压并联测；通断与电阻必须断电。',
  elements: ['supply', 'closed', 'open', 'resistor'],
  checks: [
    { id: 'voltage', type: 'numeric', task: 'voltage', expected: 24, tolerance: 0.2 },
    { id: 'closed', type: 'choice', task: 'closed', expected: '通' },
    { id: 'open', type: 'choice', task: 'open', expected: '断' },
    { id: 'resistor', type: 'numeric', task: 'resistor', expected: 220, tolerance: 20 },
  ],
  evidenceTypes: ['numeric', 'choice'],
};
export default function MeterSim() {
  const [mode, setMode] = useState('20V');
  const [target, setTarget] = useState('supply');
  const [message, setMessage] = useState('请选择被测物与档位。');
  const { evidence, record } = useEvidence(data);
  function measure() {
    const key = target === 'supply' ? 'voltage' : target;
    const correct =
      target === 'supply' ? mode === '60V' : target === 'resistor' ? mode === 'Ω' : mode === '通断';
    const value =
      target === 'supply' ? 24 : target === 'resistor' ? 220 : target === 'closed' ? '通' : '断';
    record(
      { [key]: correct ? value : null },
      data.checks.filter((c) => c.id === key),
    );
    setMessage(
      correct
        ? `${target === 'supply' ? '24.0 V' : target === 'resistor' ? '220 Ω' : value === '通' ? '蜂鸣 · 线路通' : 'OL · 线路断'} · 测量通过`
        : target === 'supply' && mode === '20V'
          ? '溢出 OL：24V 超出 20V 量程，请升至 60V 直流档。'
          : target === 'supply'
            ? '保险丝风险：带电电源不能用通断/Ω 档，请改用 60V 直流档。'
            : '档位不匹配：先确认已断电，再选择通断档或 Ω 档。',
    );
  }
  return (
    <SimFrame data={data} evidence={evidence}>
      <label>
        被测物
        <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="被测物">
          <option value="supply">24V 直流电源</option>
          <option value="closed">断电闭合线路</option>
          <option value="open">断电断开线路</option>
          <option value="resistor">断电 220Ω 电阻</option>
        </select>
      </label>
      <fieldset>
        <legend>万用表档位</legend>
        {['20V', '60V', '通断', 'Ω'].map((v) => (
          <label key={v}>
            <input
              type="radio"
              name="meter-mode"
              checked={mode === v}
              onChange={() => setMode(v)}
            />
            {v}
          </label>
        ))}
      </fieldset>
      <button onClick={measure}>测量</button>
      <output className="sim-reading" role="status">
        {message}
      </output>
    </SimFrame>
  );
}
