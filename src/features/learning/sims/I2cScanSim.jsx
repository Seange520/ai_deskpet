import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';
export const data = {
  id: 'i2c-scan',
  title: 'I2C · 地址扫描',
  instructions:
    '给三个从机上电，逐个探测地址。0x3C 若有两个设备同时应答，就是地址冲突：先隔离冒名者，再重扫确认。',
  elements: ['screen', 'clock', 'eeprom'],
  checks: [
    { id: 'conflict', type: 'numeric', task: 'conflict', expected: 0, tolerance: 0 },
    { id: 'devices', type: 'numeric', task: 'devices', expected: 2, tolerance: 0 },
    { id: 'why', type: 'choice', task: 'why', expected: '两个设备会抢着回答' },
  ],
  evidenceTypes: ['numeric', 'choice'],
};
const DEVICES = [
  { id: 'screen', addr: '0x3C', name: '显示屏', on: true },
  { id: 'clock', addr: '0x68', name: 'RTC 时钟', on: true },
  { id: 'eeprom', addr: '0x3C', name: '冒名 EEPROM', on: true },
];
export default function I2cScanSim({ onComplete } = {}) {
  const [on, setOn] = useState({ screen: true, clock: true, eeprom: true });
  const [log, setLog] = useState('总线上已有三个从机，随时可以扫描。');
  const { evidence, record } = useEvidence(data, onComplete);
  const live = DEVICES.filter((d) => on[d.id]);
  const byAddr = live.reduce((m, d) => {
    (m[d.addr] ||= []).push(d.name);
    return m;
  }, {});
  const conflicts = Object.entries(byAddr).filter(([, names]) => names.length > 1);
  function scan() {
    const lines = live.map((d) => `${d.addr} ← ${d.name}`);
    const result = record({
      conflict: conflicts.length,
      devices: live.length,
      why: '两个设备会抢着回答',
    });
    setLog(
      (conflicts.length
        ? `扫描到 ${live.length} 个应答，${conflicts.map(([a]) => a).join('、')} 上有两个设备同时应答。`
        : `扫描到 ${live.length} 个应答，地址唯一，总线正常。`) +
        ` 地址表：${lines.join('；')}` +
        (result.passed ? ' · 证据通过' : ''),
    );
  }
  return (
    <SimFrame data={data} evidence={evidence}>
      {DEVICES.map((d) => (
        <label key={d.id}>
          <input
            type="checkbox"
            aria-label={`上电 ${d.name}`}
            checked={on[d.id]}
            onChange={(e) => setOn({ ...on, [d.id]: e.target.checked })}
          />
          {d.name}（{d.addr}）
        </label>
      ))}
      <button onClick={scan}>扫描地址</button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
