import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

const data = {
  id: 'tapeout-cost',
  title: '流片与封装 · 把账算清',
  instructions: [
    '流片不是一次性的研发费：掩膜、晶圆、封装、测试，每一项都按次计。',
    '先填成本账，再回答单颗成本与测试目的两道判断。',
  ],
  elements: ['成本账输入', '总成本与单颗成本', '测试与良率两道判断'],
  evidenceTypes: ['number', 'choice'],
  checks: [
    { id: 'total', type: 'numeric', task: 'total', expected: 4200000, tolerance: 1 },
    { id: 'perDie', type: 'numeric', task: 'perDie', expected: 4.2, tolerance: 0.01 },
    { id: 'test', type: 'choice', task: 'test', expected: 'packaging' },
  ],
};

export default function TapeoutCostSim({ data: sim = data, onComplete }) {
  const { evidence, record } = useEvidence(sim, onComplete);
  const [masks, setMasks] = useState('1200000');
  const [wafer, setWafer] = useState('3000');
  const [wafers, setWafers] = useState('1000');
  const [diePerWafer, setDiePerWafer] = useState('1000');
  const [testChoice, setTestChoice] = useState(null);
  const [log, setLog] = useState(null);

  const maskNum = Number(masks) || 0;
  const waferNum = Number(wafer) || 0;
  const wafersNum = Number(wafers) || 0;
  const dieNum = Number(diePerWafer) || 0;
  const total = maskNum + waferNum * wafersNum;
  const perDie = dieNum > 0 && wafersNum > 0 ? total / (wafersNum * dieNum) : 0;

  const run = () => {
    const result = record({ total, perDie, test: testChoice });
    if (!result) return;
    if (result.passed) {
      setLog(
        `成本账正确：总成本 ${total.toLocaleString()} 美元，单颗约 ${perDie.toFixed(2)} 美元；封装前必须先测，别把坏片封进去。`,
      );
      return;
    }
    const failed = result.checks.filter((c) => !c.passed).map((c) => c.id);
    if (failed.includes('total')) {
      setLog('总成本不对：总成本 = 掩膜成本 + 单片晶圆价 × 片数。');
    } else if (failed.includes('perDie')) {
      setLog('单颗成本不对：总成本 ÷（片数 × 每片好片数）。');
    } else {
      setLog('测试目的判断不对：封装前测试是为了拦住坏片，避免把成本封进料里。');
    }
  };

  return (
    <SimFrame data={sim} evidence={evidence}>
      <div className="sim-scenario">
        <p>一笔 28nm 教学流片账：掩膜 120 万美元，单片晶圆 3000 美元，投 1000 片，每片 1000 颗好片。</p>
        <label className="sim-field">
          <span>掩膜成本（美元）</span>
          <input value={masks} onChange={(e) => setMasks(e.target.value)} data-tapeout="masks" />
        </label>
        <label className="sim-field">
          <span>单片晶圆（美元）</span>
          <input value={wafer} onChange={(e) => setWafer(e.target.value)} data-tapeout="wafer" />
        </label>
        <label className="sim-field">
          <span>投片数（片）</span>
          <input value={wafers} onChange={(e) => setWafers(e.target.value)} data-tapeout="wafers" />
        </label>
        <label className="sim-field">
          <span>每片好片数（颗）</span>
          <input
            value={diePerWafer}
            onChange={(e) => setDiePerWafer(e.target.value)}
            data-tapeout="die"
          />
        </label>
        <p className="sim-page-label" data-tapeout-total>
          总成本 ≈ {total.toLocaleString()} 美元；单颗 ≈ {perDie.toFixed(2)} 美元
        </p>
      </div>

      <div className="sim-scenario">
        <p>① 封装前为什么必须先测试？</p>
        <div className="sim-row">
          <button
            type="button"
            aria-pressed={testChoice === 'packaging'}
            onClick={() => setTestChoice('packaging')}
          >
            拦住坏片，别封进去
          </button>
          <button
            type="button"
            aria-pressed={testChoice === 'price'}
            onClick={() => setTestChoice('price')}
          >
            为了抬价
          </button>
          <button
            type="button"
            aria-pressed={testChoice === 'none'}
            onClick={() => setTestChoice('none')}
          >
            测不测都行
          </button>
        </div>
      </div>

      <button type="button" className="sim-run" data-tapeout-run onClick={run}>
        校验成本账
      </button>
      {log ? (
        <output role="status" className="sim-reading">
          {log}
        </output>
      ) : null}
    </SimFrame>
  );
}
