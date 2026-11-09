import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'offline-fallback',
  title: '离线兜底 · 断网也能用',
  instructions:
    '三个断网场景，各选正确处理方式：读本地缓存、降级到本地规则、把变更排进重试队列。',
  elements: ['lesson', 'chat', 'sync'],
  checks: [
    { id: 'lesson', type: 'choice', task: 'o1', expected: 'local-cache' },
    { id: 'chat', type: 'choice', task: 'o2', expected: 'local-fallback' },
    { id: 'sync', type: 'choice', task: 'o3', expected: 'retry-queue' },
  ],
  evidenceTypes: ['choice'],
};

const MOMENTS = [
  { id: 'o1', text: '地铁里没信号，打开课节。', hint: '课节应提前缓存到本地。' },
  { id: 'o2', text: '断网时还想让桌宠讲两句。', hint: '降级到本地规则，并说明。' },
  { id: 'o3', text: '刚完成测量，网突然断了。', hint: '变更先入队，联网再补发。' },
];

const HANDLING = [
  { id: 'local-cache', name: '读本地缓存' },
  { id: 'local-fallback', name: '降级本地规则' },
  { id: 'retry-queue', name: '排入重试队列' },
  { id: 'error-only', name: '只显示错误' },
];

export default function OfflineFallbackSim({ onComplete } = {}) {
  const [picked, setPicked] = useState({});
  const [log, setLog] = useState('先读第一个场景，选正确的兜底方式。');
  const { evidence, record } = useEvidence(data, onComplete);

  function pick(momentId, action) {
    setPicked((prev) => ({ ...prev, [momentId]: action }));
    setLog(
      action === 'error-only'
        ? '只显示错误，等于把断网变成白屏：要有缓存、降级或补发。'
        : '已记录：断网不等于不可用。'
    );
  }

  function check() {
    const result = record({
      o1: picked.o1 || null,
      o2: picked.o2 || null,
      o3: picked.o3 || null,
    });
    setLog(
      result.passed
        ? '离线策略正确：课节读缓存、对话降级、进度入队补发。'
        : '还有场景处理错了：断网时也要给出能用的路径。',
    );
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      {MOMENTS.map((moment) => (
        <div key={moment.id} className="sim-row" style={{ alignItems: 'center' }}>
          <span className="sim-utterance">「{moment.text}」</span>
          {HANDLING.map((action) => (
            <button
              key={action.id}
              type="button"
              aria-pressed={picked[moment.id] === action.id}
              onClick={() => pick(moment.id, action.id)}
            >
              {action.name}
            </button>
          ))}
        </div>
      ))}
      <button type="button" onClick={check}>
        校验离线策略
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
