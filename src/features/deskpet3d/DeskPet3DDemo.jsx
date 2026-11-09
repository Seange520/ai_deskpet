import { useRef } from 'react';
import DeskPet3DStage from './DeskPet3DStage';
import { useDemoRuntime } from './useDemoRuntime';
import DemoCodeRunner from './DemoCodeRunner';
import '../../runner.css';

export default function DeskPet3DDemo() {
  const runtime = useDemoRuntime((state) => state.runtime);
  const stage = useRef(null);
  return (
    <main className="stage3d-page">
      <header className="stage3d-header">
        <a href="/" className="stage3d-brand">
          ⚡ 第七校验
        </a>
        <span>PHASE 3 · 指令动画实验</span>
      </header>
      <div className="stage3d-heading">
        <p className="stage3d-eyebrow">DESKPET / GEOMETRY STUDY 001</p>
        <h1>换个角度，看看小伙伴。</h1>
        <p>在本页下方运行教学指令，观察桌宠移动与眼睛亮度。停止或恢复状态可让模型归位。</p>
      </div>
      <section className="stage3d-panel" aria-label="指令联动 3D 桌宠展台">
        <div className="stage3d-toolbar">
          <span>拖拽旋转 · 滚轮缩放</span>
          <button type="button" onClick={() => stage.current?.resetView()}>
            重置视角
          </button>
        </div>
        <div className="stage3d-canvas">
          <DeskPet3DStage ref={stage} runtime={runtime} />
        </div>
        <div className="stage3d-caption">
          <span role="status">
            指令预览 · 动作：{{ forward: '前进', backward: '后退', stop: '停止' }[runtime.action]}
            {' · LED：'}
            {runtime.led ? '亮' : '灭'}
          </span>
          <span>观察距离范围 4.8–11</span>
        </div>
      </section>
      <aside className="stage3d-note">
        本页为独立指令预览，不发放 XP、不解锁关卡，也不读取或保存学习记录。
        运行态仅在本页有效，不跨标签页同步，刷新后复位。
      </aside>
      <div className="stage3d-runner">
        <DemoCodeRunner />
      </div>
      <footer>
        独立 3D 实验 · 与主应用的学习存档隔离。<a href="/">返回学习工作台 →</a>
      </footer>
    </main>
  );
}
