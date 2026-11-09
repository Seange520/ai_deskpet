import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'layout-drc',
  title: '版图 · 把电路画成几何',
  instructions:
    '按 0.18µm 工艺的三条规则试画一层金属，观察 DRC 结果；再答最小线宽与两条规则判断题。',
  elements: ['width', 'spacing', 'enclosure'],
  checks: [
    { id: 'lineWidth', type: 'numeric', task: 'lineWidth', expected: 0.18, tolerance: 0.001 },
    { id: 'drc', type: 'choice', task: 'drc', expected: 'spacing' },
    { id: 'enclosure', type: 'choice', task: 'enclosure', expected: 'enclosure' },
  ],
  evidenceTypes: ['numeric', 'choice'],
};

const RULES = { wmin: 0.18, smin: 0.2, enc: 0.05 };

const DRCS = [
  { id: 'width', label: '最小线宽', rule: '≥ 0.18 µm' },
  { id: 'spacing', label: '最小间距', rule: '≥ 0.20 µm' },
  { id: 'enclosure', label: '接触孔包围', rule: '≥ 0.05 µm' },
];

export default function LayoutDrcSim({ onComplete } = {}) {
  const [line, setLine] = useState(0.2);
  const [gap, setGap] = useState(0.12);
  const [enc, setEnc] = useState(0.05);
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState('0.18µm 工艺：先看三条规则，再画几何。');
  const { evidence, record } = useEvidence(data, onComplete);

  const checksLive = [
    { id: 'width', ok: line >= RULES.wmin, value: `${line.toFixed(2)} µm`, rule: `≥ ${RULES.wmin} µm` },
    { id: 'spacing', ok: gap >= RULES.smin, value: `${gap.toFixed(2)} µm`, rule: `≥ ${RULES.smin} µm` },
    { id: 'enclosure', ok: enc >= RULES.enc, value: `${enc.toFixed(2)} µm`, rule: `≥ ${RULES.enc} µm` },
  ];
  const violations = checksLive.filter((c) => !c.ok);

  function verify() {
    const result = record({
      lineWidth: Number(answers.lineWidth ?? NaN),
      drc: answers.drc || null,
      enclosure: answers.enclosure || null,
    });
    if (result.passed) {
      setMessage('DRC 判断正确：线宽、间距、包围三条规则先过，再谈性能。');
      return;
    }
    const first = result.checks.find((c) => !c.passed);
    setMessage(
      first?.id === 'lineWidth'
        ? '最小线宽就是 0.18 µm：再细，工厂画不出来。'
        : first?.id === 'drc'
          ? '0.12 µm 比最小间距 0.20 µm 小，触发的是间距规则。'
          : '接触孔必须被上下金属完全包住，缺的是包围。',
    );
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      <div className="sim-scenario">
        <p>
          工艺节点 <strong>0.18 µm</strong>；规则：线宽 ≥ {RULES.wmin}、间距 ≥ {RULES.smin}、包围 ≥{' '}
          {RULES.enc} µm。
        </p>
        <label>
          金属线宽（µm）
          <input
            type="number"
            step="0.01"
            value={line}
            onChange={(e) => setLine(Number(e.target.value))}
            aria-label="金属线宽"
          />
        </label>
        <label>
          两条金属间距（µm）
          <input
            type="number"
            step="0.01"
            value={gap}
            onChange={(e) => setGap(Number(e.target.value))}
            aria-label="金属间距"
          />
        </label>
        <label>
          接触孔金属包围（µm）
          <input
            type="number"
            step="0.01"
            value={enc}
            onChange={(e) => setEnc(Number(e.target.value))}
            aria-label="接触孔包围"
          />
        </label>
        <div className="sim-scenario">
          <p>实时 DRC：{violations.length === 0 ? '全部通过' : `${violations.length} 项违例`}</p>
          {checksLive.map((c) => (
            <p key={c.id}>
              {c.id === 'width' ? '线宽' : c.id === 'spacing' ? '间距' : '包围'} {c.value}（规则 {c.rule}）→{' '}
              <output>{c.ok ? 'PASS' : '违例'}</output>
            </p>
          ))}
        </div>
        <p className="sim-scenario-hint">
          版图不直接带电，但流片前必须 DRC/LVS 干净；几何错一次，成本按流片次数算。
        </p>
      </div>

      <label>
        ① 0.18µm 工艺的最小线宽是（µm）
        <input
          type="number"
          step="0.01"
          value={answers.lineWidth ?? ''}
          onChange={(e) => setAnswers((prev) => ({ ...prev, lineWidth: e.target.value }))}
          aria-label="最小线宽"
        />
      </label>
      <div className="sim-scenario">
        <p>② 两条金属间距 0.12µm，违反了哪条规则？</p>
        <div className="sim-row">
          {DRCS.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={answers.drc === r.id}
              onClick={() => setAnswers((prev) => ({ ...prev, drc: r.id }))}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="sim-scenario">
        <p>③ 接触孔必须被金属完全覆盖，这条规则属于？</p>
        <div className="sim-row">
          {DRCS.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={answers.enclosure === r.id}
              onClick={() => setAnswers((prev) => ({ ...prev, enclosure: r.id }))}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={verify}>
        运行 DRC
      </button>
      <output className="sim-reading" role="status">
        {message}
      </output>
    </SimFrame>
  );
}
