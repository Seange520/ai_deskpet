import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'flip-flop',
  title: '触发器 · 把状态记住',
  instructions:
    '先按置位、再按复位，观察 Q 的变化；然后把 D 拨到 1，打一个时钟，看它锁住什么。',
  elements: ['set', 'reset', 'clock', 'd'],
  checks: [
    { id: 'set-q', type: 'choice', task: 'set-q', expected: '1' },
    { id: 'reset-q', type: 'choice', task: 'reset-q', expected: '0' },
    { id: 'clock-q', type: 'choice', task: 'clock-q', expected: '1' },
  ],
  evidenceTypes: ['choice'],
};

export default function FlipFlopSim({ onComplete } = {}) {
  const [q, setQ] = useState(0);
  const [d, setD] = useState(0);
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState('先按「置位」把 Q 置 1，再按「复位」清 0。');
  const { evidence, record } = useEvidence(data, onComplete);

  function setQ1() {
    setQ(1);
    setAnswers((prev) => ({ ...prev, 'set-q': '1' }));
    setMessage('置位后 Q=1：状态被记住了，松开按键也不会自己掉。');
  }

  function resetQ() {
    setQ(0);
    setAnswers((prev) => ({ ...prev, 'reset-q': '0' }));
    setMessage('复位后 Q=0：触发器回到初始状态。');
  }

  function clock() {
    setQ(d);
    setAnswers((prev) => ({ ...prev, 'clock-q': String(d) }));
    setMessage(`时钟上升沿把 D=${d} 锁进 Q；之后 D 再变，Q 也要等下一个沿。`);
  }

  function verify() {
    const result = record({
      'set-q': answers['set-q'] || null,
      'reset-q': answers['reset-q'] || null,
      'clock-q': answers['clock-q'] || null,
    });
    if (result.passed) {
      setMessage('触发器判断正确：置位写 1、复位清 0、时钟沿锁 D。');
      return;
    }
    const first = result.checks.find((c) => !c.passed);
    setMessage(
      first?.id === 'set-q'
        ? '先按「置位」，Q 应该变 1。'
        : first?.id === 'reset-q'
          ? '再按「复位」，Q 应该回 0。'
          : '把 D 拨到 1，再打一个时钟：Q 会锁住 1。',
    );
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      <div className="sim-scenario">
        <p>
          当前状态：<strong>Q = {q}</strong>，输入 <strong>D = {d}</strong>
        </p>
        <div className="sim-row">
          <button type="button" onClick={setQ1}>
            置位 S
          </button>
          <button type="button" onClick={resetQ}>
            复位 R
          </button>
          <button type="button" onClick={clock}>
            打一个时钟
          </button>
        </div>
        <div className="sim-row">
          <span>D</span>
          <button type="button" aria-pressed={d === 0} onClick={() => setD(0)}>
            0
          </button>
          <button type="button" aria-pressed={d === 1} onClick={() => setD(1)}>
            1
          </button>
        </div>
        <p className="sim-scenario-hint">
          Q 只有两种状态：0 或 1。它记住的是最近一次置位/复位/时钟沿的结果。
        </p>
      </div>

      <div className="sim-scenario">
        <p>① 按下「置位 S」之后，Q 是？</p>
        <div className="sim-row">
          {['0', '1'].map((v) => (
            <button
              key={`set-${v}`}
              type="button"
              aria-pressed={answers['set-q'] === v}
              onClick={() => setAnswers((prev) => ({ ...prev, 'set-q': v }))}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="sim-scenario">
        <p>② 再按下「复位 R」之后，Q 是？</p>
        <div className="sim-row">
          {['0', '1'].map((v) => (
            <button
              key={`reset-${v}`}
              type="button"
              aria-pressed={answers['reset-q'] === v}
              onClick={() => setAnswers((prev) => ({ ...prev, 'reset-q': v }))}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="sim-scenario">
        <p>③ D=1 时打一个时钟沿，Q 会变成？</p>
        <div className="sim-row">
          {['0', '1'].map((v) => (
            <button
              key={`clock-${v}`}
              type="button"
              aria-pressed={answers['clock-q'] === v}
              onClick={() => setAnswers((prev) => ({ ...prev, 'clock-q': v }))}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={verify}>
        校验触发器
      </button>
      <output className="sim-reading" role="status">
        {message}
      </output>
    </SimFrame>
  );
}
