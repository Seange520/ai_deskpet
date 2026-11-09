import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';
export const blocks = Object.freeze({
  setup: 'void setup() {',
  pinMode: '  pinMode(LED_BUILTIN, OUTPUT);',
  loop: '}\nvoid loop() {',
  digitalWrite: '  digitalWrite(LED_BUILTIN, HIGH);',
  delay: '  delay(250);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(250);\n}',
});
export const data = {
  id: 'ide-run',
  title: '虚拟 IDE · 从拼块到点灯',
  instructions:
    '按 setup / pinMode / loop / digitalWrite / delay 顺序拼块。固定模板在 loop 内交替输出高低电平，各等待 250ms，完整周期 500ms，即 2Hz。',
  elements: Object.keys(blocks),
  checks: [
    { id: 'compile', type: 'sequence', task: 'program', expected: Object.keys(blocks) },
    { id: 'frequency', type: 'numeric', task: 'frequency', expected: 2, tolerance: 0 },
    { id: 'serial', type: 'choice', task: 'serial', expected: 'LED ON' },
  ],
  evidenceTypes: ['sequence', 'numeric', 'choice'],
};
export default function IdeRunSim({ onComplete } = {}) {
  const [selected, setSelected] = useState([]),
    [compiled, setCompiled] = useState(false),
    [running, setRunning] = useState(false);
  const [delay, setDelay] = useState(250),
    [message, setMessage] = useState('选择白名单代码块，然后编译。');
  const { evidence, record } = useEvidence(data, onComplete);
  function invalidate() {
    setCompiled(false);
    setRunning(false);
    record({ program: [], frequency: null, serial: null });
  }
  function compile() {
    setRunning(false);
    const result = record({ program: selected }, [data.checks[0]]);
    setCompiled(result.passed);
    setMessage(
      result.passed
        ? '编译通过。下一步运行并观察频率。'
        : selected.length < 5
          ? '编译错误：缺少必要块。补齐 setup、pinMode、loop、digitalWrite、delay。'
          : '编译错误：块的顺序不对。清空后先初始化，再进入循环。',
    );
  }
  function run() {
    record(
      { frequency: compiled ? 1000 / (2 * delay) : null, serial: compiled ? 'LED ON' : null },
      data.checks.slice(1),
    );
    setRunning(compiled);
    setMessage(
      !compiled
        ? '运行前请先编译通过。'
        : delay !== 250
          ? '串口已输出，但频率为 1Hz。2Hz 要把亮、灭各设为 250ms，再编译运行。'
          : '运行通过 · 2Hz · LED ON 循环。',
    );
  }
  return (
    <SimFrame data={data} evidence={evidence}>
      <div className="sim-ide">
        <div>
          <h3>1 · 代码块</h3>
          {data.elements.map((id) => (
            <button
              key={id}
              disabled={selected.includes(id)}
              onClick={() => {
                setSelected([...selected, id]);
                invalidate();
              }}
            >
              {id}
            </button>
          ))}
          <button
            onClick={() => {
              setSelected([]);
              invalidate();
              record({ program: [] }, [data.checks[0]]);
            }}
          >
            清空程序
          </button>
        </div>
        <div>
          <h3>2 · 编译</h3>
          <pre>
            {selected.map((id) => blocks[id].replaceAll('250', String(delay))).join('\n') ||
              '// 等待代码块'}
          </pre>
          <label>
            每次延时
            <select
              aria-label="每次延时"
              value={delay}
              onChange={(e) => {
                setDelay(Number(e.target.value));
                invalidate();
              }}
            >
              <option value="250">250ms（2Hz）</option>
              <option value="500">500ms（1Hz）</option>
            </select>
          </label>
          <button onClick={compile}>编译</button>
          <button onClick={run}>运行</button>
        </div>
        <div>
          <h3>3 · 串口输出</h3>
          <span
            className={`sim-led ${running ? 'is-running' : ''}`}
            style={{ '--period': `${delay * 2}ms` }}
            aria-label={running ? 'LED 闪烁中' : 'LED 未运行'}
          />
          <pre aria-label="串口输出">
            {running ? 'LED ON\nLED OFF\nLED ON\n… 循环' : '等待运行'}
          </pre>
        </div>
      </div>
      <output className="sim-reading" role="status">
        {message}
      </output>
    </SimFrame>
  );
}
