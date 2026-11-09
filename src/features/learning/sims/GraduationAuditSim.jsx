import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'graduation-audit',
  title: '毕业验收 · 证据说话',
  instructions:
    '三件事各选正确做法：交付前按清单复核、给他人可复现的物料、带走可复用的证据与方法。',
  elements: ['audit-checklist', 'repro-pack', 'evidence-method'],
  checks: [
    { id: 'audit-checklist', type: 'choice', task: 'g1', expected: 'checklist-evidence' },
    { id: 'repro-pack', type: 'choice', task: 'g2', expected: 'repro-package' },
    { id: 'evidence-method', type: 'choice', task: 'g3', expected: 'evidence-method' },
  ],
  evidenceTypes: ['choice'],
};

const SCENES = [
  {
    id: 'g1',
    text: '桌宠装好、课也跑完，准备交付。最后一步？',
    options: [
      { id: 'checklist-evidence', name: '按验收清单逐项复核并留证据' },
      { id: 'publish-now', name: '感觉没问题，直接发布' },
      { id: 'write-summary', name: '写一段总结就够了' },
    ],
  },
  {
    id: 'g2',
    text: '别人想照你的样子也做一台。先给什么？',
    options: [
      { id: 'repro-package', name: '物料清单、接线图与版本号' },
      { id: 'verbal', name: '口述一遍步骤' },
      { id: 'diy', name: '让他自己摸索' },
    ],
  },
  {
    id: 'g3',
    text: '18 节课结束，最该带走的是什么？',
    options: [
      { id: 'evidence-method', name: '可复现的证据与排障方法' },
      { id: 'screenshots', name: '一整套截图' },
      { id: 'badge', name: '满级徽章' },
    ],
  },
];

export default function GraduationAuditSim({ onComplete } = {}) {
  const [picked, setPicked] = useState({});
  const [log, setLog] = useState('逐条看三个验收问题，选出能复核的做法。');
  const { evidence, record } = useEvidence(data, onComplete);

  function pick(sceneId, optionId) {
    setPicked((prev) => ({ ...prev, [sceneId]: optionId }));
    setLog(
      optionId === 'checklist-evidence' || optionId === 'repro-package' || optionId === 'evidence-method'
        ? '已记录：可复核、可复现、可复用。'
        : '交付不是感觉：要清单、要物料、要证据与方法。'
    );
  }

  function check() {
    const result = record({
      g1: picked.g1 || null,
      g2: picked.g2 || null,
      g3: picked.g3 || null,
    });
    setLog(
      result.passed
        ? '毕业验收通过：清单复核、可复现物料、证据与方法。'
        : '还差一项：清单、物料、证据，三种都要能拿得出来。'
    );
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      {SCENES.map((scene) => (
        <div key={scene.id} className="sim-row" style={{ alignItems: 'center' }}>
          <span className="sim-utterance">「{scene.text}」</span>
          {scene.options.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={picked[scene.id] === option.id}
              onClick={() => pick(scene.id, option.id)}
            >
              {option.name}
            </button>
          ))}
        </div>
      ))}
      <button type="button" onClick={check}>
        校验毕业清单
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
