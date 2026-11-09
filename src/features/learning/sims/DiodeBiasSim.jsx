import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'diode-bias',
  title: 'PN 结 · 单向门与限流',
  instructions:
    '给 LED 串一个限流电阻：先判断偏置方向，再算电阻，最后确认引脚极性。',
  elements: ['resistor', 'bias', 'polarity'],
  checks: [
    { id: 'resistor', type: 'numeric', task: 'r', expected: 310, tolerance: 5 },
    { id: 'bias', type: 'choice', task: 'bias', expected: 'cutoff' },
    { id: 'polarity', type: 'choice', task: 'polarity', expected: 'anode-long' },
  ],
  evidenceTypes: ['numeric', 'choice'],
};

export default function DiodeBiasSim({ onComplete } = {}) {
  const [supply, setSupply] = useState(5);
  const [ledDrop, setLedDrop] = useState(1.9);
  const [currentMa, setCurrentMa] = useState(10);
  const [resistor, setResistor] = useState('310');
  const [bias, setBias] = useState(null);
  const [polarity, setPolarity] = useState(null);
  const [log, setLog] = useState('先判断偏置方向，再算限流电阻。');
  const { evidence, record } = useEvidence(data, onComplete);

  function check() {
    const r = Number(resistor);
    const result = record({
      r: Number.isFinite(r) ? r : null,
      bias,
      polarity,
    });
    if (result.passed) {
      setLog(
        `PN 结判断正确：反向截止，正向导通；限流电阻约 ${Math.round(310)}Ω，反向时电流几乎为零。`,
      );
    } else if (!Number.isFinite(r) || Math.abs(r - 310) > 5) {
      setLog('限流电阻不对：先算电压差，再除以目标电流。');
    } else if (bias !== 'cutoff') {
      setLog('偏置方向判断不对：反向偏置时 PN 结截止。');
    } else {
      setLog('极性判断不对：LED 长脚是阳极（接正），短脚是阴极（接负）。');
    }
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      <div className="sim-row" style={{ alignItems: 'center' }}>
        <span className="sim-utterance">「5V 电源，LED 正向压降 1.9V，想吃 10mA。」</span>
      </div>
      <div className="sim-row">
        <label>
          电源电压 V
          <input
            type="number"
            value={supply}
            onChange={(e) => setSupply(Number(e.target.value))}
            aria-label="电源电压"
          />
        </label>
        <label>
          LED 压降 V
          <input
            type="number"
            value={ledDrop}
            onChange={(e) => setLedDrop(Number(e.target.value))}
            aria-label="LED 压降"
          />
        </label>
        <label>
          目标电流 mA
          <input
            type="number"
            value={currentMa}
            onChange={(e) => setCurrentMa(Number(e.target.value))}
            aria-label="目标电流"
          />
        </label>
      </div>
      <div className="sim-row">
        <label>
          限流电阻 Ω（先算再填）
          <input
            type="number"
            value={resistor}
            onChange={(e) => setResistor(e.target.value)}
            aria-label="限流电阻"
          />
        </label>
        <span className="sim-reading" role="note">
          参考：R = ({(supply - ledDrop).toFixed(1)}V) / {(currentMa / 1000).toFixed(3)}A
        </span>
      </div>
      <div className="sim-row">
        <span className="sim-utterance">反向偏置时，PN 结处于？</span>
        {[
          { id: 'cutoff', name: '截止（几乎没有电流）' },
          { id: 'conduction', name: '导通（电流很大）' },
          { id: 'breakdown', name: '任何电压都击穿' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={bias === item.id}
            onClick={() => setBias(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="sim-row">
        <span className="sim-utterance">LED 的极性怎么认？</span>
        {[
          { id: 'anode-long', name: '长脚是阳极，接正' },
          { id: 'cathode-long', name: '长脚是阴极，接负' },
          { id: 'anyway', name: '两只脚随便接' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={polarity === item.id}
            onClick={() => setPolarity(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <button type="button" onClick={check}>
        校验 PN 结判断
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
