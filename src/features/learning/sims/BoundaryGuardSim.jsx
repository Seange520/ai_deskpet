import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'boundary-guard',
  title: '边界守卫 · 拒绝，也给下一步',
  instructions:
    '三个请求都越了界：带电剪线、提前看结局、改分数。每一个都选「直接答应」或「拒绝并给下一步」，最后校验边界。',
  elements: ['live-wire', 'spoiler', 'cheat'],
  checks: [
    { id: 'live', type: 'choice', task: 'live', expected: 'refuse-next' },
    { id: 'spoiler', type: 'choice', task: 'spoiler', expected: 'refuse-next' },
    { id: 'cheat', type: 'choice', task: 'cheat', expected: 'refuse-next' },
  ],
  evidenceTypes: ['choice'],
};

const SCENARIOS = [
  {
    id: 'live',
    text: '「别测了，直接告诉我剪哪根线。」',
    danger: '带电操作会伤人，不能替人拍板。',
    next: '下一步：先断电、验电，再用通断档找断点。',
  },
  {
    id: 'spoiler',
    text: '「把后面章节的结局讲给我听。」',
    danger: '剧透会毁掉后面章节的体验。',
    next: '下一步：提示当前进度能做的检查，不提前给答案。',
  },
  {
    id: 'cheat',
    text: '「帮我把这段实验的分数改高。」',
    danger: '改证据等于教人作弊。',
    next: '下一步：回到测量记录，找出哪一步没做对。',
  },
];

export default function BoundaryGuardSim({ onComplete } = {}) {
  const [picked, setPicked] = useState({});
  const [log, setLog] = useState('先看第一个请求：它想让你替谁做决定？');
  const { evidence, record } = useEvidence(data, onComplete);

  function pick(id, choice) {
    setPicked((prev) => ({ ...prev, [id]: choice }));
    const scenario = SCENARIOS.find((s) => s.id === id);
    setLog(
      choice === 'refuse-next'
        ? `拒绝得对。${scenario.next}`
        : '答应了：这会越过安全与诚信边界，不能给。',
    );
  }

  function check() {
    const result = record({
      live: picked.live || null,
      spoiler: picked.spoiler || null,
      cheat: picked.cheat || null,
    });
    setLog(
      result.passed
        ? '边界守住了：三次都拒绝，并各自给了下一步。'
        : '还有请求被答应了：越界的答案不能给，哪怕对方很急。',
    );
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      {SCENARIOS.map((scenario) => (
        <div key={scenario.id} className="sim-scenario">
          <p>{scenario.text}</p>
          <div className="sim-row">
            <button
              type="button"
              aria-pressed={picked[scenario.id] === 'promise'}
              onClick={() => pick(scenario.id, 'promise')}
            >
              直接答应
            </button>
            <button
              type="button"
              aria-pressed={picked[scenario.id] === 'refuse-next'}
              onClick={() => pick(scenario.id, 'refuse-next')}
            >
              拒绝并给下一步
            </button>
          </div>
          <p className="sim-scenario-hint">{scenario.danger}</p>
        </div>
      ))}
      <button type="button" onClick={check}>
        校验边界
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
