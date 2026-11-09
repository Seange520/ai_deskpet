import { useEffect, useState } from 'react';
export const LAYOUT_KEY = 'ui:layout:v1';
export const defaults = () => ({ left: false, right: false, map: true });
export function readLayout(storage) {
  try {
    const value = JSON.parse(storage.getItem(LAYOUT_KEY));
    if (!value || typeof value !== 'object') return defaults();
    return Object.fromEntries(Object.entries(defaults()).map(([k, v]) => [k, typeof value[k] === 'boolean' ? value[k] : v]));
  } catch { return defaults(); } // Do not overwrite damaged preferences until an explicit UI change.
}
export function layoutKey(event) {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey ||
      /INPUT|TEXTAREA|SELECT/.test(event.target?.tagName) || event.target?.isContentEditable) return null;
  return { '[': 'left', ']': 'right' }[event.key] || null;
}
export function effectiveLayout(layout, focused) { return { ...layout, left: focused || layout.left }; }
export function toggleLayout(layout, side, mobile = false) {
  const next = { ...layout, [side]: !layout[side] };
  if (mobile && !next[side]) next[side === 'left' ? 'right' : 'left'] = true;
  return next;
}
export function useHudLayout(focused) {
  const [layout, setLayout] = useState(() => readLayout(localStorage));
  const [busy, setBusy] = useState(focused);
  useEffect(() => {
    if (focused) { setBusy(true); return; }
    const timer = setTimeout(() => setBusy(false), 2000);
    return () => clearTimeout(timer);
  }, [focused]);
  const toggle = (side) => setLayout((old) => {
    const next = toggleLayout(old, side, innerWidth <= 480);
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(next)); } catch { /* UI still usable */ }
    return next;
  });
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Tab' && !e.shiftKey && e.target?.id === 'exploration-input' && !document.querySelector('[aria-modal="true"],.world-map-backdrop')) {
        const target = document.querySelector('.street-meter:not(.minimized) button,.kickback-panel button,#hud-task button');
        if (target) { e.preventDefault(); target.focus(); }
        return;
      }
      const side = layoutKey(e); if (side && !document.querySelector('[aria-modal="true"],.world-map-backdrop')) { e.preventDefault(); toggle(side); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  return { ...effectiveLayout(layout, busy), busy, toggle };
}
