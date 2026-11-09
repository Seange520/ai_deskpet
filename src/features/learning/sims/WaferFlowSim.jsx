import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

const STEPS = [
  { id: 'film', name: '薄膜沉积', note: '先铺一层要加工的材料' },
  { id: 'litho', name: '光刻', note: '用掩模把图形印到光刻胶' },
  { id: 'etch', name: '刻蚀', note: '把没有胶保护的材料去掉' },
  { id: 'implant', name: '离子注入', note: '改变半导体的导电类型与浓度' },
  { id: 'anneal', name: '退火', note: '修复晶格损伤、激活杂质' },
  { id: 'cmp', name: 'CMP 抛光', note: '把表面磨平，为下一层让路' },
];

const data = {
  id: 'wafer-flow',
  title: '晶圆工序 · 一层的六道关',
  instructions: [
    '一层工艺循环大致是：沉积、光刻、刻蚀、注入、退火、抛光。',
    '按顺序点六道工序，再看两个良率问题。',
  ],
  elements: [
    '六道工序按钮',
    '当前顺序',
    '洁净室与良率两道判断',
  ],
  evidenceTypes: ['sequence', 'choice'],
  checks: [
    {
      id: 'flow',
      type: 'sequence',
      task: 'flow',
      expected: ['film', 'litho', 'etch', 'implant', 'anneal', 'cmp'],
    },
    {
      id: 'clean',
      type: 'choice',
      task: 'clean',
      expected: 'particles',
    },
    {
      id: 'yield',
      type: 'choice',
      task: 'yield',
      expected: 'lower',
    },
  ],
};

export default function WaferFlowSim({ data: sim = data, onComplete }) {
  const { evidence, record } = useEvidence(sim, onComplete);
  const [order, setOrder] = useState([]);
  const [clean, setClean] = useState(null);
  const [yieldChoice, setYieldChoice] = useState(null);
  const [log, setLog] = useState(null);

  const pick = (id) => {
    if (order.includes(id)) {
      setOrder(order.filter((x) => x !== id));
      return;
    }
    setOrder([...order, id]);
    setLog(null);
  };

  const reset = () => {
    setOrder([]);
    setLog(null);
  };

  const run = () => {
    const result = record({ flow: [...order], clean, yield: yieldChoice });
    if (!result) return;
    if (result.passed) {
      setLog('工艺顺序正确：沉积、光刻、刻蚀、注入、退火、抛光。');
      return;
    }
    const failed = result.checks.filter((c) => !c.passed).map((c) => c.id);
    if (failed.includes('flow')) {
      setLog('工序顺序不对：先有膜、再印图形、再刻蚀，注入与退火在后面。');
    } else if (failed.includes('clean')) {
      setLog('洁净室判断不对：晶圆最怕颗粒沾污。');
    } else {
      setLog('良率判断不对：缺陷密度越高，死掉的芯片越多。');
    }
  };

  return (
    <SimFrame data={sim} evidence={evidence}>
      <div className="sim-scenario">
        <p>按顺序点击六道工序（点错可再点一次取消）：</p>
        <div className="sim-row sim-row--wrap">
          {STEPS.map((step) => {
            const index = order.indexOf(step.id);
            return (
              <button
                type="button"
                key={step.id}
                aria-pressed={index >= 0}
                data-wafer-step={step.id}
                onClick={() => pick(step.id)}
              >
                {step.name}
                {index >= 0 ? ` · ${index + 1}` : ''}
              </button>
            );
          })}
        </div>
        <p className="sim-page-label" data-wafer-order>
          当前顺序：{order.length ? order.map((id) => STEPS.find((s) => s.id === id).name).join(' → ') : '（未选择）'}
        </p>
        <div className="sim-row">
          <button type="button" onClick={reset}>
            重置顺序
          </button>
        </div>
      </div>

      <div className="sim-scenario">
        <p>① 洁净室最怕晶圆沾上什么？</p>
        <div className="sim-row">
          <button type="button" aria-pressed={clean === 'particles'} onClick={() => setClean('particles')}>
            颗粒污染
          </button>
          <button type="button" aria-pressed={clean === 'temperature'} onClick={() => setClean('temperature')}>
            温度太低
          </button>
          <button type="button" aria-pressed={clean === 'bright'} onClick={() => setClean('bright')}>
            光线太亮
          </button>
        </div>
      </div>

      <div className="sim-scenario">
        <p>② 缺陷密度越高，晶圆良率会？</p>
        <div className="sim-row">
          <button type="button" aria-pressed={yieldChoice === 'lower'} onClick={() => setYieldChoice('lower')}>
            越低
          </button>
          <button type="button" aria-pressed={yieldChoice === 'higher'} onClick={() => setYieldChoice('higher')}>
            越高
          </button>
          <button type="button" aria-pressed={yieldChoice === 'same'} onClick={() => setYieldChoice('same')}>
            不变
          </button>
        </div>
      </div>

      <button type="button" className="sim-run" data-wafer-run onClick={run}>
        校验工序
      </button>
      {log ? (
        <output role="status" className="sim-reading">
          {log}
        </output>
      ) : null}
    </SimFrame>
  );
}
