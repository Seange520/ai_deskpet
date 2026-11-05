import { useEffect, useRef, useState } from 'react';
import { HeroGlass } from './MicroEffects';
import { DESKTOP_VISUAL_QUERY, isLowPowerDevice } from '../lib/visualCapabilities';
import './hero-workbench.css';

// Presentation state stays local: no learning state, persistence or device access.
export default function HeroWorkbench({ children }) {
  const ref = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const node = ref.current;
    const query = matchMedia(DESKTOP_VISUAL_QUERY);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let inView = false;
    let modal = Boolean(document.querySelector('.modal-backdrop'));
    const sync = () => {
      const eligible = query.matches && !isLowPowerDevice();
      const visible = inView && !document.hidden && !modal;
      setEnabled(eligible && !reduced.matches);
      setActive(eligible && !reduced.matches && visible);
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
    if (reduced.addEventListener) reduced.addEventListener('change', sync);
    else reduced.addListener(sync);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      intersection.disconnect();
      mutations.disconnect();
      if (query.removeEventListener) query.removeEventListener('change', sync);
      else query.removeListener(sync);
      if (reduced.removeEventListener) reduced.removeEventListener('change', sync);
      else reduced.removeListener(sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  return (
    <section
      ref={ref}
      className="hero-panel hero-workbench page-hero"
      data-depth={enabled}
      data-active={active}
    >
      {/* Aurora is retained as an asset; Tier 0 creates no WebGL context. */}
      <HeroGlass enabled={active} />

      {children}
    </section>
  );
}
