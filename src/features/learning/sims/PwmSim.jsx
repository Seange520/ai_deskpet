import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';
export const data = {
  id: 'pwm',
  title: 'PWM · 四通道密码',
  instructions:
    '把 A/B/C/D 调到 25/50/75/10%。理想方波在 0V 和 3.3V 之间切换，平均电压 = 3.3V × 占空比。读取 C 通道约 2.5V。',
  elements: ['A', 'B', 'C', 'D'],
  checks: [
    { id: 'password', type: 'sequence', task: 'password', expected: [25, 50, 75, 10] },
    { id: 'average', type: 'numeric', task: 'average', expected: 2.5, tolerance: 0.2 },
  ],
  evidenceTypes: ['sequence', 'numeric'],
};
export default function PwmSim({ onComplete } = {}) {
  const [duties, setDuties] = useState([0, 0, 0, 0]),
    [message, setMessage] = useState('可用方向键调整滑块，每格 5%。');
  const { evidence, record } = useEvidence(data, onComplete);
  function check() {
    const result = record({ password: duties, average: (3.3 * duties[2]) / 100 });
    setMessage(
      result.passed
        ? '密码与平均电压全部通过。75% × 3.3V = 2.475V ≈ 2.5V。'
        : duties.every((v) => v === 0)
          ? '输出仍为低电平：先用滑块设置四通道，再校验。'
          : '还有通道未匹配：逐一对照 25/50/75/10%，注意百分数要除以 100。',
    );
  }
  return (
    <SimFrame data={data} evidence={evidence}>
      {data.elements.map((v, i) => (
        <label className="sim-channel" key={v}>
          {v} 通道 · {duties[i]}% · {((3.3 * duties[i]) / 100).toFixed(3)} V
          <input
            aria-label={`${v} 占空比`}
            type="range"
            min="0"
            max="100"
            step="5"
            value={duties[i]}
            onChange={(e) =>
              setDuties(duties.map((d, n) => (n === i ? Number(e.target.value) : d)))
            }
          />
          <span className="sim-wave" aria-hidden="true" style={{ '--duty': `${duties[i]}%` }} />
        </label>
      ))}
      <button onClick={check}>校验 PWM</button>
      <output className="sim-reading" role="status">
        {message}
      </output>
    </SimFrame>
  );
}
