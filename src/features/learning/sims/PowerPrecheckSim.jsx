import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'power-precheck',
  title: '上电预检 · 联锁清单',
  instructions:
    '按顺序完成五项上电前检查，再用通断档确认电源两极没有短路；全部通过，联锁才允许上电。',
  elements: ['poweroff', 'polarity', 'ground', 'insulation', 'fuse'],
  checks: [
    {
      id: 'sequence',
      type: 'sequence',
      task: 'sequence',
      expected: ['poweroff', 'polarity', 'ground', 'insulation', 'fuse'],
    },
    { id: 'probe', type: 'choice', task: 'probe', expected: 'ol' },
    { id: 'interlock', type: 'choice', task: 'interlock', expected: 'armed' },
  ],
  evidenceTypes: ['sequence', 'choice'],
};

const STEPS = [
  { id: 'poweroff', name: '断电挂牌' },
  { id: 'polarity', name: '核对极性' },
  { id: 'ground', name: '确认共地' },
  { id: 'insulation', name: '绝缘检查' },
  { id: 'fuse', name: '保险匹配' },
];

export default function PowerPrecheckSim({ onComplete } = {}) {
  const [steps, setSteps] = useState([]);
  const [probe, setProbe] = useState('');
  const [log, setLog] = useState('先做第一步：断电挂牌。');
  const { evidence, record } = useEvidence(data, onComplete);
  function press(id) {
    const name = STEPS.find((s) => s.id === id)?.name;
    if (steps.includes(id)) {
      setLog(`${name} 已经确认过了，不需要重复。`);
      return;
    }
    const expected = STEPS[steps.length]?.id;
    if (id !== expected) {
      setLog(`顺序不对：${name} 之前还有一项没做。联锁不会放行跳过检查的上电。`);
      return;
    }
    const next = [...steps, id];
    setSteps(next);
    setLog(
      next.length === STEPS.length
        ? '五项检查完成。接着用通断档测电源两极。'
        : `已确认：${name}。下一项：${STEPS[next.length].name}。`,
    );
  }
  function check() {
    const armed = steps.length === STEPS.length && probe === 'ol';
    const result = record({
      sequence: steps,
      probe: probe || null,
      interlock: armed ? 'armed' : 'trip',
    });
    setLog(
      result.passed
        ? '联锁放行：绿灯，可以上电。先观察第一秒的电流与温度。'
        : steps.length < STEPS.length
          ? `预检未完成（${steps.length}/5），联锁保持断开。`
          : probe !== 'ol'
            ? '电源两极读数不对：OL 才表示没有短路，先排除短路再上电。'
            : '联锁保持断开，请按顺序补齐检查。',
    );
  }
  return (
    <SimFrame data={data} evidence={evidence}>
      <p>上电前检查（按顺序）</p>
      <div className="sim-row">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-label={`确认 ${s.name}`}
            aria-pressed={steps.includes(s.id)}
            onClick={() => press(s.id)}
          >
            {steps.indexOf(s.id) >= 0 ? `${steps.indexOf(s.id) + 1}. ` : ''}
            {s.name}
          </button>
        ))}
      </div>
      <label>
        通断档 · 表笔跨电源两极
        <select value={probe} onChange={(e) => setProbe(e.target.value)} aria-label="通断档读数">
          <option value="">选择读数</option>
          <option value="ol">OL · 无短路</option>
          <option value="short">0.0 Ω · 短路</option>
        </select>
      </label>
      <button type="button" onClick={check}>
        验证联锁
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
