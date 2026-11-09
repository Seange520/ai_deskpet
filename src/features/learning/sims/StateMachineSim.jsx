import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'state-machine',
  title: '状态机 · 让桌宠自己醒来',
  instructions:
    '把桌宠从待机带到唤醒、工作、休眠：每一步都只能走合法转移。再回答两处转移条件，最后校验状态机。',
  elements: ['idle', 'wake', 'work', 'sleep'],
  checks: [
    {
      id: 'sequence',
      type: 'sequence',
      task: 'path',
      expected: ['idle', 'wake', 'work', 'sleep'],
    },
    { id: 'timeout', type: 'choice', task: 'timeout', expected: 'sleep' },
    { id: 'recover', type: 'choice', task: 'recover', expected: 'wake' },
  ],
  evidenceTypes: ['sequence', 'choice'],
};

const STATES = [
  { id: 'idle', name: '待机', hint: '上电后的第一站，等一个唤醒事件。' },
  { id: 'wake', name: '唤醒', hint: '屏幕亮起，系统自检，等开工事件。' },
  { id: 'work', name: '工作', hint: '执行任务；超时或收到休眠事件就收工。' },
  { id: 'sleep', name: '休眠', hint: '低功耗等待，被唤醒后回到唤醒态。' },
];

const EVENT_NAMES = {
  power: '上电',
  wake: '唤醒',
  work: '开始工作',
  sleep: '休眠',
  timeout: '工作超时',
};

function nextState(current, event) {
  if (!current) return event === 'power' ? 'idle' : null;
  if (current === 'idle' && event === 'wake') return 'wake';
  if (current === 'wake' && event === 'work') return 'work';
  if (current === 'work' && (event === 'sleep' || event === 'timeout')) return 'sleep';
  if (current === 'sleep' && event === 'wake') return 'wake';
  return null;
}

export default function StateMachineSim({ onComplete } = {}) {
  const [state, setState] = useState(null);
  const [path, setPath] = useState([]);
  const [timeoutTo, setTimeoutTo] = useState('');
  const [recoverTo, setRecoverTo] = useState('');
  const [log, setLog] = useState('先按「上电」，让桌宠进入待机。');
  const { evidence, record } = useEvidence(data, onComplete);

  function press(event) {
    const next = nextState(state, event);
    if (!next) {
      setLog(
        state === 'idle' && event === 'work'
          ? '非法跳转：从待机不能直接开始工作，先唤醒。'
          : `非法跳转：${state ? STATES.find((s) => s.id === state).name : '未上电'}收不到「${EVENT_NAMES[event] ?? event}」。`,
      );
      return;
    }
    setState(next);
    setPath((prev) => [...prev, next]);
    setLog(`现在进入「${STATES.find((s) => s.id === next).name}」。`);
  }

  function check() {
    const result = record({
      path,
      timeout: timeoutTo || null,
      recover: recoverTo || null,
    });
    setLog(
      result.passed
        ? '状态机跑通：待机 → 唤醒 → 工作 → 休眠，超时与唤醒的出口也都对得上。'
        : '状态机还没对上：检查路径是否完整，以及两个转移条件。',
    );
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      <p>当前状态：{state ? STATES.find((s) => s.id === state).name : '未上电'}</p>
      <div className="sim-row">
        {STATES.map((s) => (
          <span
            key={s.id}
            className="sim-state"
            data-state={s.id}
            data-active={state === s.id}
            title={s.hint}
          >
            {s.name}
          </span>
        ))}
      </div>
      <div className="sim-row">
        {['power', 'wake', 'work', 'sleep', 'timeout'].map((event) => (
          <button key={event} type="button" onClick={() => press(event)}>
            {EVENT_NAMES[event]}
          </button>
        ))}
      </div>
      <p className="sim-path">路径：{path.length ? path.map((p) => STATES.find((s) => s.id === p).name).join(' → ') : '（空）'}</p>

      <label>
        工作超时后进入
        <select value={timeoutTo} onChange={(e) => setTimeoutTo(e.target.value)} aria-label="工作超时后进入">
          <option value="">选择状态</option>
          <option value="sleep">休眠</option>
          <option value="idle">待机</option>
          <option value="work">保持工作</option>
        </select>
      </label>
      <label>
        休眠中被唤醒后进入
        <select value={recoverTo} onChange={(e) => setRecoverTo(e.target.value)} aria-label="休眠被唤醒后进入">
          <option value="">选择状态</option>
          <option value="wake">唤醒</option>
          <option value="work">直接工作</option>
          <option value="idle">待机</option>
        </select>
      </label>

      <button type="button" onClick={check}>
        校验状态机
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
