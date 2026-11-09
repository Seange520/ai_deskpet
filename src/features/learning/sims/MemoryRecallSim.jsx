import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'memory-recall',
  title: '记忆回放 · 只记住该记的',
  instructions:
    '三条请求分别判断：该记住、不该记，还是先问再记。选完再校验记忆策略。',
  elements: ['preference', 'secret', 'convention'],
  checks: [
    { id: 'preference', type: 'choice', task: 'm1', expected: 'remember' },
    { id: 'secret', type: 'choice', task: 'm2', expected: 'refuse' },
    { id: 'convention', type: 'choice', task: 'm3', expected: 'ask' },
  ],
  evidenceTypes: ['choice'],
};

const REQUESTS = [
  { id: 'preference', text: '我不吃香菜，以后别给我推荐。', hint: '这是稳定的个人偏好。' },
  { id: 'secret', text: '我的身份证号是 4401 后面那串。', hint: '敏感信息不该落盘。' },
  { id: 'convention', text: '以后我都先断电再接线，你记着。', hint: '长期约定值得记，但要确认。' },
];

const ACTIONS = [
  { id: 'remember', name: '记住' },
  { id: 'refuse', name: '不记并说明' },
  { id: 'ask', name: '先问再记' },
];

export default function MemoryRecallSim({ onComplete } = {}) {
  const [picked, setPicked] = useState({});
  const [log, setLog] = useState('先读第一条请求，判断该不该记。');
  const { evidence, record } = useEvidence(data, onComplete);

  function pick(requestId, action) {
    setPicked((prev) => ({ ...prev, [requestId]: action }));
    setLog(
      requestId === 'secret' && action !== 'refuse'
        ? '身份证号这类信息，记录就是风险：不记，并提醒用户。'
        : `已选择：${ACTIONS.find((a) => a.id === action).name}。`,
    );
  }

  function check() {
    const result = record({
      m1: picked.preference || null,
      m2: picked.secret || null,
      m3: picked.convention || null,
    });
    setLog(
      result.passed
        ? '记忆策略正确：偏好记住，敏感不落盘，长期约定先确认。'
        : '还有条目分错了：敏感信息不该记，长期约定也不该默认写入。',
    );
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      {REQUESTS.map((request) => (
        <div key={request.id} className="sim-row" style={{ alignItems: 'center' }}>
          <span className="sim-utterance">「{request.text}」</span>
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              aria-pressed={picked[request.id] === action.id}
              onClick={() => pick(request.id, action.id)}
            >
              {action.name}
            </button>
          ))}
        </div>
      ))}
      <button type="button" onClick={check}>
        校验记忆策略
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
