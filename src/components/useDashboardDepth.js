import { useEffect } from 'react';
import './dashboard-depth.css';

// Local presentation only. Pointer listeners exist only while the section is visible.
export default function useDashboardDepth(ref) {
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const query = matchMedia(
      '(min-width: 768px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    );
    let inView = false,
      listening = false,
      frame = 0;
    let modal = Boolean(document.querySelector('.modal-backdrop'));
    let pointer = { x: 0, y: 0 };
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      node.style.removeProperty('--dashboard-rx');
      node.style.removeProperty('--dashboard-ry');
      node.dataset.depthHover = 'false';
    };
    const move = (event) => {
      if (event.pointerType !== 'mouse') return;
      pointer = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!listening) return;
        const rect = node.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const clamp = (value) => Math.max(-1, Math.min(1, value));
        const x = clamp(((pointer.x - rect.left) / rect.width) * 2 - 1);
        const y = clamp(((pointer.y - rect.top) / rect.height) * 2 - 1);
        node.style.setProperty('--dashboard-rx', (-y * 3.5).toFixed(3) + 'deg');
        node.style.setProperty('--dashboard-ry', (x * 3.5).toFixed(3) + 'deg');
        node.dataset.depthHover = 'true';
      });
    };
    const detach = () => {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerleave', reset);
      node.removeEventListener('pointercancel', reset);
      listening = false;
      reset();
    };
    const sync = () => {
      const enabled = query.matches && inView && !document.hidden && !modal;
      node.dataset.depthEnabled = String(enabled);
      if (enabled && !listening) {
        node.addEventListener('pointermove', move, { passive: true });
        node.addEventListener('pointerleave', reset, { passive: true });
        node.addEventListener('pointercancel', reset, { passive: true });
        listening = true;
      } else if (!enabled) detach();
    };
    const intersection = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    const mutations = new MutationObserver(() => {
      const next = Boolean(document.querySelector('.modal-backdrop'));
      if (next !== modal) {
        modal = next;
        sync();
      }
    });
    intersection.observe(node);
    mutations.observe(document.body, { childList: true, subtree: true });
    if (query.addEventListener) query.addEventListener('change', sync);
    else query.addListener(sync);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('blur', reset);
    window.addEventListener('resize', reset, { passive: true });
    sync();
    return () => {
      detach();
      intersection.disconnect();
      mutations.disconnect();
      if (query.removeEventListener) query.removeEventListener('change', sync);
      else query.removeListener(sync);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('blur', reset);
      window.removeEventListener('resize', reset);
    };
  }, [ref]);
}
