import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'adc-sample',
  title: 'ADC · 把电压送回数字',
  instructions:
    '调输入电压，看 ADC 把它切成哪一级；再写下 1.65V 与 3.09V 对应的 4 位码。',
  elements: ['vin', 'vref', 'code'],
  checks: [
    { id: 'mid', type: 'numeric', task: 'mid', expected: 8, tolerance: 0 },
    { id: 'top', type: 'numeric', task: 'top', expected: 15, tolerance: 0 },
    { id: 'error', type: 'choice', task: 'error', expected: '±1/2 LSB' },
  ],
  evidenceTypes: ['numeric', 'choice'],
};

const VREF = 3.3;

export default function AdcSampleSim({ onComplete } = {}) {
  const [vin, setVin] = useState(1.65);
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState('4 位 ADC 把 0–3.3V 分成 16 级。');
  const { evidence, record } = useEvidence(data, onComplete);

  const code = Math.max(0, Math.min(15, Math.floor((vin / VREF) * 16)));

  function verify() {
    const result = record({
      mid: Number(answers.mid ?? NaN),
      top: Number(answers.top ?? NaN),
      error: answers.error || null,
    });
    if (result.passed) {
      setMessage('ADC 判断正确：码值 = floor(Vin/Vref×16)，量化误差 ±1/2 LSB。');
      return;
    }
    const first = result.checks.find((c) => !c.passed);
    setMessage(
      first?.id === 'mid'
        ? '1.65V 正好一半：0.5×16 = 8。'
        : first?.id === 'top'
          ? '3.09V ≈ 15/16×Vref：码值 15。'
          : '量化会落在两级之间，误差不超过半个 LSB。',
    );
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      <div className="sim-scenario">
        <p>
          输入电压：<strong>{vin.toFixed(2)} V</strong>，Vref = 3.3V
        </p>
        <input
          type="range"
          min="0"
          max="3.3"
          step="0.01"
          value={vin}
          onChange={(e) => setVin(Number(e.target.value))}
          aria-label="输入电压"
        />
        <p>
          4 位码输出：<strong>{code.toString(2).padStart(4, '0')}</strong>（{code}）
        </p>
        <p className="sim-scenario-hint">
          码值 = floor(Vin / Vref × 16)；同一级里的电压都读成同一个码。
        </p>
      </div>

      <label>
        ① 1.65V 对应的 4 位码值是
        <input
          type="number"
          value={answers.mid ?? ''}
          onChange={(e) => setAnswers((prev) => ({ ...prev, mid: e.target.value }))}
          aria-label="1.65V 码值"
        />
      </label>
      <label>
        ② 3.09V 对应的 4 位码值是
        <input
          type="number"
          value={answers.top ?? ''}
          onChange={(e) => setAnswers((prev) => ({ ...prev, top: e.target.value }))}
          aria-label="3.09V 码值"
        />
      </label>
      <div className="sim-scenario">
        <p>③ 量化误差最大是多少？</p>
        <div className="sim-row">
          {['±1/2 LSB', '±1 LSB', '±2 LSB'].map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={answers.error === v}
              onClick={() => setAnswers((prev) => ({ ...prev, error: v }))}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={verify}>
        校验 ADC
      </button>
      <output className="sim-reading" role="status">
        {message}
      </output>
    </SimFrame>
  );
}
