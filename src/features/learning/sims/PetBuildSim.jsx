import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'pet-build',
  title: '桌宠装配 · 造物顺序',
  instructions:
    '把零件按装配顺序放进托盘：壳体 → 主控 → 电源与保护 → 屏幕 → 执行器 → 传感器。全部就位后检查装配，并在通电前确认安全项。',
  elements: ['外壳', '主控', '电源', '屏幕', '舵机', '传感器'],
  checks: [
    { id: 'parts', type: 'numeric', task: 'parts', expected: 6, tolerance: 0 },
    {
      id: 'order',
      type: 'sequence',
      task: 'order',
      expected: ['shell', 'board', 'power', 'screen', 'servo', 'sensor'],
    },
    { id: 'safety', type: 'choice', task: 'safety', expected: 'power-ok' },
  ],
  evidenceTypes: ['numeric', 'sequence', 'choice'],
};

const PARTS = [
  { id: 'shell', name: '外壳' },
  { id: 'board', name: '主控 ESP32-S3' },
  { id: 'power', name: '电源与保护' },
  { id: 'screen', name: '显示屏' },
  { id: 'servo', name: '舵机' },
  { id: 'sensor', name: '环境传感器' },
];

export default function PetBuildSim({ onComplete } = {}) {
  const [order, setOrder] = useState([]);
  const [safe, setSafe] = useState(false);
  const [log, setLog] = useState('托盘是空的。先放壳体，再装主控。');
  const { evidence, record } = useEvidence(data, onComplete);
  function add(id) {
    if (order.includes(id)) return;
    const next = [...order, id];
    setOrder(next);
    setLog(`已放入：${next.map((p) => PARTS.find((q) => q.id === p).name).join(' → ')}`);
  }
  function check() {
    const result = record({
      parts: order.length,
      order,
      safety: safe ? 'power-ok' : 'live',
    });
    setLog(
      result.passed
        ? '装配顺序正确，断电与极性检查已完成。可以上电测试。'
        : `还差一点：当前 ${order.length}/6 个零件${safe ? '' : '，且未做通电前安全确认'}。按顺序补齐再检查。`,
    );
  }
  return (
    <SimFrame data={data} evidence={evidence}>
      <div className="sim-parts">
        {PARTS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="sim-part"
            aria-label={`放入 ${p.name}`}
            disabled={order.includes(p.id)}
            onClick={() => add(p.id)}
          >
            {order.indexOf(p.id) >= 0 ? `${order.indexOf(p.id) + 1}. ` : ''}
            {p.name}
          </button>
        ))}
      </div>
      <label className="sim-safety">
        <input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} />
        已断电装配，并检查过电源极性与共地
      </label>
      <button type="button" onClick={check}>
        检查装配
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
