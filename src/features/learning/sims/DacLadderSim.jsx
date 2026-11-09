import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'dac-ladder',
  title: 'DAC · 把数字送回电压',
  instructions:
    '拨 4 位开关，看输出怎么从 0 变到接近 Vref；每 1 个 LSB 是多少伏？先把两个读数写下来。',
  elements: ['bit3', 'bit2', 'bit1', 'bit0'],
  checks: [
    { id: 'code8', type: 'numeric', task: 'code8', expected: 1.65, tolerance: 0.02 },
    { id: 'code15', type: 'numeric', task: 'code15', expected: 3.09, tolerance: 0.02 },
    { id: 'step', type: 'choice', task: 'step', expected: 'Vref/16' },
  ],
  evidenceTypes: ['numeric', 'choice'],
};

const VREF = 3.3;
const BITS = [
  { id: 3, weight: 8, label: 'B3' },
  { id: 2, weight: 4, label: 'B2' },
  { id: 1, weight: 2, label: 'B1' },
  { id: 0, weight: 1, label: 'B0' },
];

export default function DacLadderSim({ onComplete } = {}) {
  const [bits, setBits] = useState({ 3: 0, 2: 0, 1: 0, 0: 0 });
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState('4 位 DAC，满量程（Vref=3.3V）被分成 16 份。');
  const { evidence, record } = useEvidence(data, onComplete);

  const code = BITS.reduce((sum, b) => sum + bits[b.id] * b.weight, 0);
  const vout = (code / 16) * VREF;

  function toggle(id) {
    setBits((prev) => ({ ...prev, [id]: prev[id] ? 0 : 1 }));
  }

  function verify() {
    const result = record({
      code8: Number(answers.code8 ?? NaN),
      code15: Number(answers.code15 ?? NaN),
      step: answers.step || null,
    });
    if (result.passed) {
      setMessage('DAC 判断正确：code/16×Vref，4 位分辨率是 Vref/16。');
      return;
    }
    const first = result.checks.find((c) => !c.passed);
    setMessage(
      first?.id === 'code8'
        ? '1000 等于 8，8/16×3.3V = 1.65V。'
        : first?.id === 'code15'
          ? '1111 等于 15，15/16×3.3V ≈ 3.09V。'
          : '4 位 DAC 把 Vref 分成 16 份，最小步进是 Vref/16。',
    );
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      <div className="sim-scenario">
        <p>
          当前输入：<strong>{code.toString(2).padStart(4, '0')}</strong> = {code}；输出 ≈{' '}
          <strong>{vout.toFixed(3)} V</strong>
        </p>
        <div className="sim-row">
          {BITS.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-pressed={bits[b.id] === 1}
              onClick={() => toggle(b.id)}
            >
              {b.label} = {bits[b.id]}
            </button>
          ))}
        </div>
        <p className="sim-scenario-hint">
          每个开关对应一个权重：8、4、2、1。输出 = 输入码 / 16 × Vref。
        </p>
      </div>

      <label>
        ① 输入 1000（code=8）时，输出是
        <input
          type="number"
          step="0.01"
          value={answers.code8 ?? ''}
          onChange={(e) => setAnswers((prev) => ({ ...prev, code8: e.target.value }))}
          aria-label="code8 输出"
        />
        V
      </label>
      <label>
        ② 输入 1111（code=15）时，输出是
        <input
          type="number"
          step="0.01"
          value={answers.code15 ?? ''}
          onChange={(e) => setAnswers((prev) => ({ ...prev, code15: e.target.value }))}
          aria-label="code15 输出"
        />
        V
      </label>
      <div className="sim-scenario">
        <p>③ 4 位 DAC 的最小步进（1 LSB）是？</p>
        <div className="sim-row">
          {['Vref/16', 'Vref/8', 'Vref/4'].map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={answers.step === v}
              onClick={() => setAnswers((prev) => ({ ...prev, step: v }))}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={verify}>
        校验 DAC
      </button>
      <output className="sim-reading" role="status">
        {message}
      </output>
    </SimFrame>
  );
}
