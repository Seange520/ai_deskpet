import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

const STEPS = [
  { id: 'rtl', name: 'RTL 设计', note: '用硬件描述语言写清功能' },
  { id: 'sim', name: '功能仿真', note: '先在软件里验证逻辑对不对' },
  { id: 'synth', name: '逻辑综合', note: '把 RTL 映射成门级网表' },
  { id: 'place', name: '布局规划', note: '决定每个单元放在哪块区域' },
  { id: 'route', name: '布线', note: '把单元按网表连起来' },
  { id: 'sta', name: '时序签核', note: '检查每条路径是否赶得上时钟' },
];

const data = {
  id: 'eda-pipeline',
  title: 'EDA 流程 · 从代码到版图',
  instructions: [
    '芯片不是写完代码就能做：RTL、仿真、综合、布局、布线、时序签核，一步都不能少。',
    '按顺序点出六个阶段，再回答综合产物与时序两道判断。',
  ],
  elements: ['六步流程按钮', '当前流程', '综合产物与时序两道判断'],
  evidenceTypes: ['sequence', 'choice'],
  checks: [
    {
      id: 'steps',
      type: 'sequence',
      task: 'steps',
      expected: ['rtl', 'sim', 'synth', 'place', 'route', 'sta'],
    },
    {
      id: 'netlist',
      type: 'choice',
      task: 'netlist',
      expected: 'gate',
    },
    {
      id: 'slack',
      type: 'choice',
      task: 'slack',
      expected: 'fail',
    },
  ],
};

export default function EdaPipelineSim({ data: sim = data, onComplete }) {
  const { evidence, record } = useEvidence(sim, onComplete);
  const [order, setOrder] = useState([]);
  const [netlist, setNetlist] = useState(null);
  const [slack, setSlack] = useState(null);
  const [log, setLog] = useState(null);

  const pick = (id) => {
    if (order.includes(id)) {
      setOrder(order.filter((x) => x !== id));
    } else {
      setOrder([...order, id]);
    }
    setLog(null);
  };

  const reset = () => {
    setOrder([]);
    setLog(null);
  };

  const run = () => {
    const result = record({ steps: [...order], netlist, slack });
    if (!result) return;
    if (result.passed) {
      setLog('EDA 流程正确：RTL → 仿真 → 综合 → 布局 → 布线 → 时序签核。');
      return;
    }
    const failed = result.checks.filter((c) => !c.passed).map((c) => c.id);
    if (failed.includes('steps')) {
      setLog('流程顺序不对：先写 RTL、先仿真，综合之后才是布局、布线和时序签核。');
    } else if (failed.includes('netlist')) {
      setLog('综合产物判断不对：逻辑综合出来的是门级网表，不是版图。');
    } else {
      setLog('时序判断不对：slack 为负说明路径太慢，时序不满足。');
    }
  };

  return (
    <SimFrame data={sim} evidence={evidence}>
      <div className="sim-scenario">
        <p>按顺序点击六个阶段（点错可再点一次取消）：</p>
        <div className="sim-row sim-row--wrap">
          {STEPS.map((step) => {
            const index = order.indexOf(step.id);
            return (
              <button
                type="button"
                key={step.id}
                aria-pressed={index >= 0}
                data-eda-step={step.id}
                onClick={() => pick(step.id)}
              >
                {step.name}
                {index >= 0 ? ` · ${index + 1}` : ''}
              </button>
            );
          })}
        </div>
        <p className="sim-page-label" data-eda-order>
          当前流程：
          {order.length
            ? order.map((id) => STEPS.find((s) => s.id === id).name).join(' → ')
            : '（未选择）'}
        </p>
        <div className="sim-row">
          <button type="button" onClick={reset}>
            重置流程
          </button>
        </div>
      </div>

      <div className="sim-scenario">
        <p>① 逻辑综合的产物是？</p>
        <div className="sim-row">
          <button
            type="button"
            aria-pressed={netlist === 'gate'}
            onClick={() => setNetlist('gate')}
          >
            门级网表
          </button>
          <button
            type="button"
            aria-pressed={netlist === 'layout'}
            onClick={() => setNetlist('layout')}
          >
            版图
          </button>
          <button
            type="button"
            aria-pressed={netlist === 'gds'}
            onClick={() => setNetlist('gds')}
          >
            GDS 文件
          </button>
        </div>
      </div>

      <div className="sim-scenario">
        <p>② 时钟周期 2.0ns、路径延迟 2.3ns，时序 slack 约 −0.3ns，结论是？</p>
        <div className="sim-row">
          <button type="button" aria-pressed={slack === 'fail'} onClick={() => setSlack('fail')}>
            时序不满足
          </button>
          <button type="button" aria-pressed={slack === 'pass'} onClick={() => setSlack('pass')}>
            时序满足
          </button>
          <button type="button" aria-pressed={slack === 'na'} onClick={() => setSlack('na')}>
            与时钟无关
          </button>
        </div>
      </div>

      <button type="button" className="sim-run" data-eda-run onClick={run}>
        校验流程
      </button>
      {log ? (
        <output role="status" className="sim-reading">
          {log}
        </output>
      ) : null}
    </SimFrame>
  );
}
