import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';
export const data = {
  id: 'series-voltage',
  title: '串联回路 · 追踪 5V 的去向',
  instructions:
    '按电源→220Ω→LED→回流依次接线，再选择测点。理想 LED 正向压降固定为 1.9V；忽略导线电阻。',
  elements: ['电源', '220Ω', 'LED', '回流'],
  checks: [
    { id: 'wiring', type: 'sequence', task: 'wiring', expected: ['电源', '220Ω', 'LED', '回流'] },
    { id: 'resistor', type: 'numeric', task: 'resistor', expected: 3.1, tolerance: 0.2 },
    { id: 'led', type: 'numeric', task: 'led', expected: 1.9, tolerance: 0.2 },
    { id: 'supply', type: 'numeric', task: 'supply', expected: 5, tolerance: 0.2 },
    { id: 'current', type: 'numeric', task: 'current', expected: 14.09, tolerance: 1 },
  ],
  evidenceTypes: ['sequence', 'numeric'],
};
export default function SeriesVoltageSim({ onComplete } = {}) {
  const [wiring, setWiring] = useState([]),
    [connected, setConnected] = useState(false);
  const [point, setPoint] = useState('resistor'),
    [message, setMessage] = useState('点击节点接线，接错可清空重试。');
  const { evidence, record } = useEvidence(data, onComplete);
  function connect() {
    const result = record({ wiring }, [data.checks[0]]);
    setConnected(result.passed);
    setMessage(
      result.passed
        ? '闭合回路通过。下一步测量三处电压和电流。'
        : '回路未闭合或顺序不对：清空后，从电源经限流电阻、LED 接回流。',
    );
  }
  function measure() {
    const values = { resistor: 3.1, led: 1.9, supply: 5, current: 14.09 };
    record(
      { [point]: connected ? values[point] : null },
      data.checks.filter((c) => c.id === point),
    );
    setMessage(
      connected
        ? `${values[point]} ${point === 'current' ? 'mA' : 'V'} · 通过；3.1 + 1.9 = 5V，I = 3.1V / 220Ω ≈ 14mA。`
        : '暂不能读数：先连接并校验闭合回路，再选择测点。',
    );
  }
  return (
    <SimFrame data={data} evidence={evidence}>
      <div className="sim-row">
        {data.elements.map((v) => (
          <button
            key={v}
            disabled={connected || wiring.includes(v)}
            onClick={() => setWiring([...wiring, v])}
          >
            {v}
          </button>
        ))}
      </div>
      <p className="sim-wire">
        {wiring.join(' → ') || '等待接线'} {connected ? '→ 电源 ✓' : ''}
      </p>
      <div className="sim-row">
        <button onClick={connect}>校验接线</button>
        <button
          onClick={() => {
            setWiring([]);
            setConnected(false);
            record({ wiring: [] });
            setMessage('已断开。重新接线后再测量。');
          }}
        >
          清空接线
        </button>
      </div>
      <label>
        测点
        <select aria-label="测点" value={point} onChange={(e) => setPoint(e.target.value)}>
          <option value="resistor">电阻电压</option>
          <option value="led">LED 电压</option>
          <option value="supply">电源电压</option>
          <option value="current">串联电流</option>
        </select>
      </label>
      <button onClick={measure}>测量</button>
      <output className="sim-reading" role="status">
        {message}
      </output>
    </SimFrame>
  );
}
