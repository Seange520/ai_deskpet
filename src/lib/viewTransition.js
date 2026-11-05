import { flushSync } from 'react-dom';
import { DESKTOP_VISUAL_QUERY, isLowPowerDevice } from './visualCapabilities';
import './view-transition.css';
let running,
  ticket = 0,
  selected = [];
const clearNames = () => {
  selected.forEach((node) => node.removeAttribute('data-camera-selected'));
  selected = [];
};
export function cancelCamera() {
  ticket++;
  running?.skipTransition();
  running = null;
  clearNames();
  delete document.documentElement.dataset.vtDirection;
}
export function navigateWithCamera(update, { event, direction = 'forward' } = {}) {
  cancelCamera();
  const id = ticket,
    html = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const source =
    event?.currentTarget?.closest('.level-card')?.querySelector('.card-art') ||
    document.querySelector('.page-hero .hero-art');
  const point = event?.detail
    ? { x: event.clientX, y: event.clientY }
    : { x: innerWidth / 2, y: innerHeight / 2 };
  let applied = false;
  const apply = (native = false) => {
    if (id !== ticket || applied) return;
    applied = true;
    flushSync(update);
    window.scrollTo({ top: 0, behavior: 'instant' });
    const page = document.querySelector('.page-transition');
    if (native && page) page.dataset.cameraNative = 'true';
    const rect = page?.getBoundingClientRect();
    html.style.setProperty('--vt-x', Math.max(0, point.x - (rect?.left || 0)) + 'px');
    html.style.setProperty('--vt-y', Math.max(0, point.y - (rect?.top || 0)) + 'px');
    html.style.setProperty(
      '--vt-radius',
      Math.hypot(rect?.width || innerWidth, rect?.height || innerHeight) + 'px',
    );
    if (native && !reduced) {
      const target = document.querySelector('.page-hero .hero-art');
      if (target) {
        target.dataset.cameraSelected = 'true';
        selected.push(target);
      }
    }
  };
  if (
    // Reduced motion uses a CSS-only fade: no snapshot freeze or delayed hit testing.
    reduced ||
    typeof document.startViewTransition !== 'function' ||
    !matchMedia(DESKTOP_VISUAL_QUERY).matches ||
    isLowPowerDevice() ||
    document.hidden ||
    document.querySelector('.modal-backdrop')
  ) {
    apply();
    return;
  }
  html.dataset.vtDirection = direction;
  if (!reduced && source) {
    source.dataset.cameraSelected = 'true';
    selected.push(source);
  }
  const oldPage = document.querySelector('.page-transition');
  if (oldPage) oldPage.dataset.cameraNative = 'true';
  try {
    running = document.startViewTransition(() => apply(true));
    running.ready.catch(() => {});
    running.finished
      .catch(() => {})
      .then(() => {
        if (id === ticket) {
          clearNames();
          running = null;
          delete html.dataset.vtDirection;
        }
      });
  } catch {
    clearNames();
    delete html.dataset.vtDirection;
    apply();
  }
}
