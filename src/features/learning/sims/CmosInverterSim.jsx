import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'cmos-inverter',
  title: 'CMOS 反相器 · 一上一下',
  instructions:
    '输入高，PMOS 关、NMOS 开；输入低，反过来。先读两种输入下的输出，再判断互补关系。',
  elements: ['out-low', 'out-high', 'pair'],
  checks: [
    { id: 'out-low', type: 'numeric', task: 'vout-low', expected: 3.3, tolerance: 0.1 },
    { id: 'out-high', type: 'numeric', task: 'vout-high', expected: 0, tolerance: 0.1 },
    { id: 'pair', type: 'choice', task: 'pair', expected: 'complementary' },
  ],
  evidenceTypes: ['numeric', 'choice'],
};

export default function CmosInverterSim({ onComplete } = {}) {
  const [vin, setVin] = useState(0);
  const [vdd, setVdd] = useState(3.3);
  const [voutLow, setVoutLow] = useState('3.3');
  const [voutHigh, setVoutHigh] = useState('0');
  const [pair, setPair] = useState(null);
  const [log, setLog] = useState('先读两种输入下的输出，再回答为什么不会短路。');
  const { evidence, record } = useEvidence(data, onComplete);

  const vout = vin < vdd / 2 ? vdd : 0;

  function check() {
    const lo = Number(voutLow);
    const hi = Number(voutHigh);
    const result = record({
      'vout-low': Number.isFinite(lo) ? lo : null,
      'vout-high': Number.isFinite(hi) ? hi : null,
      pair,
    });
    if (result.passed) {
      setLog('反相器判断正确：输入低输出高，输入高输出低；两管互补，静态几乎不耗电。');
    } else if (!Number.isFinite(lo) || Math.abs(lo - 3.3) > 0.1) {
      setLog('输入 0V 时，PMOS 导通、NMOS 截止，输出应接近 VDD=3.3V。');
    } else if (!Number.isFinite(hi) || Math.abs(hi) > 0.1) {
      setLog('输入 3.3V 时，NMOS 导通、PMOS 截止，输出应接近 0V。');
    } else {
      setLog('互补关系不对：上管与下管必须一开一关，不能同时导通。');
    }
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      <div className="sim-row" style={{ alignItems: 'center' }}>
        <span className="sim-utterance">「CMOS 反相器：上管 PMOS，下管 NMOS。」</span>
      </div>
      <div className="sim-row">
        <label>
          输入 Vin
          <input
            type="number"
            value={vin}
            onChange={(e) => setVin(Number(e.target.value))}
            aria-label="输入电压"
          />
        </label>
        <label>
          电源 VDD
          <input
            type="number"
            value={vdd}
            onChange={(e) => setVdd(Number(e.target.value))}
            aria-label="电源电压"
          />
        </label>
        <span className="sim-reading" role="note">
          当前：Vin = {vin} V → Vout ≈ {vout} V
        </span>
      </div>
      <div className="sim-row">
        <label>
          Vin=0 时，Vout 应约为 V
          <input
            type="number"
            value={voutLow}
            onChange={(e) => setVoutLow(e.target.value)}
            aria-label="低输入输出"
          />
        </label>
        <label>
          Vin=3.3 时，Vout 应约为 V
          <input
            type="number"
            value={voutHigh}
            onChange={(e) => setVoutHigh(e.target.value)}
            aria-label="高输入输出"
          />
        </label>
      </div>
      <div className="sim-row">
        <span className="sim-utterance">为什么反相器静态几乎不耗电？</span>
        {[
          { id: 'complementary', name: '两管互补，一开一关' },
          { id: 'both-on', name: '两管同时导通' },
          { id: 'no-current', name: 'CMOS 里没有电流' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={pair === item.id}
            onClick={() => setPair(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <button type="button" onClick={check}>
        校验反相器
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
