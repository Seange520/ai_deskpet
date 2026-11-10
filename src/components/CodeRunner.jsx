import { levelForRoute } from '../data/learningLevels';
import { useEffect, useState } from 'react';
import { Play, RotateCcw, Terminal } from 'lucide-react';
import Button from './Button';
import { DEFAULT_PROGRAM } from '../lib/codeRunner';
import { useLearningStore } from '../stores/useLearningStore';

export default function CodeRunner() {
  const [celebration, setCelebration] = useState(null);
  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 3200);
    return () => clearTimeout(timer);
  }, [celebration]);
  const routeId = useLearningStore((s) => s.routeId);
  const completedLevels = useLearningStore((s) => s.completedLevels);
  const level = levelForRoute(routeId);
  function runChallenge() {
    const before = useLearningStore.getState().challengeEvent.id;
    run(source);
    const event = useLearningStore.getState().challengeEvent;
    if (event.id !== before) setCelebration(event);
  }
  const [source, setSource] = useState(DEFAULT_PROGRAM);
  const runtime = useLearningStore((s) => s.runtime);
  const run = useLearningStore((s) => s.runProgram);
  const reset = useLearningStore((s) => s.resetRuntime);
  const action = { forward: '前进', backward: '后退', stop: '停止' }[runtime.action];
  return (
    <section className="code-runner" aria-labelledby="runner-title">
      <div className="runner-heading">
        <div>
          <span className="eyebrow">WRITE · RUN · WATCH</span>
          <h2 id="runner-title">写几行，让伙伴动起来</h2>
          <p>你可以尝试修改括号里的参数，再点击运行。这里运行的是桌宠教学指令。</p>
        </div>
      </div>
      <section className="challenge-target" aria-label="通关目标">
        <strong>
          {level.id} · {level.title}
        </strong>
        <p>{level.target}</p>
        <span>
          {completedLevels.includes(level.id)
            ? '已通关 · 重复练习不重复解锁'
            : '待挑战 · 同一次运行需完成全部目标'}
        </span>
      </section>
      {celebration && (
        <div className="challenge-celebration" role="status">
          <strong>
            {celebration.levelId} 通关！
            {celebration.nextId ? '已解锁 ' + celebration.nextId : '四关挑战全部完成！'}
          </strong>
          <span>回到校验册查看路线。原有 XP 与关卡记录保持不变。</span>
          <div className="challenge-confetti" aria-hidden="true">
            {Array.from({ length: 18 }, (_, i) => (
              <i
                key={i}
                style={{
                  left: i * 5.5 + '%',
                  animationDelay: (i % 6) * 0.05 + 's',
                  background: i % 2 ? '#6ee7b7' : '#ffb36b',
                }}
              />
            ))}
          </div>
        </div>
      )}
      <div className="runner-grid">
        <section className="panel runner-editor" aria-label="教学代码编辑区">
          <div className="editor-tab">
            <span>
              <Terminal size={16} /> playground.pet
            </span>
            <span>教学指令</span>
          </div>
          <label className="runner-label" htmlFor="pet-program">
            桌宠伪代码
          </label>
          <p id="runner-help" className="runner-help">
            move("forward" / "backward" / "stop") · light("on" / "off") · play("success")。
            每条指令用换行或分号分隔，支持 // 和 /* */ 注释；一次最多 32 条。
            控制台保留上次运行结果，修改后需再次运行。
          </p>
          <textarea
            id="pet-program"
            className="runner-textarea"
            value={source}
            aria-describedby="runner-help"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            maxLength={8192}
            onChange={(e) => setSource(e.target.value)}
          />
          <div className="runner-actions">
            <Button className="btn primary" onClick={runChallenge}>
              <Play size={16} />
              运行代码
            </Button>
            <Button
              className="btn"
              onClick={() => {
                setSource(DEFAULT_PROGRAM);
                reset();
              }}
            >
              <RotateCcw size={16} />
              恢复示例与状态
            </Button>
          </div>
          <div
            className={'runner-console ' + (runtime.status === 'error' ? 'has-error' : '')}
            role="log"
            aria-label="代码运行控制台"
            aria-live="polite"
            aria-atomic="true"
          >
            <strong>
              {runtime.status === 'error'
                ? '运行失败'
                : runtime.status === 'success'
                  ? '运行完成'
                  : '等待运行'}
            </strong>
            {runtime.logs.length ? (
              runtime.logs.map((line, i) => <p key={i}>{line}</p>)
            ) : (
              <p>点击「运行代码」，这里会显示每条指令的结果。</p>
            )}
          </div>
        </section>
        <section className="panel runner-preview" aria-label="代码运行结果">
          <div className="panel-heading">
            <span className="eyebrow">LIVE COMPANION</span>
            <span className="live-dot">全局状态同步</span>
          </div>
          <div className="runner-stage">
            <div
              className={'runner-actor pet-command-' + runtime.action}
              key={runtime.runId}
              role="img"
              aria-label={'模拟桌宠：' + action + '，LED ' + (runtime.led ? '亮' : '灭')}
            >
              <div className="companion-body">
                <span
                  className={'command-led ' + (runtime.led ? 'is-lit' : '')}
                  aria-hidden="true"
                />
                <span className="companion-antenna" />
                <span className="companion-face">
                  <i />
                  <i />
                  <b />
                </span>
                <span className="companion-feet" />
              </div>
            </div>
          </div>
          <div className="runner-readout" aria-live="polite">
            <span>动作：{action}</span>
            <span>LED：{runtime.led ? '亮' : '灭'}</span>
          </div>
          <p className="runner-help">
            右下角伙伴读取同一份状态。指令按顺序执行，展示最终状态；本练习不发放
            XP，不连接真实硬件。
          </p>
        </section>
      </div>
    </section>
  );
}
