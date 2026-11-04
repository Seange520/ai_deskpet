import { useEffect, useRef, useState } from 'react';
import { HeroGlass } from './MicroEffects';
import HeroParticles from './HeroParticles';
import './hero-workbench.css';

// Presentation state stays local: no learning state, persistence or device access.
export default function HeroWorkbench({ children }) {
  const ref = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const node = ref.current;
    const query = matchMedia(
      '(min-width: 768px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    );
    let inView = false;
    let modal = Boolean(document.querySelector('.modal-backdrop'));
    const sync = () => {
      setEnabled(query.matches);
      setActive(query.matches && inView && !document.hidden && !modal);
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
    sync();
    return () => {
      intersection.disconnect();
      mutations.disconnect();
      if (query.removeEventListener) query.removeEventListener('change', sync);
      else query.removeListener(sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  return (
    <section
      ref={ref}
      className="hero-panel hero-workbench"
      data-depth={enabled}
      data-active={active}
    >
      <HeroGlass enabled={active} />
      {enabled && <HeroParticles active={active} />}
      {children}
    </section>
  );
}
