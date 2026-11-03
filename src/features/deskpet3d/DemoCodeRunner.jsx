import { useState } from 'react';
import { DEFAULT_PROGRAM } from '../../lib/codeRunner';
import { useDemoRuntime } from './useDemoRuntime';

export default function DemoCodeRunner() {
  const [source, setSource] = useState(DEFAULT_PROGRAM);
  const runtime = useDemoRuntime((state) => state.runtime);
  const run = useDemoRuntime((state) => state.runProgram);
  const reset = useDemoRuntime((state) => state.resetRuntime);
  return (
    <section className="code-runner" aria-labelledby="demo-runner-title">
      <div className="runner-heading">
        <h2 id="demo-runner-title">写几行，让 3D 伙伴动起来</h2>
        <p>仅在本页预览，不发放 XP、不解锁关卡、不保存学习记录。</p>
      </div>
      <section className="panel runner-editor" aria-label="教学代码编辑区">
        <div className="editor-tab">
          <span>playground.pet</span>
          <span>独立 3D 预览</span>
        </div>
        <label className="runner-label" htmlFor="demo-pet-program">
          桌宠伪代码
        </label>
        <p id="demo-runner-help" className="runner-help">
          move("forward" / "backward" / "stop") · light("on" / "off") · play("success")。
          每条指令用换行或分号分隔，支持注释；最多 32 条。play 仅显示接收结果，不播放音效。
        </p>
        <textarea
          id="demo-pet-program"
          className="runner-textarea"
          value={source}
          aria-describedby="demo-runner-help"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          maxLength={8192}
          onChange={(event) => setSource(event.target.value)}
        />
        <div className="runner-actions">
          <button type="button" className="btn primary" onClick={() => run(source)}>
            运行代码
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setSource(DEFAULT_PROGRAM);
              reset();
            }}
          >
            恢复示例与状态
          </button>
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
    </section>
  );
}
