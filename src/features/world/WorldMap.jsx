import { useEffect, useRef } from 'react';
import { useWorldMap, DESTINATIONS } from './navigationStore';
import { useSpaceStore } from '../space/spaceStore';
import './map.css';
import TexturedMinimap from './TexturedMinimap';
function Chart({ large, position, yaw, choose, busy, textured = false }) {
  return (
    <svg
      viewBox="-24 -24 48 48"
      aria-label={large ? '群岛传送地图' : '实时位置小地图'}
      role={large ? 'group' : 'img'}
    >
      {(large || !textured) && (
        <>
          <circle r="16" fill="none" stroke="#729eaa" strokeWidth=".35" />
          {DESTINATIONS.slice(1).map((a) => (
            <path
              key={a.id}
              d={'M0 0L' + a.position[0] + ' ' + a.position[2]}
              stroke="#729eaa"
              strokeWidth=".45"
            />
          ))}
          {DESTINATIONS.map((a) => (
            <g
              key={a.id}
              transform={'translate(' + a.position[0] + ' ' + a.position[2] + ')'}
              role={large ? 'button' : undefined}
              tabIndex={large ? 0 : undefined}
              aria-label={large ? '传送至' + a.label : undefined}
              aria-disabled={busy || undefined}
              onClick={
                large
                  ? () => {
                      if (!busy) choose(a.id);
                    }
                  : undefined
              }
              onKeyDown={
                large
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!busy) choose(a.id);
                      }
                    }
                  : undefined
              }
            >
              <circle
                r={a.id === 'hub' ? 3 : 3.6}
                fill="#284d63"
                stroke={a.color}
                strokeWidth=".4"
              />
              {large && (
                <text x="0" y=".35" textAnchor="middle" fontSize="1.05" fill={a.color}>
                  {a.label}
                </text>
              )}
            </g>
          ))}
        </>
      )}
      <g
        data-player-marker
        transform={
          'translate(' +
          position[0] +
          ' ' +
          position[2] +
          ') rotate(' +
          (180 - (yaw * 180) / Math.PI) +
          ')'
        }
      >
        <circle r="1.5" fill="#ffe4a4" opacity=".16" />
        <path d="M0 -1.2L-.75 .8L0 .45L.75 .8Z" fill="#ffe4a4" stroke="#14212b" strokeWidth=".18" />
      </g>
    </svg>
  );
}
export default function WorldMap({ exploring, tier, onSurveySelect }) {
  const open = useWorldMap((s) => s.open),
    active = useWorldMap((s) => s.active),
    phase = useWorldMap((s) => s.phase);
  const position = useWorldMap((s) => s.position),
    yaw = useWorldMap((s) => s.yaw),
    focus = useSpaceStore((s) => s.focus);
  const panel = useRef(null),
    previousFocus = useRef(null);
  const point = exploring
    ? position
    : DESTINATIONS.find((a) => a.id === focus)?.position || [0, 0, 0];
  useEffect(() => {
    const key = (e) => {
      if (
        e.code !== 'KeyM' ||
        e.repeat ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.target.closest('input,textarea,select,[contenteditable="true"]')
      )
        return;
      e.preventDefault();
      useWorldMap.getState().toggle();
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      useWorldMap.getState().reset();
    };
  }, []);
  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement;
      if (document.pointerLockElement) document.exitPointerLock();
      panel.current?.querySelector('button')?.focus();
    } else if (previousFocus.current?.isConnected) previousFocus.current.focus();
  }, [open]);
  useEffect(() => {
    if (!exploring) useWorldMap.getState().reset();
  }, [exploring, tier]);
  function choose(id) {
    if (exploring && tier === 3) {
      useWorldMap.getState().travel(id);
      return;
    }
    useWorldMap.getState().close();
    if (onSurveySelect) {
      onSurveySelect(id);
      return;
    }
    // Preserve original App route/navigation semantics in teaching and low tiers.
    const target =
      id === 'hub'
        ? document.querySelector('button.space-return')
        : document.querySelector('.space-dock [data-island="' + id + '"]');
    target?.click();
  }
  return (
    <>
      <aside className="world-minimap" aria-label="小地图">
        <span>
          {exploring ? '探索位置' : '教学导航'} <small>北 ↑</small>
        </span>
        <div className="world-minimap-terrain">
          {tier > 0 && <TexturedMinimap />}
          <Chart position={point} yaw={exploring ? yaw : 0} textured={tier > 0} />
        </div>
        <button onClick={() => useWorldMap.getState().toggle()} disabled={active}>
          大地图 M
        </button>
        <output aria-live="polite">
          {active
            ? { charge: '蓄力', dash: '穿越群岛', settle: '落位重组' }[phase]
            : exploring
              ? 'X ' + point[0].toFixed(1) + ' · Z ' + point[2].toFixed(1)
              : tier < 3
                ? '轻量导航'
                : '选择目的地'}
        </output>
      </aside>
      {open && (
        <div
          className="world-map-backdrop"
          onKeyDown={(e) => {
            if (e.code === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              useWorldMap.getState().close();
            }
            if (e.key === 'Tab') {
              const items = [
                  ...panel.current.querySelectorAll(
                    'button:not(:disabled),[role=button]:not([aria-disabled=true])',
                  ),
                ],
                i = items.indexOf(document.activeElement);
              e.preventDefault();
              items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
            }
          }}
        >
          <section
            className="world-map-panel"
            role="dialog"
            aria-modal="true"
            aria-label="群岛大地图"
            ref={panel}
          >
            <header>
              <div>
                <h2>群岛航图</h2>
                <p>{exploring ? '选择锚点，启程前往下一座岛。' : '选择锚点，进入对应教学空间。'}</p>
              </div>
              <button onClick={() => useWorldMap.getState().close()}>关闭地图 Esc</button>
            </header>
            <Chart large position={point} yaw={exploring ? yaw : 0} choose={choose} busy={active} />
          </section>
        </div>
      )}
    </>
  );
}
