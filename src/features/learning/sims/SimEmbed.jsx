import { lazy, Suspense } from 'react';
import { getSim, simIds } from './registry.mjs';
import './sims.css';

const components = Object.fromEntries(simIds.map((id) => [id, lazy(getSim(id))]));

export default function SimEmbed({ simId, onComplete }) {
  const Component = Object.hasOwn(components, simId) ? components[simId] : null;
  if (!Component) return null;
  return (
    <div className="teaching-sim-embed" data-sim-embed={simId}>
      <p className="teaching-sim-hint">动手演练 · 完成后自动记入课节证据</p>
      <Suspense fallback={<p role="status">仿真加载中</p>}>
        <Component key={simId} onComplete={onComplete} />
      </Suspense>
    </div>
  );
}
