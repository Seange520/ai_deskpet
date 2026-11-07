import { useEffect, useRef, useState } from 'react';
import { useSpaceStore } from './spaceStore';
export function RelicOverlay({ overlay, tier, ready }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef();
  const [blocked, setBlocked] = useState(document.hidden);
  useEffect(() => {
    const sync = () =>
      setBlocked(
        document.hidden ||
          Boolean(document.querySelector('.modal-backdrop, .pet-focus-overlay, .burn-overlay')) ||
          Boolean(document.querySelector('.app-shell')?.inert),
      );
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['inert'],
    });
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  const dashboard = useSpaceStore((s) => s.focus === 'dashboard' && s.phase === 'detail');
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    setVisible(false);
    clearTimeout(timer.current);
  }, [dashboard, tier, blocked]);
  const reveal = () => {
    clearTimeout(timer.current);
    setVisible(true);
    timer.current = setTimeout(() => setVisible(false), 6500);
  };
  const dom = tier === 0 || !ready;
  return (
    <div
      ref={overlay}
      className="relic-overlay"
      data-dom={dom}
      data-blocked={blocked}
      data-visible={dashboard && !blocked}
    >
      <button type="button" className="relic-hotspot" aria-label="查看维护者石碑" onClick={reveal}>
        <span aria-hidden="true">⌁ ⋮ ⟐ ⌁</span>
        <small>残缺的校验碑</small>
      </button>
      <div className="relic-message" role="status" aria-live="polite" data-open={visible}>
        {visible && (
          <>
            这是上一任维护者留下的……<small>七道刻痕，最后一道仍未闭合。</small>
          </>
        )}
      </div>
    </div>
  );
}
