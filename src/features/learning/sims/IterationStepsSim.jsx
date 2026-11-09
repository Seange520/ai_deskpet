import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'iteration-steps',
  title: '迭代交付 · 小步改，能回滚',
  instructions:
    '三个交付习惯，各选正确做法：一次只改一处、先回归再交付、留变更记录与证据。',
  elements: ['small-step', 'regression', 'change-log'],
  checks: [
    { id: 'small-step', type: 'choice', task: 'i1', expected: 'one-at-a-time' },
    { id: 'regression', type: 'choice', task: 'i2', expected: 'regression-first' },
    { id: 'change-log', type: 'choice', task: 'i3', expected: 'change-log' },
  ],
  evidenceTypes: ['choice'],
};

const SITUATIONS = [
  {
    id: 'i1',
    text: '桌宠有五个小毛病，想一次全改完。',
    options: [
      { id: 'one-at-a-time', name: '一次只改一处，能回滚' },
      { id: 'big-bang', name: '一口气全改，省时间' },
      { id: 'rewrite', name: '推倒重写一遍' },
    ],
  },
  {
    id: 'i2',
    text: '改动写完，想直接交付。',
    options: [
      { id: 'regression-first', name: '先跑回归，再交付' },
      { id: 'ship-now', name: '先发出去，坏了再修' },
      { id: 'ask-user', name: '让用户帮忙测' },
    ],
  },
  {
    id: 'i3',
    text: '别人问这次到底改了什么。',
    options: [
      { id: 'change-log', name: '留变更记录与证据' },
      { id: 'verbal', name: '口头说改好了' },
      { id: 'memory', name: '凭记忆解释一遍' },
    ],
  },
];

export default function IterationStepsSim({ onComplete } = {}) {
  const [picked, setPicked] = useState({});
  const [log, setLog] = useState('先读第一个情境，选最稳的交付做法。');
  const { evidence, record } = useEvidence(data, onComplete);

  function pick(situationId, optionId) {
    setPicked((prev) => ({ ...prev, [situationId]: optionId }));
    setLog(
      optionId === 'one-at-a-time' || optionId === 'regression-first' || optionId === 'change-log'
        ? '已记录：小步、可回滚、留证据。'
        : '省事的做法，往往让问题更难查：小步改，先回归，留记录。'
    );
  }

  function check() {
    const result = record({
      i1: picked.i1 || null,
      i2: picked.i2 || null,
      i3: picked.i3 || null,
    });
    setLog(
      result.passed
        ? '迭代习惯正确：小步改、先回归、留变更记录。'
        : '还有一步不够稳：一次只改一处、先回归再交付、留变更记录。'
    );
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      {SITUATIONS.map((situation) => (
        <div key={situation.id} className="sim-row" style={{ alignItems: 'center' }}>
          <span className="sim-utterance">「{situation.text}」</span>
          {situation.options.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={picked[situation.id] === option.id}
              onClick={() => pick(situation.id, option.id)}
            >
              {option.name}
            </button>
          ))}
        </div>
      ))}
      <button type="button" onClick={check}>
        校验迭代习惯
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
