import { useEffect, useRef } from 'react';
import { useLearningStore, totalXP } from '../../stores/useLearningStore';
import useReducedMotionPreference from '../../lib/useReducedMotionPreference';
import { useLorePresentation, evolutionClock, usePresentationBlocked } from './useLorePresentation';

export default function EvolutionOverlay({ tier }) {
  const xp = useLearningStore((s) => totalXP(s.routes, s.debugProgress));
  const previous = useRef(xp);
  const blocked = usePresentationBlocked();
  const reduced = useReducedMotionPreference();
  const active = useLorePresentation((s) => s.evolving);
  const achievement = useLorePresentation((s) => s.achievement);
  useEffect(() => {
    if (previous.current < 500 && xp >= 500) {
      evolutionClock.progress = 0;
      useLorePresentation.setState({ evolving: true, switched: false, achievement: false });
    }
    if (xp < 500)
      useLorePresentation.setState({ evolving: false, switched: false, achievement: false });
    previous.current = xp;
  }, [xp]);
  useEffect(() => {
    if (!active || blocked) return;
    const finish = () => {
      evolutionClock.progress = 1;
      useLorePresentation.setState({ evolving: false, switched: true, achievement: true });
    };
    if (reduced || tier === 0) {
      finish();
      return;
    }
    let frame, previousTime;
    const tick = (now) => {
      const dt = previousTime === undefined ? 0 : Math.min((now - previousTime) / 1000, 0.06);
      previousTime = now;
      evolutionClock.progress = Math.min(1, evolutionClock.progress + dt / 4.8);
      if (evolutionClock.progress >= 0.5 && !useLorePresentation.getState().switched)
        useLorePresentation.setState({ switched: true });
      if (evolutionClock.progress >= 1) finish();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, blocked, reduced, tier]);
  useEffect(() => {
    if (!achievement || blocked) return;
    const timer = setTimeout(() => useLorePresentation.setState({ achievement: false }), 5500);
    return () => clearTimeout(timer);
  }, [achievement, blocked]);
  return (
    <>
      {active && !blocked && (
        <div className="evolution-veil" data-testid="pet-evolution" aria-hidden="true">
          <div className="evolution-orbit" />
          <div className="evolution-orbit second" />
          <p>
            第七校验 · 核心重组中<span>SPARK → KERNEL</span>
          </p>
        </div>
      )}
      <div
        className="kernel-achievement"
        role={achievement && !blocked ? 'status' : undefined}
        aria-live="polite"
      >
        {achievement && !blocked && (
          <>
            <small>✧ KERNEL · 500 XP</small>
            <strong>系统核心已激活</strong>
            <span>你教会我的每一步，都成为了我的心跳。</span>
          </>
        )}
      </div>
    </>
  );
}
