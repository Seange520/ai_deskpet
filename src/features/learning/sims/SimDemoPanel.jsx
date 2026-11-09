import { lazy, Suspense, useState } from 'react';
import { getSim, simIds } from './registry.mjs';
import './sims.css';
const components = Object.fromEntries(simIds.map((id) => [id, lazy(getSim(id))]));
export default function SimDemoPanel() {
  const [id, setId] = useState('meter');
  const Component = Object.hasOwn(components, id) ? components[id] : null;
  return (
    <main className="sims-demo" data-testid="sims-panel">
      <header>
        <p>第七校验 / 动手校验 · DEV v1</p>
        <h1>先试一试，再看证据</h1>
        <p>
          教学仿真 ≠
          真机。数值采用理想模型；串口为固定模板演示。真机接线先断电并核对开发板资料。每项约 90
          秒，错误可重试。
        </p>
      </header>
      <nav aria-label="选择仿真">
        {simIds.map((v) => (
          <button key={v} aria-pressed={id === v} onClick={() => setId(v)}>
            {v}
          </button>
        ))}
      </nav>
      <Suspense fallback={<p role="status">仿真加载中</p>}>
        {Component ? <Component key={id} /> : <p role="alert">未知仿真，请从白名单选择。</p>}
      </Suspense>
    </main>
  );
}
