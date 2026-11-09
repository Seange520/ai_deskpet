import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'self-check',
  title: '自检 · 先怀疑自己',
  instructions:
    '三个现场症状，各选第一个该查的位置。先查基本项，再换件，最后才怪设计。',
  elements: ['power', 'connector', 'cutoff'],
  checks: [
    { id: 'power', type: 'choice', task: 's1', expected: 'power' },
    { id: 'connector', type: 'choice', task: 's2', expected: 'connector' },
    { id: 'cutoff', type: 'choice', task: 's3', expected: 'cutoff' },
  ],
  evidenceTypes: ['choice'],
};

const SYMPTOMS = [
  { id: 's1', text: '上电后灯不亮，风扇也不转。', hint: '先确认有没有电。' },
  { id: 's2', text: '屏亮着，但一直没有内容。', hint: '电到了，信号可能没到。' },
  { id: 's3', text: '运行一会儿，闻到焦味。', hint: '先停，再查。' },
];

const FIRST_CHECKS = [
  { id: 'power', name: '供电与保险' },
  { id: 'connector', name: '排线与接口' },
  { id: 'cutoff', name: '立即断电' },
  { id: 'replace', name: '直接换新板' },
];

export default function SelfCheckSim({ onComplete } = {}) {
  const [picked, setPicked] = useState({});
  const [log, setLog] = useState('先读第一个症状，选第一个该查的位置。');
  const { evidence, record } = useEvidence(data, onComplete);

  function pick(symptomId, action) {
    setPicked((prev) => ({ ...prev, [symptomId]: action }));
    setLog(
      symptomId === 's3' && action !== 'cutoff'
        ? '焦味不是小问题：先断电，再查短路与保险。'
        : symptomId === 's1' && action === 'replace'
          ? '没确认供电就换板，可能换一块烧一块。'
          : '已记录：先查基本项。'
    );
  }

  function check() {
    const result = record({
      s1: picked.s1 || null,
      s2: picked.s2 || null,
      s3: picked.s3 || null,
    });
    setLog(
      result.passed
        ? '自检顺序正确：先电、再线、最后才换件；闻到焦味先断电。'
        : '顺序不对：先查基本项，别急着换件。',
    );
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      {SYMPTOMS.map((symptom) => (
        <div key={symptom.id} className="sim-row" style={{ alignItems: 'center' }}>
          <span className="sim-utterance">「{symptom.text}」</span>
          {FIRST_CHECKS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={picked[symptom.id] === item.id}
              onClick={() => pick(symptom.id, item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
      ))}
      <button type="button" onClick={check}>
        校验自检顺序
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
