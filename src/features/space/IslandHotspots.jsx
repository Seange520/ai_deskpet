import { Cpu, Code2, LayoutDashboard, Trophy } from 'lucide-react';
import { preloadIsland } from './islandAssets';

export const islandLinks = [
  { id: 'dashboard', name: '学习仪表盘', icon: LayoutDashboard },
  { id: 'hardware', name: '硬件实验室', icon: Cpu },
  { id: 'code', name: '代码魔改工坊', icon: Code2 },
  { id: 'ranking', name: '创客排位', icon: Trophy },
];

export function islandName(id) {
  return islandLinks.find((island) => island.id === id)?.name ?? '中央枢纽';
}

function moveFocus(event) {
  const buttons = Array.from(event.currentTarget.querySelectorAll('button'));
  const index = buttons.indexOf(event.target);
  if (index < 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const offsets = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
  const offset = offsets[event.key];
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : offset
          ? (index + offset + buttons.length) % buttons.length
          : -1;
  if (next === -1) return;
  event.preventDefault();
  buttons[next].focus();
}

export default function IslandHotspots({
  dock,
  projected,
  page,
  destination,
  busy,
  tier,
  onNavigate,
}) {
  return (
    <nav
      ref={dock}
      className="space-dock"
      aria-label="主导航"
      data-space-hud
      data-projected={projected}
      onKeyDown={moveFocus}
    >
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {busy ? `正在飞往${islandName(destination)}` : `当前位置：${islandName(page)}`}
      </span>
      {islandLinks.map(({ id, name, icon: Icon }) => (
        <button
          type="button"
          key={id}
          className="island-hotspot"
          aria-label={name}
          aria-current={page === id ? 'page' : undefined}
          data-island={id}
          data-pending={busy && destination === id ? '' : undefined}
          onPointerEnter={tier > 0 ? () => preloadIsland(id) : undefined}
          onFocus={tier > 0 ? () => preloadIsland(id) : undefined}
          onClick={(event) => onNavigate(id, event)}
        >
          <Icon size={17} aria-hidden="true" />
          <span>{name}</span>
        </button>
      ))}
    </nav>
  );
}
