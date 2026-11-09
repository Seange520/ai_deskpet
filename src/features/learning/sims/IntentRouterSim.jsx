import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'intent-router',
  title: '意图路由 · 先分类，再回答',
  instructions:
    '同一句话，先判断它在干什么：下命令、问问题，还是没说清。前三行各选一个意图，最后校验路由。',
  elements: ['command', 'question', 'clarify'],
  checks: [
    { id: 'cmd', type: 'choice', task: 'u1', expected: 'command' },
    { id: 'question', type: 'choice', task: 'u2', expected: 'question' },
    { id: 'clarify', type: 'choice', task: 'u3', expected: 'clarify' },
  ],
  evidenceTypes: ['choice'],
};

const UTTERANCES = [
  { id: 'u1', text: '把灯调暗一点。', hint: '它在要求做一件事。' },
  { id: 'u2', text: '这盏灯为什么总在闪？', hint: '它在要一个解释。' },
  { id: 'u3', text: '就那个，弄一下。', hint: '指代不清，直接猜会答错。' },
];

const INTENTS = [
  { id: 'command', name: '命令' },
  { id: 'question', name: '提问' },
  { id: 'clarify', name: '先反问澄清' },
];

export default function IntentRouterSim({ onComplete } = {}) {
  const [picked, setPicked] = useState({});
  const [log, setLog] = useState('先读第一句话，选它的意图。');
  const { evidence, record } = useEvidence(data, onComplete);

  function pick(utteranceId, intent) {
    setPicked((prev) => ({ ...prev, [utteranceId]: intent }));
    setLog(
      utteranceId === 'u3' && intent !== 'clarify'
        ? '「就那个」没说是哪个：直接猜会答错，先反问一句。'
        : `已标记：${INTENTS.find((i) => i.id === intent).name}。`,
    );
  }

  function check() {
    const result = record({
      u1: picked.u1 || null,
      u2: picked.u2 || null,
      u3: picked.u3 || null,
    });
    setLog(
      result.passed
        ? '路由正确：命令去执行，提问去查证，没说清先反问。'
        : '还有句子分错了：命令不是提问，模糊指代也不该直接猜。',
    );
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      {UTTERANCES.map((utterance) => (
        <div key={utterance.id} className="sim-row" style={{ alignItems: 'center' }}>
          <span className="sim-utterance">「{utterance.text}」</span>
          {INTENTS.map((intent) => (
            <button
              key={intent.id}
              type="button"
              aria-pressed={picked[utterance.id] === intent.id}
              onClick={() => pick(utterance.id, intent.id)}
            >
              {intent.name}
            </button>
          ))}
        </div>
      ))}
      <button type="button" onClick={check}>
        校验路由
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
