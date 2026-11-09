import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'tone-response',
  title: '情绪回声 · 先接住，再处理',
  instructions:
    '三种情绪先判断回应顺序：先接住情绪，再给事实与下一步。每行选一个回应方式，最后校验。',
  elements: ['upset', 'anxious', 'excited'],
  checks: [
    { id: 'upset', type: 'choice', task: 'e1', expected: 'ack-first' },
    { id: 'anxious', type: 'choice', task: 'e2', expected: 'ack-first' },
    { id: 'excited', type: 'choice', task: 'e3', expected: 'ack-first' },
  ],
  evidenceTypes: ['choice'],
};

const MOMENTS = [
  { id: 'e1', text: '烦死了，又坏了。', hint: '先让人把情绪落地。' },
  { id: 'e2', text: '会不会烧掉啊？', hint: '先稳住安全，再讲步骤。' },
  { id: 'e3', text: '成了！你看它亮了！', hint: '先一起高兴，再提醒复测。' },
];

const REPLIES = [
  { id: 'ack-first', name: '先接住情绪' },
  { id: 'explain', name: '直接讲原理' },
  { id: 'rush', name: '先催进度' },
];

export default function ToneResponseSim({ onComplete } = {}) {
  const [picked, setPicked] = useState({});
  const [log, setLog] = useState('先读第一句，判断该先接住什么。');
  const { evidence, record } = useEvidence(data, onComplete);

  function pick(momentId, reply) {
    setPicked((prev) => ({ ...prev, [momentId]: reply }));
    setLog(
      reply === 'ack-first'
        ? '对：先接住情绪，再谈事实与步骤。'
        : '顺序反了：情绪没落地，原理和进度都会被顶回来。',
    );
  }

  function check() {
    const result = record({
      e1: picked.e1 || null,
      e2: picked.e2 || null,
      e3: picked.e3 || null,
    });
    setLog(
      result.passed
        ? '回应顺序正确：烦躁先安顿，焦虑先保安全，兴奋先一起高兴。'
        : '还有情绪没接住：先处理感受，再处理事情。',
    );
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      {MOMENTS.map((moment) => (
        <div key={moment.id} className="sim-row" style={{ alignItems: 'center' }}>
          <span className="sim-utterance">「{moment.text}」</span>
          {REPLIES.map((reply) => (
            <button
              key={reply.id}
              type="button"
              aria-pressed={picked[moment.id] === reply.id}
              onClick={() => pick(moment.id, reply.id)}
            >
              {reply.name}
            </button>
          ))}
        </div>
      ))}
      <button type="button" onClick={check}>
        校验情绪回应
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
