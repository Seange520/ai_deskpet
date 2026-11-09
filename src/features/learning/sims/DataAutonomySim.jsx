import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'data-autonomy',
  title: '数据自主 · 能带走，也能删掉',
  instructions:
    '三个数据请求，各选正确处理方式：可导出、可删除、默认不上传。用户的数据归用户。',
  elements: ['export', 'delete', 'training'],
  checks: [
    { id: 'export', type: 'choice', task: 'd1', expected: 'export' },
    { id: 'delete', type: 'choice', task: 'd2', expected: 'delete' },
    { id: 'training', type: 'choice', task: 'd3', expected: 'optin' },
  ],
  evidenceTypes: ['choice'],
};

const REQUESTS = [
  { id: 'd1', text: '把我这几年的学习记录都导给我。', hint: '能带走，才是你的数据。' },
  { id: 'd2', text: '把我在这台桌宠上的数据全删掉。', hint: '删除要确认，也要能真删。' },
  { id: 'd3', text: '拿我的对话数据去训练模型吧。', hint: '默认不传，逐项同意才行。' },
];

const ACTIONS = [
  { id: 'export', name: '导出我的数据' },
  { id: 'delete', name: '删除并确认' },
  { id: 'optin', name: '训练需明示同意' },
  { id: 'agree', name: '直接答应' },
];

export default function DataAutonomySim({ onComplete } = {}) {
  const [picked, setPicked] = useState({});
  const [log, setLog] = useState('先读第一个请求，选正确处理方式。');
  const { evidence, record } = useEvidence(data, onComplete);

  function pick(requestId, action) {
    setPicked((prev) => ({ ...prev, [requestId]: action }));
    setLog(
      action === 'agree'
        ? '直接答应最省事，但用户的数据不该被默认处置。'
        : requestId === 'd2' && action !== 'delete'
          ? '删除请求不能拖：先确认范围，再真删。'
          : requestId === 'd3' && action !== 'optin'
            ? '训练用途必须默认拒绝，逐项征得明示同意。'
            : '已记录：数据能带走、能删掉、默认不训练。'
    );
  }

  function check() {
    const result = record({
      d1: picked.d1 || null,
      d2: picked.d2 || null,
      d3: picked.d3 || null,
    });
    setLog(
      result.passed
        ? '数据自主正确：导出、删除、训练默认拒绝，用户说了算。'
        : '还有请求处理错了：能带走、能删掉、不默认训练。'
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
        校验数据自主
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
