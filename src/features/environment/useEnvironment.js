import { useEffect, useRef } from 'react';
import { useEnvironmentStore, environmentRegression } from './useEnvironmentStore';
import './environment.css';

export function useEnvironment(onTransition) {
  const environment = useEnvironmentStore();
  const previousNight = useRef(environment.night);
  useEffect(() => {
    if (previousNight.current !== environment.night && !document.hidden)
      onTransition(environment.night);
    previousNight.current = environment.night;
  }, [environment.night, onTransition]);
  useEffect(() => {
    const previous = document.documentElement.getAttribute('data-pet-night');
    document.documentElement.dataset.petNight = String(environment.night);
    return () => {
      if (previous === null) document.documentElement.removeAttribute('data-pet-night');
      else document.documentElement.setAttribute('data-pet-night', previous);
    };
  }, [environment.night]);
  useEffect(() => {
    if (environmentRegression) return;
    const store = useEnvironmentStore.getState;
    let idleTimer,
      clockTimer,
      lastActivity = Date.now();
    const checkIdle = () => {
      const remaining = 60000 - (Date.now() - lastActivity);
      if (remaining <= 0) {
        idleTimer = null;
        store().setIdleSleeping(true);
      } else idleTimer = setTimeout(checkIdle, remaining);
    };
    const active = () => {
      lastActivity = Date.now();
      store().setIdleSleeping(false);
      if (!document.hidden && !idleTimer) idleTimer = setTimeout(checkIdle, 60000);
    };
    const sync = () => {
      clearTimeout(idleTimer);
      idleTimer = null;
      clearInterval(clockTimer);
      if (!document.hidden) {
        store().syncClock();
        active();
        clockTimer = setInterval(() => store().syncClock(), 30000);
      }
    };
    const events = ['pointermove', 'pointerdown', 'touchstart', 'keydown', 'wheel'];
    for (const event of events) window.addEventListener(event, active, { passive: true });
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      clearTimeout(idleTimer);
      clearInterval(clockTimer);
      for (const event of events) window.removeEventListener(event, active);
      document.removeEventListener('visibilitychange', sync);
      store().setIdleSleeping(false);
    };
  }, []);
  return environment;
}
