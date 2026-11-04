import { useEffect, useRef } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import './SpotlightCard.css';

type SpotlightCardProps = {
  children: ReactNode;
  className?: string;
  borderRadius?: CSSProperties['borderRadius'];
};

// The article replaces the existing card itself, preserving its flex layout and 3D children.
export default function SpotlightCard({ children, className = '', borderRadius }: SpotlightCardProps) {
  const ref = useRef<HTMLElement>(null);
  const frame = useRef(0);
  const enabled = useRef(false);
  const pointer = useRef({ x: 0, y: 0 });

  function reset() {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    const node = ref.current;
    if (!node) return;
    node.dataset.spotlightActive = 'false';
    node.style.removeProperty('--spotlight-x');
    node.style.removeProperty('--spotlight-y');
  }

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce), (hover: none), (pointer: coarse)');
    const sync = () => {
      enabled.current = !query.matches;
      if (!enabled.current) reset();
    };
    const onVisibility = () => {
      if (document.hidden) reset();
    };
    sync();
    if (query.addEventListener) query.addEventListener('change', sync);
    else query.addListener(sync);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      enabled.current = false;
      reset();
      if (query.removeEventListener) query.removeEventListener('change', sync);
      else query.removeListener(sync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (!enabled.current || event.pointerType !== 'mouse') return;
    pointer.current = { x: event.clientX, y: event.clientY };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const node = ref.current;
      if (!node || !enabled.current) return;
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      // Percentages keep the light aligned when the outer TiltSurface transforms the card.
      const x = Math.max(0, Math.min(100, ((pointer.current.x - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((pointer.current.y - rect.top) / rect.height) * 100));
      node.style.setProperty('--spotlight-x', `${x}%`);
      node.style.setProperty('--spotlight-y', `${y}%`);
      node.dataset.spotlightActive = 'true';
    });
  }

  return (
    <article
      ref={ref}
      className={`spotlight-card ${className}`}
      style={borderRadius === undefined ? undefined : { borderRadius }}
      data-spotlight-active="false"
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      {children}
      <span className="spotlight-border" data-spotlight-border="" aria-hidden="true" />
    </article>
  );
}
