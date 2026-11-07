import { useEffect, useRef } from 'react';
import { VIEWS } from './poi';
import './world.css';
export default function WorldPreview({ active, available, view, onView, onToggle, onExplore }) {
  const control = useRef(null);
  useEffect(() => {
    if (active) control.current?.querySelector('button')?.focus();
    else control.current?.querySelector('button:not(:disabled)')?.focus();
  }, [active]);
  return (
    <aside ref={control} className="world-preview" aria-label="世界构图预览">
      {active ? (
        <>
          <p>P9 · 世界骨架</p>
          <h1>下一段旅程，从这里开始</h1>
          <span>构图预览 · 选择方向观察群岛</span>
          <nav aria-label="观察方向">
            {VIEWS.map((v) => (
              <button key={v.id} aria-pressed={view === v.id} onClick={() => onView(v.id)}>
                {v.label}
              </button>
            ))}
          </nav>
          <button onClick={onExplore}>开始自由探索</button>{' '}
          <button onClick={onToggle}>返回教学</button>
        </>
      ) : (
        <button disabled={!available} onClick={onToggle}>
          预览 P9 世界骨架
        </button>
      )}
      {!available && <small>世界预览需要极致画质；教学仍可使用。</small>}
    </aside>
  );
}
