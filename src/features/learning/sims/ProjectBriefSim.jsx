import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'project-brief',
  title: '项目立项 · 先写清验收，再动手',
  instructions:
    '三条模糊需求，各改写成一条能验收的指标：有数值、有范围、可复现。',
  elements: ['fast', 'power', 'recover'],
  checks: [
    { id: 'fast', type: 'choice', task: 'p1', expected: 'fast-100ms' },
    { id: 'power', type: 'choice', task: 'p2', expected: 'power-20ma' },
    { id: 'recover', type: 'choice', task: 'p3', expected: 'recover-3s' },
  ],
  evidenceTypes: ['choice'],
};

const BRIEFS = [
  {
    id: 'p1',
    text: '需求：桌宠动起来要「反应快一点」。',
    options: [
      { id: 'fast-100ms', name: '从触发到动作 ≤100ms' },
      { id: 'fast-vague', name: '尽量快' },
      { id: 'fast-feel', name: '用户觉得快就行' },
    ],
  },
  {
    id: 'p2',
    text: '需求：整机要「尽量省电」。',
    options: [
      { id: 'power-20ma', name: '待机电流 ≤20mA' },
      { id: 'power-long', name: '能用很久' },
      { id: 'power-cheap', name: '电池别太贵' },
    ],
  },
  {
    id: 'p3',
    text: '需求：断电以后「别忘了保存」。',
    options: [
      { id: 'recover-3s', name: '断电后 3 秒内恢复上次进度' },
      { id: 'recover-auto', name: '记得自动保存' },
      { id: 'recover-more', name: '多存几次' },
    ],
  },
];

const EXPECTED = { p1: 'fast-100ms', p2: 'power-20ma', p3: 'recover-3s' };

export default function ProjectBriefSim({ onComplete } = {}) {
  const [picked, setPicked] = useState({});
  const [log, setLog] = useState('先读第一条需求，选它能验收的写法。');
  const { evidence, record } = useEvidence(data, onComplete);

  function pick(briefId, optionId) {
    setPicked((prev) => ({ ...prev, [briefId]: optionId }));
    setLog(
      optionId === EXPECTED[briefId]
        ? '已记录：有数、有范围、可复核。'
        : '这条还能再具体：验收要有数值、范围与复现条件。'
    );
  }

  function check() {
    const result = record({
      p1: picked.p1 || null,
      p2: picked.p2 || null,
      p3: picked.p3 || null,
    });
    setLog(
      result.passed
        ? '验收写清了：快有毫秒、省电有毫安、恢复有三秒。'
        : '还有需求不够可验收：验收标准要能被第三方复现。'
    );
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      {BRIEFS.map((brief) => (
        <div key={brief.id} className="sim-row" style={{ alignItems: 'center' }}>
          <span className="sim-utterance">「{brief.text}」</span>
          {brief.options.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={picked[brief.id] === option.id}
              onClick={() => pick(brief.id, option.id)}
            >
              {option.name}
            </button>
          ))}
        </div>
      ))}
      <button type="button" onClick={check}>
        校验验收标准
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
