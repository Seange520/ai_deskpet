import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { useLearningStore, totalXP } from '../../stores/useLearningStore';
import { formForXP } from '../../data/lore';

// Presentation only. Never persisted and never awards XP or unlocks a lesson.
export const useLorePresentation = create(() => ({
  evolving: false,
  switched: false,
  achievement: false,
  message: null,
}));
export const evolutionClock = { progress: 0 };
export const revealLore = (entry) => useLorePresentation.setState({ message: entry });
export function usePetForm() {
  const xp = useLearningStore((s) => totalXP(s.routes, s.debugProgress));
  const evolving = useLorePresentation((s) => s.evolving);
  const switched = useLorePresentation((s) => s.switched);
  return evolving && !switched ? 'Spark' : formForXP(xp);
}
export function usePresentationBlocked() {
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
  return blocked;
}
