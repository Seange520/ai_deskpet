import { useState } from 'react';
import graph from './data/knowledge-graph.v1.json';
import { STATES, visibleStory } from './learning.mjs';
export default function StarMap({ profile, onStart }) {
  const [selected, setSelected] = useState(graph.kps[0].id),
    k = graph.kps.find((k) => k.id === selected),
    state = profile.kps[k.id].status;
  function star(k) {
    return (
      <button
        key={k.id}
        data-star={k.id}
        data-state={profile.kps[k.id].status}
        aria-label={
          k.id + ' ' + k.name + ' ' + STATES[profile.kps[k.id].status]
        }
        aria-pressed={selected === k.id}
        onClick={() => setSelected(k.id)}
      >
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <path
            d="M18 2 22 13 34 18 22 23 18 34 14 23 2 18 14 13Z"
            fill="currentColor"
          />
        </svg>
        <span>{k.id}</span>
        <small>{STATES[profile.kps[k.id].status]}</small>
      </button>
    );
  }
  return (
    <div className="teaching-map-layout">
      <div className="teaching-map-scroll">
        <div className="teaching-map" aria-label="七柱九层星图">
          <span>层带</span>
          {graph.pillars.map((p) => (
            <strong key={p.id}>{p.name}</strong>
          ))}
          {[...graph.layers].reverse().map((layer) => (
            <div className="teaching-layer" key={layer.id}>
              <strong>{layer.id}</strong>
              {graph.pillars.map((p) => (
                <div className="teaching-column" key={p.id}>
                  {graph.kps
                    .filter((k) => k.layer === layer.id && k.pillar === p.id)
                    .map(star)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <aside className="teaching-card" aria-label="星点详情">
        <h3>{k.name}</h3>
        <p>{k.oneLiner}</p>
        <p>
          {k.layer} · {graph.pillars.find((p) => p.id === k.pillar).name} ·{' '}
          {STATES[state]}
        </p>
        <p>
          前置：{k.prereq.join('、') || '无'}
          {k.gatePrereq ? ' · 三柱基础校验' : ''}
        </p>
        <p>{state === 'locked' ? '前置校验完成后可学' : '可以学习'}</p>
        {visibleStory(k) && <p>{visibleStory(k)}</p>}
        <button disabled={state === 'locked'} onClick={() => onStart(k.id)}>
          开始课节
        </button>
      </aside>
    </div>
  );
}
