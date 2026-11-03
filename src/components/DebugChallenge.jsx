import { useState } from 'react';
import Button from './Button';
import { getHardwareRoute } from '../data/hardwareRoutes';
import { useLearningStore, DEBUG_REWARD } from '../stores/useLearningStore';

export default function DebugChallenge({ routeId }) {
  const route = getHardwareRoute(routeId);
  const [index, setIndex] = useState(0);
  const [practice, setPractice] = useState(false);
  const [result, setResult] = useState(null);
  const debugProgress = useLearningStore((s) => s.debugProgress);
  const attempt = useLearningStore((s) => s.attemptFaultRepair);
  const fault = route.faultyCircuits[index];
  const earned = debugProgress[routeId]?.[fault.id] === true;
  const solved = (earned && !practice) || result?.status === 'success';
  const targets = [...new Set([...fault.wires.map((w) => w.target), fault.wrongTarget])];
  const position = (i, count) => 60 + i * (240 / Math.max(1, count - 1));
  function inspect(choice) {
    if (solved) return;
    setResult(attempt(fault.id, choice));
  }
  const key = (event, choice) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      inspect(choice);
    }
  };
  return (
    <section className="panel debug-challenge" aria-label="Debug 故障排查">
      <div className="debug-heading">
        <h2>Debug 挑战 · 找到那根错线</h2>
        <span>每题首次修复 +{DEBUG_REWARD} XP</span>
      </div>
      <label className="debug-picker">
        选择故障题
        <select
          aria-label="选择故障题"
          value={index}
          onChange={(e) => {
            setIndex(Number(e.target.value));
            setPractice(false);
            setResult(null);
          }}
        >
          {route.faultyCircuits.map((item, i) => (
            <option key={item.id} value={i}>
              {i + 1}. {item.title}
            </option>
          ))}
        </select>
      </label>
      <p>{fault.hint}</p>
      <p className="debug-instructions">
        根据正确配对表，点击错误连线或它接入的错误目标引脚，即可自动重新接到正确引脚。Tab、回车或空格也可操作。
      </p>
      <div className="debug-layout">
        <div>
          <h3>正确配对表</h3>
          <ul className="debug-pairs">
            {fault.wires.map((w) => (
              <li key={w.source}>
                {w.source} → {w.target}
              </li>
            ))}
          </ul>
          <p className="debug-boundary">
            这是未通电的教学诊断，不会烧毁实体引脚，也不改变正常接线和代码挑战进度。
          </p>
        </div>
        <svg viewBox="0 0 600 360" className="debug-svg" aria-label="故障接线图">
          <rect x="20" y="20" width="560" height="320" rx="16" fill="#111e29" />
          {fault.wires.map((wire, i) => {
            const target =
              wire.source === fault.source && !solved ? fault.wrongTarget : wire.target;
            const y = position(i, fault.wires.length),
              ty = position(targets.indexOf(target), targets.length);
            const d = 'M110,' + y + ' C260,' + y + ' 340,' + ty + ' 490,' + ty;
            const choice = { kind: 'wire', source: wire.source };
            return (
              <g
                key={wire.source}
                role="button"
                aria-label={'检查连线 ' + wire.source + ' → ' + target}
                tabIndex={solved ? -1 : 0}
                aria-disabled={solved}
                onClick={() => inspect(choice)}
                onKeyDown={(e) => key(e, choice)}
                className="debug-wire"
              >
                <path d={d} stroke="transparent" strokeWidth="24" fill="none" />
                <path d={d} stroke={solved ? '#6ee7b7' : '#d9ad75'} strokeWidth="4" fill="none" />
                <circle cx="110" cy={y} r="9" fill="#a7d8be" />
                <text x="90" y={y + 5} textAnchor="end" fill="#d5e5df" fontSize="13">
                  {wire.source}
                </text>
              </g>
            );
          })}
          {targets.map((target, i) => {
            const choice = { kind: 'target', target };
            return (
              <g
                key={target}
                role="button"
                aria-label={'检查目标引脚 ' + target}
                tabIndex={solved ? -1 : 0}
                aria-disabled={solved}
                onClick={() => inspect(choice)}
                onKeyDown={(e) => key(e, choice)}
                className="debug-pin"
              >
                <circle cx="490" cy={position(i, targets.length)} r="23" fill="transparent" />
                <circle
                  cx="490"
                  cy={position(i, targets.length)}
                  r="10"
                  fill="#111e29"
                  stroke="#a7d8be"
                  strokeWidth="2"
                />
                <text x="510" y={position(i, targets.length) + 5} fill="#d5e5df" fontSize="13">
                  {target}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="debug-mobile-wires" aria-label="触屏连线选择">
        <p>也可点选下面的大按钮检查连线：</p>
        {fault.wires.map((wire) => {
          const target = wire.source === fault.source && !solved ? fault.wrongTarget : wire.target;
          return (
            <Button
              key={wire.source}
              className="btn"
              disabled={solved}
              aria-label={'诊断连线 ' + wire.source + ' → ' + target}
              onClick={() => inspect({ kind: 'wire', source: wire.source })}
            >
              {wire.source} → {target}
            </Button>
          );
        })}
      </div>
      <div
        className={
          'debug-feedback ' + (result?.status === 'error' ? 'is-error' : solved ? 'is-success' : '')
        }
        role={result?.status === 'error' ? 'alert' : 'status'}
        aria-live="polite"
      >
        {result?.status === 'error'
          ? '模拟短路警告 / 引脚烧毁风险：你选中了正常位置，请重新核对。'
          : solved
            ? '修复成功 · ' +
              fault.source +
              ' → ' +
              fault.target +
              (result?.awarded
                ? ' · +' + result.awarded + ' XP'
                : ' · 本题奖励已领取，重复练习不加分')
            : '等待诊断 · 图中有一根线接错了。'}
      </div>
      {solved && (
        <Button
          className="btn"
          onClick={() => {
            setPractice(true);
            setResult(null);
          }}
        >
          重新练习此题
        </Button>
      )}
    </section>
  );
}
