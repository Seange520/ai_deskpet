import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'logic-gates',
  title: '逻辑门 · 把判断写成电路',
  instructions:
    '先拨 A/B 看四种组合的输出，再回答两个门的读数，最后认出真值表对应的门。',
  elements: ['a', 'b'],
  checks: [
    { id: 'and-zero', type: 'choice', task: 'and-zero', expected: '0' },
    { id: 'nand-one', type: 'choice', task: 'nand-one', expected: '0' },
    { id: 'gate-name', type: 'choice', task: 'gate-name', expected: 'and' },
  ],
  evidenceTypes: ['choice'],
};

const GATES = [
  { id: 'and', name: 'AND', rule: '两个都 1 才 1' },
  { id: 'or', name: 'OR', rule: '有一个 1 就 1' },
  { id: 'not', name: 'NOT', rule: 'A 取反' },
  { id: 'nand', name: 'NAND', rule: 'AND 取反' },
];

function gateValue(id, a, b) {
  if (id === 'and') return a && b ? 1 : 0;
  if (id === 'or') return a || b ? 1 : 0;
  if (id === 'not') return a ? 0 : 1;
  return a && b ? 0 : 1;
}

export default function LogicGatesSim({ onComplete } = {}) {
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState('先拨 A/B，观察四个门的输出。');
  const { evidence, record } = useEvidence(data, onComplete);

  function pick(task, value) {
    setAnswers((prev) => ({ ...prev, [task]: value }));
  }

  function verify() {
    const result = record({
      'and-zero': answers['and-zero'] || null,
      'nand-one': answers['nand-one'] || null,
      'gate-name': answers['gate-name'] || null,
    });
    if (result.passed) {
      setMessage('门判断正确：AND 只有全 1 才 1，NAND 是它的反相。');
      return;
    }
    const first = result.checks.find((c) => !c.passed);
    setMessage(
      first?.id === 'and-zero'
        ? 'AND 再想一遍：A=1、B=0 时两个都 1 吗？'
        : first?.id === 'nand-one'
          ? 'NAND 是 AND 的反：AND 为 1 时 NAND 是 0。'
          : '只有 A、B 同时为 1 才 1 的门是 AND。',
    );
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      <div className="sim-scenario">
        <p>输入 A = {a}，输入 B = {b}（点击切换）</p>
        <div className="sim-row">
          <strong>A</strong>
          <button type="button" aria-pressed={a === 0} onClick={() => setA(0)}>
            0
          </button>
          <button type="button" aria-pressed={a === 1} onClick={() => setA(1)}>
            1
          </button>
        </div>
        <div className="sim-row">
          <strong>B</strong>
          <button type="button" aria-pressed={b === 0} onClick={() => setB(0)}>
            0
          </button>
          <button type="button" aria-pressed={b === 1} onClick={() => setB(1)}>
            1
          </button>
        </div>
        {GATES.map((g) => (
          <p key={g.id}>
            {g.name}（{g.rule}）→ <output>{gateValue(g.id, a, b)}</output>
          </p>
        ))}
      </div>

      <div className="sim-scenario">
        <p>① A=1、B=0 时，AND 输出是？</p>
        <div className="sim-row">
          {['0', '1'].map((v) => (
            <button
              key={`and-${v}`}
              type="button"
              aria-pressed={answers['and-zero'] === v}
              onClick={() => pick('and-zero', v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="sim-scenario">
        <p>② A=1、B=1 时，NAND 输出是？</p>
        <div className="sim-row">
          {['0', '1'].map((v) => (
            <button
              key={`nand-${v}`}
              type="button"
              aria-pressed={answers['nand-one'] === v}
              onClick={() => pick('nand-one', v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="sim-scenario">
        <p>③ 真值表只有 A=1 且 B=1 时输出 1，是哪个门？</p>
        <div className="sim-row">
          {GATES.map((g) => (
            <button
              key={`gate-${g.id}`}
              type="button"
              aria-pressed={answers['gate-name'] === g.id}
              onClick={() => pick('gate-name', g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={verify}>
        校验逻辑门
      </button>
      <output className="sim-reading" role="status">
        {message}
      </output>
    </SimFrame>
  );
}
