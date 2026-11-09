import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'counter',
  title: '计数器 · 把时钟沿数出来',
  instructions:
    '每打一个时钟沿，计数加一；复位回到 0。数满 4 位（15）后再打一个沿，看它回到哪。',
  elements: ['clock', 'reset', 'count'],
  checks: [
    { id: 'two', type: 'numeric', task: 'two', expected: 2, tolerance: 0 },
    { id: 'zero', type: 'numeric', task: 'zero', expected: 0, tolerance: 0 },
    { id: 'wrap', type: 'choice', task: 'wrap', expected: '0' },
  ],
  evidenceTypes: ['numeric', 'choice'],
};

export default function CounterSim({ onComplete } = {}) {
  const [count, setCount] = useState(0);
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState('先打两个时钟沿，看计数变成几。');
  const { evidence, record } = useEvidence(data, onComplete);

  function tick() {
    const next = count >= 15 ? 0 : count + 1;
    setCount(next);
    setMessage(next === 0 ? '4 位数到 15 就溢出回 0，这就是计数器的一圈。' : `第 ${next} 个沿：计数 = ${next}。`);
  }

  function reset() {
    setCount(0);
    setMessage('复位后计数归零。');
  }

  function verify() {
    const result = record({
      two: Number(answers.two ?? NaN),
      zero: Number(answers.zero ?? NaN),
      wrap: answers.wrap || null,
    });
    if (result.passed) {
      setMessage('计数器判断正确：沿数加一、复位置零、4 位数到 15 回绕。');
      return;
    }
    const first = result.checks.find((c) => !c.passed);
    setMessage(
      first?.id === 'two'
        ? '再打一个沿：第二个沿时计数应该是 2。'
        : first?.id === 'zero'
          ? '复位后计数回到 0。'
          : '4 位计数器从 0 数到 15，再一个沿就回到 0。',
    );
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      <div className="sim-scenario">
        <p>
          当前计数：<strong>{count}</strong>（4 位，0–15）
        </p>
        <div className="sim-row">
          <button type="button" onClick={tick}>
            打一个时钟沿
          </button>
          <button type="button" onClick={reset}>
            复位
          </button>
        </div>
        <p className="sim-scenario-hint">每来一个上升沿加一；数到 15 后回 0，像秒表的秒位。</p>
      </div>

      <label>
        ① 打两个时钟沿后，计数是
        <input
          type="number"
          value={answers.two ?? ''}
          onChange={(e) => setAnswers((prev) => ({ ...prev, two: e.target.value }))}
          aria-label="两个沿后的计数"
        />
      </label>
      <label>
        ② 复位后，计数是
        <input
          type="number"
          value={answers.zero ?? ''}
          onChange={(e) => setAnswers((prev) => ({ ...prev, zero: e.target.value }))}
          aria-label="复位后的计数"
        />
      </label>
      <div className="sim-scenario">
        <p>③ 4 位计数器数到 15 后，再打一个沿，计数回到？</p>
        <div className="sim-row">
          {['0', '16', '15'].map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={answers.wrap === v}
              onClick={() => setAnswers((prev) => ({ ...prev, wrap: v }))}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={verify}>
        校验计数器
      </button>
      <output className="sim-reading" role="status">
        {message}
      </output>
    </SimFrame>
  );
}
