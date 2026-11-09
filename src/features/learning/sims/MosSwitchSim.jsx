import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'mos-switch',
  title: 'MOS 管 · 电压控制的开关',
  instructions:
    '栅极电压决定通断：先量阈值，再判断两种栅压下开关状态。',
  elements: ['threshold', 'off', 'on'],
  checks: [
    { id: 'threshold', type: 'numeric', task: 'vth', expected: 2, tolerance: 0.2 },
    { id: 'off', type: 'choice', task: 'zero', expected: 'cutoff' },
    { id: 'on', type: 'choice', task: 'high', expected: 'on' },
  ],
  evidenceTypes: ['numeric', 'choice'],
};

export default function MosSwitchSim({ onComplete } = {}) {
  const [vgs, setVgs] = useState(0);
  const [vth, setVth] = useState('2');
  const [zero, setZero] = useState(null);
  const [high, setHigh] = useState(null);
  const [log, setLog] = useState('先填阈值，再判断两种栅压下的状态。');
  const { evidence, record } = useEvidence(data, onComplete);

  const threshold = Number(vth);
  const state =
    !Number.isFinite(threshold) || vgs < threshold ? '截止（开关断开）' : '导通（开关闭合）';

  function check() {
    const t = Number(vth);
    const result = record({
      vth: Number.isFinite(t) ? t : null,
      zero,
      high,
    });
    if (result.passed) {
      setLog('MOS 判断正确：栅压低于阈值截止，高于阈值导通；栅极几乎不吃电流。');
    } else if (!Number.isFinite(t) || Math.abs(t - 2) > 0.2) {
      setLog('阈值电压不对：这颗 N-MOS 的开启电压约 2V。');
    } else if (zero !== 'cutoff') {
      setLog('Vgs=0 时没有导电沟道，MOS 应截止。');
    } else {
      setLog('Vgs=5V 已超过阈值，MOS 应导通。');
    }
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      <div className="sim-row" style={{ alignItems: 'center' }}>
        <span className="sim-utterance">「N-MOS：栅极电压越高，沟道越通。」</span>
      </div>
      <div className="sim-row">
        <label>
          栅源电压 Vgs
          <input
            type="number"
            value={vgs}
            onChange={(e) => setVgs(Number(e.target.value))}
            aria-label="栅源电压"
          />
        </label>
        <span className="sim-reading" role="note">
          当前：Vgs = {vgs} V → {state}
        </span>
      </div>
      <div className="sim-row">
        <label>
          阈值电压 Vth（先量再填）
          <input
            type="number"
            value={vth}
            onChange={(e) => setVth(e.target.value)}
            aria-label="阈值电压"
          />
        </label>
      </div>
      <div className="sim-row">
        <span className="sim-utterance">Vgs = 0V 时，MOS 处于？</span>
        {[
          { id: 'cutoff', name: '截止（开关断开）' },
          { id: 'on', name: '导通（开关闭合）' },
          { id: 'linear', name: '一直处于放大区' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={zero === item.id}
            onClick={() => setZero(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="sim-row">
        <span className="sim-utterance">Vgs = 5V（Vth=2V）时，MOS 处于？</span>
        {[
          { id: 'cutoff', name: '截止（开关断开）' },
          { id: 'on', name: '导通（开关闭合）' },
          { id: 'open', name: '栅极会漏电流' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={high === item.id}
            onClick={() => setHigh(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <button type="button" onClick={check}>
        校验 MOS 开关
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
